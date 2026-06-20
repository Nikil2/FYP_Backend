import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiPersistenceService } from './ai-persistence.service';
import { AgentRequestDto } from './dto/agent-request.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly persistence: AiPersistenceService,
  ) {}

  /**
   * Main agentic endpoint: chat + worker search + recommendation.
   * POST /ai/agent
   * Public — customers can use the assistant before logging in.
   */
  @Post('agent')
  @HttpCode(HttpStatus.OK)
  async agent(@Body() dto: AgentRequestDto): Promise<AgentResponseDto> {
    return this.aiService.runAgent(dto);
  }

  /**
   * List a user's past conversations (newest first) for the history panel.
   * GET /ai/conversations?userId=...
   */
  @Get('conversations')
  async listConversations(@Query('userId') userId: string) {
    return this.persistence.listConversations(userId);
  }

  /**
   * Full transcript of one conversation.
   * GET /ai/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.persistence.getMessages(id);
  }
}
