import {
  IsArray,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkerServiceInputDto } from './create-worker.dto';

/**
 * Completes an already-created "soft" worker account (from POST /users/worker/start)
 * into a full WorkerProfile. Unlike CreateWorkerDto there is no phone/password —
 * the user already exists and is authenticated; the userId comes from the JWT.
 * Nova gathers these fields over chat + inline widgets.
 */
export class CompleteWorkerProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

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

  @IsOptional()
  @IsString()
  city?: string;

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

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WorkerServiceInputDto)
  services: WorkerServiceInputDto[];
}
