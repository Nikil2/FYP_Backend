import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** One prior turn of the conversation sent by the frontend. */
export class HistoryTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;
}

export class AgentRequestDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryTurnDto)
  history?: HistoryTurnDto[];

  /** Optional authenticated customer id (for logging / personalisation). */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Existing conversation to continue; omit to start a new one. */
  @IsOptional()
  @IsString()
  conversationId?: string;
}
