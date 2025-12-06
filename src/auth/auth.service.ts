import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, ...data } = registerDto;

    const passwordHashed = await hash(password, 10);
    
    // Generar token de verificación
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Determinar si el usuario debe estar activo y verificado basado en su rol
    // SUPERADMIN: activo y verificado por defecto
    // ADMIN: inactivo pero verificado (será activado por superadmin)
    // COLABORADOR: será manejado por el módulo de pointsale
    // CLIENT: será manejado por el módulo de clientes
    const isActive = data.role === 'SUPERADMIN';
    const isEmailVerified = true; // Todos los usuarios verificados por defecto (no hay sistema de verificación de email implementado)

    const user = await this.userService.create({
      email,
      password: passwordHashed,
      isActive, // Solo SUPERADMIN activo por defecto
      isEmailVerified, // Todos verificados por defecto
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      ...data,
    });

    // Enviar email de verificación (temporalmente deshabilitado)
    // try {
    //   await this.emailService.sendVerificationEmail(email, verificationToken);
    // } catch (error) {
    //   console.error('Error enviando email de verificación:', error);
    //   // No lanzamos error para no bloquear el registro
    // }

    // Eliminar el campo password antes de devolver el usuario
    const { password: _password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message: 'Usuario registrado exitosamente. Ya puedes iniciar sesión.',
    };
  }

  async login({ email, password }: LoginDto) {
    console.log('🔐 Iniciando proceso de login para:', email);
    
    const user = await this.userService.findByEmailOrNull(email);

    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      throw new UnauthorizedException('email no esta registrado');
    }

    console.log('✅ Usuario encontrado:', { 
      id: user.id, 
      email: user.email, 
      firstname: user.firstname,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified
    });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔑 Validación de contraseña:', isPasswordValid ? '✅ Correcta' : '❌ Incorrecta');

    if (!isPasswordValid) {
      throw new UnauthorizedException('contraseña incorrecta');
    }

    // Verificar que el usuario esté activo y verificado
    if (!user.isActive) {
      console.log('❌ Usuario inactivo');
      throw new UnauthorizedException('Tu cuenta no está activa. Por favor verifica tu email.');
    }

    if (!user.isEmailVerified) {
      console.log('❌ Email no verificado');
      throw new UnauthorizedException('Tu email no ha sido verificado. Por favor verifica tu email.');
    }

    console.log('✅ Todas las validaciones pasadas, generando token...');
    const { accessToken } = await this.createToken(user);

    // Eliminar el campo password antes de devolver el usuario
    const { password: _password, ...userWithoutPassword } = user;

    console.log('✅ Login exitoso para:', email);
    return {
      accessToken,
      user: userWithoutPassword,
    };
  }

  async checkAuthStatus(user: User) {
    const { accessToken } = await this.createToken(user);

    return {
      ...user,
      accessToken,
    };
  }

  async createToken(user: User): Promise<any> {
    try {
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const token = await this.jwtService.signAsync(payload);

      return {
        accessToken: token,
      };
    } catch (error) {
      console.log({
        error,
      });

      throw new Error('No se pudo crear el token');
    }
  }

  async verifyEmail(token: string) {
    const user = await this.userService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Token de verificación inválido');
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Token de verificación expirado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email ya verificado');
    }

    // Activar usuario y marcar email como verificado
    await this.userService.update(user.id, {
      isActive: true,
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    return {
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email ya verificado');
    }

    // Generar nuevo token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Actualizar token en la base de datos
    await this.userService.update(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Enviar nuevo email
    await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      message: 'Email de verificación reenviado',
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    console.log('🔐 Cambiando contraseña para usuario ID:', userId);

    // Obtener el usuario completo con su contraseña
    const user = await this.userService.findOne(userId);

    if (!user) {
      console.log('❌ Usuario no encontrado');
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar que la contraseña actual sea correcta
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    console.log(
      '🔑 Validación de contraseña actual:',
      isPasswordValid ? '✅ Correcta' : '❌ Incorrecta',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Validar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    // Hashear la nueva contraseña
    const newPasswordHashed = await hash(newPassword, 10);

    // Actualizar la contraseña en la base de datos
    await this.userService.update(userId, {
      password: newPasswordHashed,
    });

    console.log(
      '✅ Contraseña actualizada exitosamente para usuario:',
      user.email,
    );

    return {
      message: 'Contraseña actualizada exitosamente',
    };
  }
}
