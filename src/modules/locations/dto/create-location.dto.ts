import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsOptional()
  label?: string;
}

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  label?: string;
}
