import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /messages
   * Send a new message (also emitted via Socket.IO in real-time)
   */
  @Post()
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.sendMessage(userId, dto);
  }

  /**
   * GET /messages/booking/:bookingId
   * Get all messages for a booking (REST fallback for initial load)
   */
  @Get('booking/:bookingId')
  async getBookingMessages(
    @CurrentUser('sub') userId: string,
    @Param('bookingId') bookingId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.messagesService.getBookingMessages(
      userId,
      bookingId,
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * GET /messages/:id
   * Get a specific message
   */
  @Get(':id')
  async getMessageById(@Param('id') messageId: string) {
    return this.messagesService.getMessageById(messageId);
  }
}
