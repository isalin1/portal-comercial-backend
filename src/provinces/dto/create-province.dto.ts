import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProvinceDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsNotEmpty()
    @IsNumber()
    departmentId: number
}
