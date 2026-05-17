import {
  IsPhoneNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsPhoneNumber('PK')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  profilePicUrl?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.CUSTOMER;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}
