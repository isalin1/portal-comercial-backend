import { IsEnum } from 'class-validator';
import { UserType } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(UserType)
  userType: UserType;
}
