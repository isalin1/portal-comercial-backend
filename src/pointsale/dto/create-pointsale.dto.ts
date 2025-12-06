import { IsString, IsInt, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePointSaleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  phonenumber: string;

  @IsInt()
  businesId: number;

  @IsInt()
  @IsOptional()
  userId?: number; // Opcional, ya que en el modelo es Int?
}
