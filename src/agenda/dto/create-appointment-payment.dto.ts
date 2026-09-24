import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAppointmentPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
