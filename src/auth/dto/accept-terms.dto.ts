import { Equals, IsEmail, IsString, MinLength } from 'class-validator';

export class AcceptTermsDto {
  @Equals(true, { message: 'Debes autorizar el uso de tu información' })
  accepted: boolean;
}

export class AcceptTermsRegisterDto extends AcceptTermsDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
