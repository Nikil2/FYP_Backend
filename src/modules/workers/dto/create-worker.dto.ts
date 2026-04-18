import {
  IsPhoneNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUrl,
  IsLatitude,
  IsLongitude,
  IsArray,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkerDto {
  // ============================================
  // User Base Fields
  // ============================================
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

  @IsOptional()
  @IsString()
  fcmToken?: string;

  // ============================================
  // Worker-Specific Fields
  // ============================================

  @IsString()
  @IsNotEmpty()
  cnicNumber: string;

  @IsUrl()
  @IsNotEmpty()
  cnicFrontUrl: string;

  @IsUrl()
  @IsNotEmpty()
  cnicBackUrl: string;

  @IsOptional()
  @IsUrl()
  selfieUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  workPhotosUrls?: string[];

  @IsString()
  @IsNotEmpty()
  homeAddress: string;

  @IsLatitude()
  @IsNotEmpty()
  @Type(() => Number)
  homeLat: number;

  @IsLongitude()
  @IsNotEmpty()
  @Type(() => Number)
  homeLng: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  experienceYears: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  visitingCharges: number;

  @IsOptional()
  @IsString()
  bio?: string;

  // ============================================
  // Services Selection
  // ============================================
  @IsArray()
  @IsNotEmpty()
  @Type(() => Number)
  serviceIds: number[]; // IDs of services worker offers

  // ============================================
  // Portfolio Images (Optional)
  // ============================================
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  portfolioImages?: Array<{
    imageUrl: string;
    description?: string;
  }>;
}
