import { DocType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
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
  numDoc: string;

  @IsEnum(DocType)
  docType: DocType;

  @Type(() => Number)
  @IsInt()
  rubroId: number;
}
