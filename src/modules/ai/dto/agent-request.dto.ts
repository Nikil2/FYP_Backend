import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

  /**
   * Customer's current coordinates from the browser, when they've allowed
   * location. Supplied by the client rather than the model, so worker searches
   * can be filtered by real distance instead of a free-text city guess.
   */
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
