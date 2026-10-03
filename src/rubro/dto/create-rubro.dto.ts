import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRubroDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  allowsOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsAgenda?: boolean;
}
