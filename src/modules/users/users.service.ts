import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  phoneNumber: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   * Returns user data with JWT token
   */
  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ user: UserResponseDto; token: string }> {
    const { phoneNumber, password, fullName, profilePicUrl, fcmToken, role } =
      createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with phone number ${phoneNumber} already exists`,
      );
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

    // Generate JWT token
    const token = await this.generateToken(user);

    return {
      user: this.mapToResponseDto(user),
      token,
    };
  }

  /**
   * Login user with phone and password
   * Returns user data with JWT token
   */
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: UserResponseDto; token: string }> {
    const { phoneNumber, password } = loginDto;

    // Find user by phone — try all format variants to handle DB inconsistency
    const variants = this.phoneVariants(phoneNumber);
    const user = await this.prisma.user.findFirst({
      where: { phoneNumber: { in: variants } },
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

    // Generate JWT token
    const token = await this.generateToken(user);

    return {
      user: this.mapToResponseDto(user),
      token,
    };
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
      throw new NotFoundException(
        `User with phone number ${phoneNumber} not found`,
      );
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Get all users (paginated)
   */
  async getAllUsers(
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ data: UserResponseDto[]; total: number }> {
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
  async updateUser(
    userId: string,
    updateData: Partial<CreateUserDto>,
  ): Promise<UserResponseDto> {
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
  async toggleUserBlock(
    userId: string,
    isBlocked: boolean,
  ): Promise<UserResponseDto> {
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
   * Normalize Pakistani phone number to a canonical form for DB lookup.
   * Tries +92XXXXXXXXXX first, then 0XXXXXXXXXX, then raw — returns all
   * candidates so we can do an OR query.
   */
  private phoneVariants(phoneNumber: string): string[] {
    const digits = phoneNumber.replace(/\D/g, '');
    const variants = new Set<string>();

    // +923XXXXXXXXX (12 digits starting 92)
    if (digits.startsWith('92') && digits.length === 12) {
      variants.add(`+92${digits.slice(2)}`);
      variants.add(`0${digits.slice(2)}`);
      variants.add(digits.slice(2)); // 10-digit
    }
    // 03XXXXXXXXX (11 digits starting 0)
    else if (digits.startsWith('0') && digits.length === 11) {
      variants.add(`+92${digits.slice(1)}`);
      variants.add(digits); // keep as-is (03...)
      variants.add(digits.slice(1)); // 10-digit
    }
    // 3XXXXXXXXX (10 digits)
    else if (digits.length === 10 && digits.startsWith('3')) {
      variants.add(`+92${digits}`);
      variants.add(`0${digits}`);
      variants.add(digits);
    }

    variants.add(phoneNumber.trim()); // always include raw input
    return Array.from(variants);
  }

  private async findUserByPhone(phoneNumber: string) {
    const variants = this.phoneVariants(phoneNumber);
    return this.prisma.user.findFirst({
      where: { phoneNumber: { in: variants } },
    });
  }

  /**
   * Forgot password — verifies phone exists and "sends" OTP (fixed: 000000)
   */
  async forgotPassword(phoneNumber: string): Promise<{ message: string }> {
    const user = await this.findUserByPhone(phoneNumber);
    if (!user) {
      throw new NotFoundException('No account found with this phone number');
    }
    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP — dummy OTP is always 000000
   */
  async verifyOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<{ message: string; verified: boolean }> {
    if (otp !== '000000') {
      throw new UnauthorizedException('Invalid OTP');
    }
    const user = await this.findUserByPhone(phoneNumber);
    if (!user) {
      throw new NotFoundException('No account found with this phone number');
    }
    return { message: 'OTP verified successfully', verified: true };
  }

  /**
   * Reset password using phone + OTP + new password
   */
  async resetPassword(
    phoneNumber: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (otp !== '000000') {
      throw new UnauthorizedException('Invalid OTP');
    }
    const user = await this.findUserByPhone(phoneNumber);
    if (!user) {
      throw new NotFoundException('No account found with this phone number');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    return { message: 'Password reset successfully' };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    return { message: 'Password changed successfully' };
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
  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate JWT token for user
   */
  private async generateToken(user: any): Promise<string> {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
