import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * JwtAuthGuard
 *
 * Validates the JWT token from the Authorization header and attaches
 * the decoded user payload to `request.user`.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user) { ... }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });

      // Verify user still exists and is not blocked
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isBlocked: true, role: true, phoneNumber: true },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      if (user.isBlocked) {
        throw new UnauthorizedException('User account is blocked');
      }

      // Attach user payload to request — available via @CurrentUser()
      request['user'] = {
        sub: payload.sub,
        phoneNumber: payload.phoneNumber,
        role: payload.role,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
