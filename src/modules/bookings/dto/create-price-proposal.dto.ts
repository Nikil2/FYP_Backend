import { IsUUID, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceProposalDto {
  @IsOptional()
  @IsUUID()
  proposedBy: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
