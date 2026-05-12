import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsString()
  @IsOptional()
  categoryIcon?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
