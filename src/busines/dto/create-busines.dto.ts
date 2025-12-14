import { IsString, IsInt, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { DocType } from '@prisma/client';

export class CreateBusinesDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  comercialname: string;

  @IsEnum(DocType)
  doctype: DocType;

  @IsString()
  @IsNotEmpty()
  numdoc: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsInt()
  userId: number;
}
