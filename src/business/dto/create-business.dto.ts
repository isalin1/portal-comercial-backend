import { DocType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @IsString()
  @IsNotEmpty()
  commercialName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  commercialDescription: string;

  @IsString()
  @IsNotEmpty()
  numDoc: string;

  @IsEnum(DocType)
  docType: DocType;

  @Type(() => Number)
  @IsInt()
  rubroId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marketId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zoneId?: number | null;
}
