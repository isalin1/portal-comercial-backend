import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { CombinedAuthGuard } from './guards/auth.guard';
import { EmailModule } from 'src/email/email.module';

const jwtSeed = process.env.JWT_SEED;
if (!jwtSeed) throw new Error('JWT_SEED is required');

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSeed,
      signOptions: { expiresIn: '1d' },
    }),
    UserModule,
    PrismaModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CombinedAuthGuard],
  exports: [CombinedAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}