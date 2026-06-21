import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
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
