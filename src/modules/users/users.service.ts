import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new user
   */
  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { phoneNumber, password, fullName, profilePicUrl, fcmToken, role } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException(`User with phone number ${phoneNumber} already exists`);
    }

    // Hash password (Salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        password: hashedPassword,
        fullName,
        profilePicUrl,
        fcmToken,
        role: role || UserRole.CUSTOMER,
      },
    });

    return this.mapToResponseDto(user);
  }

  /**
   * Login user with phone and password
   */
  async login(loginDto: LoginDto): Promise<UserResponseDto> {
    const { phoneNumber, password } = loginDto;

    // Find user by phone (include password for verification)
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        password: true,
        fullName: true,
        profilePicUrl: true,
        role: true,
        isVerified: true,
        isBlocked: true,
        fcmToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Check if user is blocked
    if (user.isBlocked) {
      throw new UnauthorizedException('User account is blocked');
    }

    return this.mapToResponseDto(user);
  }
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phoneNumber: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new NotFoundException(`User with phone number ${phoneNumber} not found`);
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Get all users (paginated)
   */
  async getAllUsers(limit: number = 10, offset: number = 0): Promise<{ data: UserResponseDto[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map((user) => this.mapToResponseDto(user)),
      total,
    };
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: Partial<CreateUserDto>): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapToResponseDto(user);
  }

  /**
   * Verify user (set isVerified to true)
   */
  async verifyUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    return this.mapToResponseDto(user);
  }

  /**
   * Block/Unblock user
   */
  async toggleUserBlock(userId: string, isBlocked: boolean): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked },
    });

    return this.mapToResponseDto(user);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Map Prisma user to response DTO
   */
  private mapToResponseDto(user: any): UserResponseDto {
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      profilePicUrl: user.profilePicUrl,
      role: user.role,
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Verify password (for login)
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
