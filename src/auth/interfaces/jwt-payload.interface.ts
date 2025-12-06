import { Roles } from '@prisma/client';

export interface JwtPayload {
  id: number;
  email: string;
  role: Roles;
}