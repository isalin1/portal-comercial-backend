import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🔐 JwtAuthGuard.canActivate called');
    const request = context.switchToHttp().getRequest();
    console.log('🔐 Request headers:', request.headers.authorization ? 'Authorization header present' : 'No authorization header');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('🔐 JwtAuthGuard.handleRequest called with:', { 
      err: err ? err.message : null, 
      user: user ? { id: user.id, email: user.email, role: user.role } : 'no user', 
      info: info ? info.message : null 
    });
    
    if (err || !user) {
      console.log('❌ JwtAuthGuard: Authentication failed');
      throw err || new UnauthorizedException('User not found');
    }
    
    console.log('✅ JwtAuthGuard: Authentication successful');
    return user;
  }
} 