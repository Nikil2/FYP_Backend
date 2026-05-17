import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() parameter decorator
 * Extracts the authenticated user from the request object (set by JwtAuthGuard).
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: JwtPayload) { ... }
 *
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested (e.g. @CurrentUser('sub')), return it
    return data ? user?.[data] : user;
  },
);
