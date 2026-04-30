import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}
