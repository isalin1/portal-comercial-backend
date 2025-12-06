import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateCashContributionDto {
  @IsNotEmpty()
  @IsNumber()
  pointsaleId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  concept?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}


