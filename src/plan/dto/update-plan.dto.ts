import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  days?: number;

  @IsOptional()
  @IsString()
  commercialName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  showProducts?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappButton?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  operatorOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  clientOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  daySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  agenda?: boolean;
}
