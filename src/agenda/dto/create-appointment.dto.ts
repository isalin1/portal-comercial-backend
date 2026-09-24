import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  serviceId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true })
  times: string[];

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsString()
  @IsNotEmpty()
  clientPhone: string;

  @IsString()
  @IsNotEmpty()
  clientAddress: string;

  @Matches(/^\d{8}$/)
  clientDni: string;

  @IsOptional()
  @IsInt()
  pointSaleId?: number;
}
