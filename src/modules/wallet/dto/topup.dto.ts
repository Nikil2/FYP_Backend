import { IsNumber, IsPositive } from 'class-validator';

export class TopupDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
