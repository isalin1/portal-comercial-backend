import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  chargesDelivery?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryFee?: number;
}
