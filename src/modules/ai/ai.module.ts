import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WorkersModule } from '../workers/workers.module';
import { ServicesModule } from '../services/services.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiPersistenceService } from './ai-persistence.service';
import { ToolExecutor } from './tools/tool-executor';
import { LLM_PROVIDER } from './providers/llm-provider.interface';
import { GroqProvider } from './providers/groq.provider';
import { OllamaProvider } from './providers/ollama.provider';

/**
 * AI module — agentic chatbot + worker search/recommendation.
 *
 * The active LLM provider is chosen at runtime from AI_PROVIDER (groq | ollama)
 * and bound to the LLM_PROVIDER token, so AiService and ToolExecutor depend on
 * the interface, never a concrete provider.
 */
@Module({
  imports: [PrismaModule, WorkersModule, ServicesModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiPersistenceService,
    ToolExecutor,
    GroqProvider,
    OllamaProvider,
    {
      provide: LLM_PROVIDER,
      inject: [GroqProvider, OllamaProvider],
      useFactory: (groq: GroqProvider, ollama: OllamaProvider) =>
        (process.env.AI_PROVIDER ?? 'groq').toLowerCase() === 'ollama'
          ? ollama
          : groq,
    },
  ],
})
export class AiModule {}
