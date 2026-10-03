import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateVigenciaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId: number;
}
