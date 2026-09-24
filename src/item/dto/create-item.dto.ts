import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateItemDescriptionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  price: number;
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsInt()
  pointSaleId: number;

  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = obj?.isActive ?? value;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return raw === 'true' || raw === '1';
    return raw;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = obj?.removeImage ?? value;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return raw === 'true' || raw === '1';
    return raw;
  })
  @IsBoolean()
  removeImage?: boolean;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = obj?.descriptions ?? value;
    const parsed = typeof raw === 'string' ? (raw.trim() ? JSON.parse(raw) : undefined) : raw;
    if (!Array.isArray(parsed)) return parsed;
    return parsed.map((item) => {
      const line = new CreateItemDescriptionDto();
      line.description = item?.description;
      line.price =
        item?.price === '' || item?.price === undefined || item?.price === null
          ? item?.price
          : Number(item.price);
      return line;
    });
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemDescriptionDto)
  descriptions?: CreateItemDescriptionDto[];
}
