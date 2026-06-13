import { UserRole, VerificationStatus, WorkerTier } from '@prisma/client';

export class ServiceDto {
  id: number;
  name: string;
  iconUrl?: string;
}

export class PortfolioDto {
  id: string;
  imageUrl: string;
  description?: string;
}

export class WorkerResponseDto {
  // User fields
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Worker profile fields
  workerId: string;
  cnicNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  homeAddress: string;
  homeLat: number;
  homeLng: number;
  bio?: string;
  experienceYears: number;
  visitingCharges: number;
  isOnline: boolean;
  verificationStatus: VerificationStatus;
  averageRating: number;
  totalJobsCompleted: number;
  currentTier: WorkerTier;
  rankingScore?: number;

  // Services
  services: ServiceDto[];

  // Portfolio
  portfolio: PortfolioDto[];
}
