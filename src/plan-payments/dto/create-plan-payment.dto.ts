import { IsInt, IsNumber, IsString, IsOptional, IsDateString, Min } from 'class-validator';

export class CreatePlanPaymentDto {
  @IsInt()
  businesId: number;

  @IsInt()
  planId: number;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsDateString()
  fechaPago: string;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  comprobante?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}


