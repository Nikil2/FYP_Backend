import {
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Phone + password + OTP collected on the single manual step of the AI-first
 * worker signup. A successful call creates the "soft" worker account (a User
 * row, role WORKER, unverified) that Nova then completes via chat.
 */
export class StartWorkerSignupDto {
  @IsPhoneNumber('PK')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
