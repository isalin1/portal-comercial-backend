import { IsString, IsInt, IsEnum, IsNotEmpty } from 'class-validator';
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

  @IsInt()
  userId: number;
}
