import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { OnboardingService } from './onboarding.service';
import { TranscriptionService } from './transcription.service';
import { AiPersistenceService } from './ai-persistence.service';
import { AgentRequestDto } from './dto/agent-request.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { OnboardRequestDto } from './dto/onboard-request.dto';
import { OnboardResponseDto } from './dto/onboard-response.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly onboardingService: OnboardingService,
    private readonly transcription: TranscriptionService,
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
   * Conversational worker onboarding. The worker chats (often Roman-Urdu); Nova
   * asks one thing at a time and returns the profile gathered so far.
   * POST /ai/onboard
   */
  @Post('onboard')
  @HttpCode(HttpStatus.OK)
  async onboard(@Body() dto: OnboardRequestDto): Promise<OnboardResponseDto> {
    return this.onboardingService.runOnboarding(dto);
  }

  /**
   * Speech-to-text for the onboarding chat — lets workers speak their answers.
   * POST /ai/transcribe  (multipart/form-data, field "audio")
   */
  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @UploadedFile() audio: Express.Multer.File,
  ): Promise<{ text: string }> {
    const text = await this.transcription.transcribe(audio);
    return { text };
  }

  /**
   * Upload one inline onboarding image (CNIC front/back, selfie, work photo).
   * Authenticated with the soft-account token created at signup start.
   * POST /ai/onboard/upload-image  (multipart/form-data, field "image")
   */
  @Post('onboard/upload-image')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async uploadOnboardingImage(
    @CurrentUser('sub') userId: string,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<{ url: string }> {
    return this.onboardingService.uploadImage(image, userId);
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
