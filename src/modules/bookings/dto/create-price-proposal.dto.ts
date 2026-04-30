import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceProposalDto {
  @IsUUID()
  @IsNotEmpty()
  proposedBy: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
