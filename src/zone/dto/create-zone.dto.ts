import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsInt()
  districtId: number;
}
