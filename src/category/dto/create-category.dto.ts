import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsInt()
  rubroId: number;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = obj?.removeImage ?? value;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return raw === 'true' || raw === '1';
    return raw;
  })
  @IsBoolean()
  removeImage?: boolean;
}
