import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateMarketDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId: number;
}
