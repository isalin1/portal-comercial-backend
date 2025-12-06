import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  tipo: string; // 'premium', 'pro', 'emprendedor'

  @IsString()
  nombrePeriodo: string; // 'mensual', 'semestral', 'anual'

  @IsInt()
  @Min(1)
  diasPeriodo: number; // Días de duración

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number | null; // Precio del plan
}


