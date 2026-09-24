import { IsIn, IsInt } from 'class-validator';

export const VIGENCIA_DAYS = [30, 90, 180, 360] as const;

export class UpdateVigenciaDto {
  @IsInt()
  @IsIn(VIGENCIA_DAYS)
  days: number;
}
