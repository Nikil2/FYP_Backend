import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  workerId: string;

  @IsNumber()
  @Type(() => Number)
  serviceId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsString()
  @IsNotEmpty()
  jobAddress: string;

  @IsNumber()
  @Type(() => Number)
  jobLat: number;

  @IsNumber()
  @Type(() => Number)
  jobLng: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  initialPrice?: number;
}
