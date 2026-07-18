import {
  IsArray,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HistoryTurnDto } from './agent-request.dto';

/** A service the worker has chosen, with the price they set (PKR). */
export class OnboardingServiceDto {
  @IsNumber()
  serviceId: number;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

/**
 * The partial worker profile collected so far. The client sends back whatever
 * it has, the agent merges new details and returns the updated version. Only
 * the "soft" fields are gathered by chat — password/CNIC/photos stay in the
 * normal form afterwards.
 */
export class OnboardingProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingServiceDto)
  services?: OnboardingServiceDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  visitingCharges?: number;

  @IsOptional()
  @IsString()
  homeAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  // ── Captured via inline chat widgets (location + photos), not the LLM ──

  @IsOptional()
  @IsString()
  cnicNumber?: string;

  @IsOptional()
  @IsUrl()
  cnicFrontUrl?: string;

  @IsOptional()
  @IsUrl()
  cnicBackUrl?: string;

  @IsOptional()
  @IsUrl()
  selfieUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  workPhotosUrls?: string[];

  @IsOptional()
  @IsLatitude()
  homeLat?: number;

  @IsOptional()
  @IsLongitude()
  homeLng?: number;
}

export class OnboardRequestDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryTurnDto)
  history?: HistoryTurnDto[];

  /** The profile gathered in previous turns; omit on the first message. */
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingProfileDto)
  profile?: OnboardingProfileDto;
}
