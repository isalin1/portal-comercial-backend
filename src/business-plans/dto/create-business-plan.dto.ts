import { IsInt, IsDateString, IsString, IsOptional } from 'class-validator';

export class CreateBusinessPlanDto {
  @IsInt()
  businesId: number;

  @IsInt()
  planId: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;
}



