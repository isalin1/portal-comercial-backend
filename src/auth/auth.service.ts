import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AuthUser, JwtPayload } from './interfaces/jwt-payload.interface';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private toAuthUser(user: {
    id: number;
    datUserId: number;
    password?: string;
    isActive: boolean;
    termsAcceptedAt?: Date | null;
    datUser: {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      userType: UserType;
    };
  }): AuthUser {
    const userType = user.datUser.userType;
    return {
      id: user.id,
      datUserId: user.datUserId,
      email: user.datUser.email,
      firstName: user.datUser.firstName,
      lastName: user.datUser.lastName,
      phone: user.datUser.phone,
      userType,
      role: userType,
      isActive: user.isActive,
      termsAccepted: userType === UserType.ADMIN || Boolean(user.termsAcceptedAt),
    };
  }

  async acceptTerms(userId: number) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { datUser: true },
    });
    if (!current?.datUser) {
      throw new UnauthorizedException('No se encontró la cuenta');
    }
    if (current.datUser.userType !== UserType.ADMIN && !current.termsAcceptedAt) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { termsAcceptedAt: new Date() },
      });
    }
    return { termsAccepted: true };
  }

  async acceptTermsWithPassword(email: string, password: string) {
    const user = await this.userService.findByEmailOrNull(email);
    if (!user) {
      throw new UnauthorizedException('email no esta registrado');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('contraseña incorrecta');
    }
    return this.acceptTerms(user.id);
  }

  async register(registerDto: RegisterDto) {
    const userType = registerDto.userType ?? UserType.CLIENTE;
    const freePlan = userType === UserType.EMPRESARIO && registerDto.plan === 'free';
    const passwordHashed = await hash(registerDto.password, 10);

    const user = await this.userService.create({
      ...registerDto,
      password: passwordHashed,
      userType,
      isActive: userType !== UserType.EMPRESARIO || freePlan,
    });

    return {
      user,
      message: freePlan
        ? 'Registro exitoso. Tu cuenta está activa. Ya puedes iniciar sesión.'
        : userType === UserType.EMPRESARIO
          ? 'Registro exitoso. Un administrador activará tu cuenta según la vigencia.'
          : 'Usuario registrado exitosamente. Ya puedes iniciar sesión.',
    };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.userService.findByEmailOrNull(email);

    if (!user) {
      throw new UnauthorizedException('email no esta registrado');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('contraseña incorrecta');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta no está activa.');
    }

    const authUser = this.toAuthUser(user);
    const { accessToken } = await this.createToken(authUser);

    return {
      accessToken,
      user: authUser,
    };
  }

  async checkAuthStatus(user: AuthUser) {
    const { accessToken } = await this.createToken(user);
    return {
      ...user,
      accessToken,
    };
  }

  async createToken(user: AuthUser) {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.userType,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userService.findWithPassword(userId);

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const newPasswordHashed = await hash(newPassword, 10);
    await this.userService.update(userId, {
      password: newPasswordHashed,
    });

    return {
      message: 'Contraseña actualizada exitosamente',
    };
  }
}
