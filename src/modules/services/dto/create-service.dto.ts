import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  iconUrl?: string;
}
