import { IsNotEmpty, IsNumber, IsPositive, IsString, IsDateString } from 'class-validator';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  pointsaleId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  recipient: string;

  @IsNotEmpty()
  @IsString()
  concept: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}



