import { Controller, Post, Get, Put, Delete, Param, Body, Query, HttpCode, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * POST /users/register
   * Register a new user
   */
  @Post('register')
  @HttpCode(201)
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.register(createUserDto);
  }

  /**
   * POST /users/login
   * Login user with phone and password
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto): Promise<UserResponseDto> {
    return this.usersService.login(loginDto);
  }

  /**
   * GET /users/:id
   * Get user by ID
   */
  @Get(':id')
  async getUserById(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(userId);
  }

  /**
   * GET /users
   * Get all users (paginated)
   */
  @Get()
  async getAllUsers(
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
  ): Promise<{ data: UserResponseDto[]; total: number }> {
    return this.usersService.getAllUsers(parseInt(limit), parseInt(offset));
  }

  /**
   * PUT /users/:id
   * Update user profile
   */
  @Put(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: Partial<CreateUserDto>,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(userId, updateData);
  }

  /**
   * POST /users/:id/verify
   * Verify user
   */
  @Post(':id/verify')
  async verifyUser(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.verifyUser(userId);
  }

  /**
   * POST /users/:id/block
   * Block user
   */
  @Post(':id/block')
  async blockUser(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.toggleUserBlock(userId, true);
  }

  /**
   * POST /users/:id/unblock
   * Unblock user
   */
  @Post(':id/unblock')
  async unblockUser(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.toggleUserBlock(userId, false);
  }

  /**
   * DELETE /users/:id
   * Delete user
   */
  @Delete(':id')
  async deleteUser(@Param('id') userId: string): Promise<{ message: string }> {
    await this.usersService.deleteUser(userId);
    return { message: 'User deleted successfully' };
  }
}
