import { IsNotEmpty, IsNumber, IsPositive, IsEnum, IsDateString } from 'class-validator';
import { MethodPay } from '@prisma/client';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  salesorderId: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsEnum(MethodPay)
  paymenttype: MethodPay;

  @IsNotEmpty()
  @IsDateString()
  datepaid: string;
}












