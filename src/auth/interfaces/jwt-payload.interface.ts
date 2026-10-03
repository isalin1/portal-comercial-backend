import { UserType } from '@prisma/client';

export interface JwtPayload {
  id: number;
  email: string;
  role: UserType;
}

export type AuthUser = {
  id: number;
  datUserId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: UserType;
  role: UserType;
  isActive: boolean;
  termsAccepted: boolean;
};
