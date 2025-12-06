import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    console.log('✅ RolesGuard constructed');
  }

  canActivate(context: ExecutionContext): boolean {
    console.log('🛡️ RolesGuard.canActivate called');
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('🛡️ Required roles:', requiredRoles);
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('🛡️ No role restrictions, allowing access');
      return true; // No hay restricción de roles
    }
    const user = context.switchToHttp().getRequest().user;
    console.log('🛡️ User from request:', user ? { id: user.id, email: user.email, role: user.role } : 'no user');
    if (!user || !requiredRoles.includes(user.role?.toUpperCase())) {
      console.log('❌ RolesGuard: Access denied. User role:', user?.role, 'Required roles:', requiredRoles);
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    console.log('✅ RolesGuard: Access granted');
    return true;
  }
}