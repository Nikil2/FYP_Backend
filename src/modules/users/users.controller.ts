import { Controller, Post, Get, Put, Delete, Param, Body, Query, HttpCode, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * POST /users/register
   * Register a new user (public — no auth required)
   */
  @Post('register')
  @HttpCode(201)
  async register(@Body() createUserDto: CreateUserDto): Promise<{ user: UserResponseDto; token: string }> {
    return this.usersService.register(createUserDto);
  }

  /**
   * POST /users/login
   * Login user with phone and password (public — no auth required)
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto): Promise<{ user: UserResponseDto; token: string }> {
    return this.usersService.login(loginDto);
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  /**
   * GET /users/me
   * Get current authenticated user's profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser('sub') userId: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(userId);
  }

  /**
   * PUT /users/me
   * Update current authenticated user's profile
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateData: Partial<CreateUserDto>,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(userId, updateData);
  }

  /**
   * GET /users/:id
   * Get user by ID (authenticated)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * GET /users
   * Get all users — admin only
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers(
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
  ): Promise<{ data: UserResponseDto[]; total: number }> {
    return this.usersService.getAllUsers(parseInt(limit), parseInt(offset));
  }

  /**
   * PUT /users/:id
   * Update user profile — admin only
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: Partial<CreateUserDto>,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(userId, updateData);
  }

  /**
   * POST /users/:id/verify
   * Verify user — admin only
   */
  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async verifyUser(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.verifyUser(userId);
  }

  /**
   * POST /users/:id/block
   * Block user — admin only
   */
  @Post(':id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async blockUser(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.toggleUserBlock(userId, true);
  }

  /**
   * POST /users/:id/unblock
   * Unblock user — admin only
   */
  @Post(':id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async unblockUser(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.toggleUserBlock(userId, false);
  }

  /**
   * DELETE /users/:id
   * Delete user — admin only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') userId: string): Promise<{ message: string }> {
    await this.usersService.deleteUser(userId);
    return { message: 'User deleted successfully' };
  }
}
