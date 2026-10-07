import { Controller, Get, Post, Body, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AcceptTermsDto, AcceptTermsRegisterDto } from './dto/accept-terms.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { Auth } from './decorators/auth.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { AuthUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('recuperar-contrasena')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('restablecer-contrasena')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('terminos')
  @Auth()
  acceptTerms(@GetUser() user: AuthUser, @Body() body: AcceptTermsDto) {
    return this.authService.acceptTerms(user.id);
  }

  @Post('terminos-registro')
  acceptTermsAfterRegister(@Body() body: AcceptTermsRegisterDto) {
    return this.authService.acceptTermsWithPassword(body.email, body.password);
  }

  @Get('check-auth-status')
  @Auth()
  checkAuthStatus(@GetUser() user: AuthUser) {
    return this.authService.checkAuthStatus(user);
  }

  @Patch('change-password')
  @Auth()
  changePassword(
    @GetUser() user: AuthUser,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
  }
}
