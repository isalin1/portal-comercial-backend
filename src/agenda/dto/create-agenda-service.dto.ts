import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateAgendaServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(5)
  durationMinutes: number;

  @IsNumber()
  @Min(0)
  price: number;
}
