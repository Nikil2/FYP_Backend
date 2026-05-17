import { Global, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * RealtimeModule
 *
 * Global module providing the WebSocket gateway for real-time communication.
 * Marked as @Global() so MessagesModule, NotificationsModule, BookingsModule
 * etc. can inject RealtimeGateway without importing this module each time.
 */
@Global()
@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
