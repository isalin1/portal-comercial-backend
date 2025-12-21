import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, IsEnum } from 'class-validator';
import { Roles } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @IsString()
  @IsOptional()
  emailVerificationToken?: string;

  @IsOptional()
  emailVerificationExpires?: Date;

  @IsString()
  @IsOptional()
  passwordResetToken?: string;

  @IsOptional()
  passwordResetExpires?: Date;

  @IsEnum(Roles)
  @IsOptional()
  role?: Roles;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
