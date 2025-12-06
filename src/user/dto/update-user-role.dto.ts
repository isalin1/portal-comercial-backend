import { IsString, IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['ADMIN', 'SUPERADMIN', 'COLABORADOR'])
  role: string;
} 