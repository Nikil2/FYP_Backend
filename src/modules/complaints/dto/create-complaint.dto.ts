import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateComplaintDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];
}

export class ResolveComplaintDto {
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @IsString()
  @IsOptional()
  actionTaken?: string; // 'REFUND' | 'PENALTY' | 'WARNING' | 'NO_ACTION'
}
