import { IsNumber, IsEnum, IsDateString } from 'class-validator';
import { StatusPay } from '@prisma/client';

export class CreateSalesOrderDto {
  @IsNumber()
  serviceorderId: number;

  @IsNumber()
  total: number;

  @IsDateString()
  servicedeadline: Date;

  @IsEnum(StatusPay)
  statusPay: StatusPay;
}
