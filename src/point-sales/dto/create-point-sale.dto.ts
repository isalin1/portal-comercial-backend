import { IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePointSaleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @Type(() => Number)
  @IsInt()
  businessId: number;

  @Type(() => Number)
  @IsInt()
  districtId: number;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsOptional()
  @IsString()
  urbanZone?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  opensAt?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  closesAt?: string;

  @IsOptional()
  @Matches(/^[0-6](,[0-6])*$/)
  openDays?: string;
}
