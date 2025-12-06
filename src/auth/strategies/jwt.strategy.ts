import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
) {
    super({
      secretOrKey: process.env.JWT_SEED || 'fallback-secret',
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
    console.log('JWT Strategy initialized with secret:', process.env.JWT_SEED ? 'JWT_SEED is set' : 'Using fallback secret');
  }

  async validate(payload: JwtPayload): Promise<User> {
    console.log('JWT validate method called with payload:', payload);
    const { id } = payload;
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: {
        business: true,
      },
    });
    console.log('User found in DB:', user ? { id: user.id, email: user.email, role: user.role } : 'User not found');
    if (!user) throw new UnauthorizedException('Token not valid');
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive, talk with an admin');
    }
    return user;
  }
}


