import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * AuthModule
 *
 * Provides authentication guards and decorators for the application.
 * JWT configuration is handled in UsersModule (JwtModule.register).
 * This module exports the guards so other modules can use them.
 */
@Module({
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
