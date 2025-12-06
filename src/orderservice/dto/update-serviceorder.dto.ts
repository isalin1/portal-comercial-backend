import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceOrderDto } from './create-serviceorder.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusOrder } from '@prisma/client';

export class UpdateServiceOrderDto extends PartialType(CreateServiceOrderDto) {
  @IsOptional()
  @IsEnum(StatusOrder)
  statusOrder?: StatusOrder;
}













