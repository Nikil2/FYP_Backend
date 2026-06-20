import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { AgentRequestDto } from './dto/agent-request.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
