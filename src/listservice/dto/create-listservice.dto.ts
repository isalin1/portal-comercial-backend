import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ServiceType } from '@prisma/client';

export class CreateListServiceDto {
  @IsEnum(ServiceType)
  type: ServiceType;

  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNumber()
  servicecategoryId: number;
}
