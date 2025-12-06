import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class CombinedAuthGuard extends PassportAuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
    console.log('🔐 CombinedAuthGuard constructed');
  }

  canActivate(context: ExecutionContext) {
    console.log('🔐 CombinedAuthGuard.canActivate called');
    const request = context.switchToHttp().getRequest();
    console.log('🔐 Request headers:', request.headers.authorization ? 'Authorization header present' : 'No authorization header');
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('🔐 CombinedAuthGuard.handleRequest called with:', { 
      err: err ? err.message : null, 
      user: user ? { id: user.id, email: user.email, role: user.role } : 'no user', 
      info: info ? info.message : null 
    });
    
    if (err || !user) {
      console.log('❌ CombinedAuthGuard: Authentication failed');
      throw err || new UnauthorizedException('User not found');
    }
    
    console.log('✅ CombinedAuthGuard: Authentication successful');
    
    // Verificar roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    console.log('🛡️ Required roles:', requiredRoles);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('🛡️ No role restrictions, allowing access');
      return user;
    }
    
    console.log('🛡️ User role:', user.role, 'Required roles:', requiredRoles);
    
    if (!requiredRoles.includes(user.role?.toUpperCase())) {
      console.log('❌ CombinedAuthGuard: Access denied. User role:', user.role, 'Required roles:', requiredRoles);
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    
    console.log('✅ CombinedAuthGuard: Access granted');
    return user;
  }
} 