import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    const jwtSeed = process.env.JWT_SEED;
    if (!jwtSeed) throw new Error('JWT_SEED is required');
    super({
      secretOrKey: jwtSeed,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const { id } = payload;
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { datUser: true },
    });

    if (!user || !user.datUser) {
      throw new UnauthorizedException('Token not valid');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive, talk with an admin');
    }

    return {
      id: user.id,
      datUserId: user.datUserId,
      email: user.datUser.email,
      firstName: user.datUser.firstName,
      lastName: user.datUser.lastName,
      phone: user.datUser.phone,
      userType: user.datUser.userType,
      role: user.datUser.userType,
      isActive: user.isActive,
      termsAccepted: user.datUser.userType === 'ADMIN' || Boolean(user.termsAcceptedAt),
    };
  }
}
