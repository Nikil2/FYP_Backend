import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsOptional()
  @IsString()
  categoryIcon?: string;
}
