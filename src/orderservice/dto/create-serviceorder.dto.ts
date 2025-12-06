import { IsNumber, IsArray, ValidateNested, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ItemServiceOrderDto {
  @IsNumber()
  listserviceId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  totalPrice: number;

  @IsNumber()
  numberpieces: number;

  @IsNumber()
  subtotal: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateServiceOrderDto {
  @IsNumber()
  userId: number; // ID del cliente

  @IsNumber()
  pointsaleId: number; // ID del punto de venta

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemServiceOrderDto)
  items: ItemServiceOrderDto[];

  @IsNumber()
  total: number; // Total de la orden

  @IsDateString()
  servicedeadline: string; // Fecha límite de entrega
}









