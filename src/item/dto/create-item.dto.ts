import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateItemDescriptionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitId?: number | null;
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
  @IsIn(['CARTA', 'MENU', 'OFERTA_DIA'])
  kind?: 'CARTA' | 'MENU' | 'OFERTA_DIA';

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsNumber()
  compareAtPrice?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsIn(['ENTRADA', 'SEGUNDO', 'REFRESCO'])
  menuPart?: 'ENTRADA' | 'SEGUNDO' | 'REFRESCO' | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsInt()
  menuOfferId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const list = Array.isArray(value) ? value : String(value).split(',');
    return list.map((item) => Number(item)).filter((item) => item);
  })
  @IsArray()
  @IsInt({ each: true })
  menuOfferIds?: number[];

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
      line.id = item?.id ? Number(item.id) : undefined;
      line.description = item?.description;
      line.price =
        item?.price === '' || item?.price === undefined || item?.price === null
          ? item?.price
          : Number(item.price);
      line.unitId =
        item?.unitId === '' || item?.unitId === undefined || item?.unitId === null
          ? item?.unitId
          : Number(item.unitId);
      return line;
    });
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemDescriptionDto)
  descriptions?: CreateItemDescriptionDto[];
}
