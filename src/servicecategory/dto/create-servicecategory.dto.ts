import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { ServiceCategoryType, ServiceUnit } from '@prisma/client';

export class CreateServiceCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ServiceCategoryType)
  categoryType: ServiceCategoryType;

  @IsEnum(ServiceUnit)
  unit: ServiceUnit;

  @IsNumber()
  businesId: number;
}
