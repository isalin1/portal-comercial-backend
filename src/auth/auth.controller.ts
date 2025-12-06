import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Auth } from './decorators/auth.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body()
    registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(
    @Body()
    loginDto: LoginDto,
  ) {
    console.log('🔥🔥🔥 POST /auth/login LLAMADO 🔥🔥🔥');
    console.log('📋 Datos recibidos:', { email: loginDto.email, password: '***' });
    return this.authService.login(loginDto);
  }

  @Get('check-auth-status')
  @Auth()
  checkAuthStatus(
    @GetUser () user:User
  ) {
    return this.authService.checkAuthStatus (user)
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  resendVerificationEmail(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Patch('change-password')
  @Auth()
  changePassword(
    @GetUser() user: User,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    console.log('🔐 PATCH /auth/change-password - Usuario:', user.email);
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}