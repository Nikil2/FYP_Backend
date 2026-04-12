import { IsPhoneNumber, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('PK')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
