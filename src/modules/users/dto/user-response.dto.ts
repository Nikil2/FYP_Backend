import { UserRole } from '@prisma/client';

export class UserResponseDto {
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
