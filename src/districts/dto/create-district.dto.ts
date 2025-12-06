import { IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreateDistrictDto {
    @IsString()
    @IsNotEmpty()
    name: string
   
    @IsNotEmpty()
    @IsNumber()
    provinceId: number 
}
