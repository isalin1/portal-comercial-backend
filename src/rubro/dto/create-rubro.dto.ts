import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRubroDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
