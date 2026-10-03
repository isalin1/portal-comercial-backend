import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  professionalId: number;

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

  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  clientDni: string;

  @IsOptional()
  @IsInt()
  pointSaleId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;
}
