import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AuthUser, JwtPayload } from './interfaces/jwt-payload.interface';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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
    const existing = await this.userService.findByEmailOrNull(registerDto.email);

    if (existing?.datUser) {
      const currentType = existing.datUser.userType;

      if (userType === UserType.CLIENTE && currentType === UserType.EMPRESARIO) {
        throw new BadRequestException({
          code: 'ALREADY_EMPRESARIO',
          message: 'No se requiere registrar como cliente para hacer pedido',
        });
      }

      if (userType === UserType.EMPRESARIO && currentType === UserType.CLIENTE) {
        if (!registerDto.confirmUpgrade) {
          throw new BadRequestException({
            code: 'CLIENT_UPGRADE_REQUIRED',
            message:
              'Ya estás registrado como cliente. ¿Estás seguro de cambiar tu registro a empresario?',
          });
        }

        const passwordOk = await bcrypt.compare(registerDto.password, existing.password);
        if (!passwordOk) {
          throw new UnauthorizedException('contraseña incorrecta');
        }

        const upgraded = await this.userService.requestEmpresarioUpgrade(existing.id, {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          freePlan,
        });

        return {
          user: upgraded,
          message: freePlan
            ? 'Tu cuenta ahora es de empresario con plan Free. Ya puedes iniciar sesión.'
            : 'Solicitud registrada. Seguirás como cliente hasta que un administrador active tu plan de empresario.',
          upgradedFromClient: true,
          becameEmpresario: freePlan,
        };
      }

      throw new BadRequestException({
        code: 'EMAIL_IN_USE',
        message: 'el email esta en uso',
      });
    }

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

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const generic = {
      message:
        'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.',
    };

    const user = await this.userService.findByEmailOrNull(normalized);
    if (!user) return generic;

    const recent = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60_000) },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return generic;

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    try {
      await this.emailService.sendPasswordResetEmail(user.datUser.email, rawToken);
    } catch {
      await this.prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      throw new BadRequestException(
        'No se pudo enviar el correo. Intenta de nuevo en unos minutos.',
      );
    }

    return generic;
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashResetToken(String(token || '').trim());
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      );
    }

    const newPasswordHashed = await hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { password: newPasswordHashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      }),
    ]);

    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }
}
