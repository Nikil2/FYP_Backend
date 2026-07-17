import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { CompleteWorkerProfileDto } from './dto/complete-worker-profile.dto';
import { WorkerResponseDto } from './dto/worker-response.dto';
import { UpdateOnlineStatusResponseDto } from './dto/update-online-status-response.dto';
import { Prisma, UserRole, VerificationStatus } from '@prisma/client';
import { WalletService } from '../wallet/wallet.service';

/** The worker-profile fields shared by full signup and AI-completed signup. */
interface WorkerProfileInput {
  cnicNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  selfieUrl?: string;
  workPhotosUrls?: string[];
  homeAddress: string;
  homeLat: number;
  homeLng: number;
  city?: string;
  experienceYears: number;
  visitingCharges: number;
  bio?: string;
  services: { serviceId: number; price: number }[];
  portfolioImages?: Array<{ imageUrl: string; description?: string }>;
}

@Injectable()
export class WorkersService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  /**
   * Register a new worker (classic single-form signup): creates the User AND the
   * WorkerProfile together in one transaction.
   */
  async registerWorker(
    createWorkerDto: CreateWorkerDto,
  ): Promise<WorkerResponseDto> {
    const { phoneNumber, password, fullName, profilePicUrl, fcmToken, selfieUrl } =
      createWorkerDto;

    // Check if user with phone already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with phone number ${phoneNumber} already exists`,
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const profileId = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phoneNumber,
            password: hashedPassword,
            fullName,
            profilePicUrl: profilePicUrl || selfieUrl,
            fcmToken,
            role: UserRole.WORKER,
            isVerified: false,
          },
        });

        return this.createWorkerProfileForUser(tx, user.id, createWorkerDto);
      });

      return this.getFullProfile(profileId);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof BadRequestException) throw error;

      throw new BadRequestException(
        'Failed to register worker. Please try again.',
      );
    }
  }

  /**
   * Complete an already-created "soft" worker account (from the AI onboarding
   * flow, POST /users/worker/start) into a full WorkerProfile. The user already
   * exists and is authenticated; we only add the profile, set the real name, and
   * submit for verification (PENDING).
   */
  async completeWorkerProfile(
    userId: string,
    dto: CompleteWorkerProfileDto,
  ): Promise<WorkerResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== UserRole.WORKER) {
      throw new BadRequestException('This account is not a worker account');
    }

    const existingProfile = await this.prisma.workerProfile.findUnique({
      where: { userId },
    });
    if (existingProfile) {
      throw new ConflictException('Worker profile already completed');
    }

    try {
      const profileId = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            fullName: dto.fullName,
            profilePicUrl: user.profilePicUrl || dto.selfieUrl,
          },
        });

        return this.createWorkerProfileForUser(tx, userId, dto);
      });

      return this.getFullProfile(profileId);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof BadRequestException) throw error;

      throw new BadRequestException(
        'Failed to complete worker profile. Please try again.',
      );
    }
  }

  /**
   * Shared worker-profile creation for an EXISTING user. Validates coordinates,
   * services and CNIC uniqueness, then creates the WorkerProfile + service links
   * + portfolio within the given transaction. Returns the new profile id.
   */
  private async createWorkerProfileForUser(
    tx: Prisma.TransactionClient,
    userId: string,
    input: WorkerProfileInput,
  ): Promise<string> {
    const {
      cnicNumber,
      cnicFrontUrl,
      cnicBackUrl,
      selfieUrl,
      workPhotosUrls,
      homeAddress,
      homeLat,
      homeLng,
      city,
      experienceYears,
      visitingCharges,
      bio,
      services: serviceInputs,
      portfolioImages,
    } = input;

    if (homeLat < -90 || homeLat > 90 || homeLng < -180 || homeLng > 180) {
      throw new BadRequestException('Invalid coordinates provided');
    }
    if (!serviceInputs || serviceInputs.length === 0) {
      throw new BadRequestException('At least one service must be selected');
    }

    const serviceIds = serviceInputs.map((s) => s.serviceId);

    const existingCnic = await tx.workerProfile.findUnique({
      where: { cnicNumber },
    });
    if (existingCnic) {
      throw new ConflictException(
        `CNIC ${cnicNumber} is already registered as a worker`,
      );
    }

    const services = await tx.service.findMany({
      where: { id: { in: serviceIds } },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Some services do not exist');
    }

    // Accept both legacy portfolioImages and direct Cloudinary URL arrays.
    const normalizedPortfolioImages = [
      ...(portfolioImages || []),
      ...(workPhotosUrls || []).map((imageUrl) => ({ imageUrl })),
    ].filter((portfolio) => Boolean(portfolio?.imageUrl));

    const workerProfile = await tx.workerProfile.create({
      data: {
        userId,
        cnicNumber,
        cnicFrontUrl,
        cnicBackUrl,
        selfieImageUrl: selfieUrl || null,
        homeAddress,
        homeLat,
        homeLng,
        city: city || null,
        experienceYears,
        visitingCharges: visitingCharges.toString(), // Prisma Decimal expects string
        bio: bio || null,
        verificationStatus: VerificationStatus.PENDING,
      },
    });

    for (const { serviceId, price } of serviceInputs) {
      await tx.workerService.create({
        data: {
          workerId: workerProfile.id,
          serviceId,
          price: price.toString(),
        },
      });
    }

    if (normalizedPortfolioImages.length > 0) {
      for (const portfolio of normalizedPortfolioImages) {
        await tx.workerPortfolio.create({
          data: {
            workerId: workerProfile.id,
            imageUrl: portfolio.imageUrl,
          },
        });
      }
    }

    return workerProfile.id;
  }

  /** Fetch a worker profile with user, services and portfolio, mapped to DTO. */
  private async getFullProfile(profileId: string): Promise<WorkerResponseDto> {
    const completeProfile = await this.prisma.workerProfile.findUnique({
      where: { id: profileId },
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
    });

    return this.mapToResponseDto(completeProfile.user, completeProfile);
  }

  /**
   * Get worker profile by ID
   */
  async getWorkerById(workerId: string): Promise<WorkerResponseDto> {
    const workerProfile = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
    });

    if (!workerProfile) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    return this.mapToResponseDto(workerProfile.user, workerProfile);
  }

  /**
   * Get worker profile by user ID
   */
  async getWorkerByUserId(userId: string): Promise<WorkerResponseDto> {
    const workerProfile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
    });

    if (!workerProfile) {
      throw new NotFoundException(
        `Worker profile for user ${userId} not found`,
      );
    }

    return this.mapToResponseDto(workerProfile.user, workerProfile);
  }

  /**
   * Update worker profile
   */
  async updateWorker(
    workerId: string,
    updateData: Partial<CreateWorkerDto>,
  ): Promise<WorkerResponseDto> {
    const workerProfile = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
    });

    if (!workerProfile) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // Update user fields if provided
        if (
          updateData.fullName ||
          updateData.profilePicUrl ||
          updateData.fcmToken
        ) {
          await tx.user.update({
            where: { id: workerProfile.userId },
            data: {
              fullName: updateData.fullName,
              profilePicUrl: updateData.profilePicUrl,
              fcmToken: updateData.fcmToken,
            },
          });
        }

        // Update worker profile fields
        const updatedProfile = await tx.workerProfile.update({
          where: { id: workerId },
          data: {
            bio: updateData.bio,
            experienceYears: updateData.experienceYears,
            visitingCharges: updateData.visitingCharges?.toString(),
            homeAddress: updateData.homeAddress,
            homeLat: updateData.homeLat,
            homeLng: updateData.homeLng,
          },
          include: {
            user: true,
            services: { include: { service: true } },
            portfolio: true,
          },
        });

        return updatedProfile;
      });

      return this.mapToResponseDto(updated.user, updated);
    } catch (error) {
      throw new BadRequestException('Failed to update worker profile');
    }
  }

  /**
   * Get all workers (paginated)
   */
  async getAllWorkers(
    skip: number = 0,
    take: number = 10,
    serviceId?: number,
    categoryId?: string,
  ): Promise<WorkerResponseDto[]> {
    const where: any = {};
    if (serviceId) {
      where.services = {
        some: {
          serviceId,
        },
      };
    } else if (categoryId) {
      where.services = {
        some: {
          service: {
            categoryId,
          },
        },
      };
    }

    const workers = await this.prisma.workerProfile.findMany({
      where,
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
      skip,
      take,
    });

    return workers
      .map((worker) => this.mapToResponseDto(worker.user, worker))
      .sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
  }

  /**
   * Get verified workers only
   */
  async getVerifiedWorkers(
    skip: number = 0,
    take: number = 10,
    serviceId?: number,
    categoryId?: string,
  ): Promise<WorkerResponseDto[]> {
    const where: any = {
      verificationStatus: VerificationStatus.APPROVED,
    };

    if (serviceId) {
      where.services = {
        some: {
          serviceId,
        },
      };
    } else if (categoryId) {
      where.services = {
        some: {
          service: {
            categoryId,
          },
        },
      };
    }

    const workers = await this.prisma.workerProfile.findMany({
      where,
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
      skip,
      take,
    });

    return workers
      .map((worker) => this.mapToResponseDto(worker.user, worker))
      .sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
  }

  /**
   * Update worker online status
   */
  async updateOnlineStatus(
    workerId: string,
    isOnline: boolean,
  ): Promise<UpdateOnlineStatusResponseDto> {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const updated = await this.prisma.workerProfile.update({
      where: { id: workerId },
      data: { isOnline },
    });

    return {
      workerId: updated.id,
      isOnline: updated.isOnline,
      updatedAt: new Date(),
    };
  }

  /**
   * Get worker orders by status bucket (active/past)
   */
  async getWorkerOrders(
    workerId: string,
    status: string = 'active',
    skip: number = 0,
    take: number = 20,
  ) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const activeStatuses = [
      'PENDING',
      'NEGOTIATION',
      'ACCEPTED',
      'IN_PROGRESS',
    ];
    const pastStatuses = ['COMPLETED', 'CANCELLED', 'DISPUTED'];
    const statusList = status === 'past' ? pastStatuses : activeStatuses;

    const bookings = await this.prisma.booking.findMany({
      where: {
        workerId,
        status: { in: statusList as any },
      },
      include: {
        customer: true,
        service: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return bookings.map((booking) => ({
      id: booking.id,
      serviceName: booking.service.name,
      description: booking.description,
      status: booking.status,
      location: booking.jobAddress,
      jobLat: booking.jobLat,
      jobLng: booking.jobLng,
      scheduledAt: booking.scheduledAt,
      agreedPrice: booking.finalPrice ? Number(booking.finalPrice) : null,
      imageUrls: booking.imageUrls ?? [],
      customer: {
        id: booking.customer.id,
        fullName: booking.customer.fullName,
        phoneNumber: booking.customer.phoneNumber,
      },
      createdAt: booking.createdAt,
    }));
  }

  /**
   * Wallet summary — backed by the real ledger (delegates to WalletService).
   */
  async getWalletSummary(workerId: string) {
    return this.walletService.getSummary(workerId);
  }

  /**
   * Wallet transactions — real ledger (delegates to WalletService).
   */
  async getWalletTransactions(workerId: string) {
    return this.walletService.getTransactions(workerId);
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(user: any, workerProfile: any): WorkerResponseDto {
    const services = workerProfile.services
      ? workerProfile.services.map((ws: any) => ({
          id: ws.service.id,
          name: ws.service.name,
          iconUrl: ws.service.iconUrl,
          price: parseFloat(ws.price ?? 0),
        }))
      : [];

    const portfolio = workerProfile.portfolio
      ? workerProfile.portfolio.map((p: any) => ({
          id: p.id,
          imageUrl: p.imageUrl,
          description: p.description,
        }))
      : [];

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
      workerId: workerProfile.id,
      cnicNumber: workerProfile.cnicNumber,
      cnicFrontUrl: workerProfile.cnicFrontUrl,
      cnicBackUrl: workerProfile.cnicBackUrl,
      homeAddress: workerProfile.homeAddress,
      homeLat: workerProfile.homeLat,
      homeLng: workerProfile.homeLng,
      bio: workerProfile.bio,
      experienceYears: workerProfile.experienceYears,
      visitingCharges: parseFloat(workerProfile.visitingCharges),
      isOnline: workerProfile.isOnline,
      verificationStatus: workerProfile.verificationStatus,
      averageRating: parseFloat(workerProfile.averageRating),
      totalJobsCompleted: workerProfile.totalJobsCompleted,
      currentTier: workerProfile.currentTier ?? 'NONE',
      rankingScore: this.calculateRankingScore(workerProfile),
      services,
      portfolio,
    };
  }

  /**
   * Weighted ranking score (PDF section 6). Response-time and repeat-customer
   * inputs aren't tracked yet, so they're held at neutral defaults — the formula
   * is complete and those two factors slot in later without changing it.
   */
  private calculateRankingScore(workerProfile: any): number {
    const ratingScore = parseFloat(workerProfile.averageRating ?? 0) / 5;
    const jobsScore = Math.min(
      (workerProfile.totalJobsCompleted ?? 0) / 200,
      1,
    );
    const responseScore = 0.6; // neutral (MEDIUM) until response time is tracked
    const repeatScore = 0; // until repeat-customer rate is tracked

    const score =
      0.4 * ratingScore +
      0.3 * jobsScore +
      0.2 * responseScore +
      0.1 * repeatScore;

    return Math.round(score * 1000) / 1000;
  }

  /**
   * Replace worker's services (add/remove/update prices)
   */
  async updateWorkerServices(
    workerId: string,
    services: { serviceId: number; price: number }[],
  ) {
    const workerProfile = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
    });

    if (!workerProfile) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    if (!services || services.length === 0) {
      throw new BadRequestException('At least one service must be selected');
    }

    const serviceIds = services.map((s) => s.serviceId);
    const existing = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    if (existing.length !== serviceIds.length) {
      throw new BadRequestException('Some services do not exist');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workerService.deleteMany({ where: { workerId } });

      for (const { serviceId, price } of services) {
        await tx.workerService.create({
          data: { workerId, serviceId, price: price.toString() },
        });
      }
    });

    const updated = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      include: {
        user: true,
        services: { include: { service: true } },
        portfolio: true,
      },
    });

    return this.mapToResponseDto(updated!.user, updated);
  }

  /**
   * Add portfolio image to worker
   */
  async addPortfolioImage(
    workerId: string,
    imageUrl: string,
    description?: string,
  ): Promise<{ id: string; imageUrl: string; description?: string }> {
    const workerExists = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
    });

    if (!workerExists) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const portfolio = await this.prisma.workerPortfolio.create({
      data: {
        workerId,
        imageUrl,
        description: description || null,
      },
    });

    return {
      id: portfolio.id,
      imageUrl: portfolio.imageUrl,
      description: portfolio.description,
    };
  }

  /**
   * Get portfolio images for a worker
   */
  async getPortfolio(
    workerId: string,
  ): Promise<Array<{ id: string; imageUrl: string; description?: string }>> {
    const workerExists = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
    });

    if (!workerExists) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const portfolio = await this.prisma.workerPortfolio.findMany({
      where: { workerId },
    });

    return portfolio.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      description: p.description,
    }));
  }

  /**
   * Delete portfolio image
   */
  async deletePortfolioImage(
    workerId: string,
    portfolioId: string,
  ): Promise<{ message: string }> {
    const portfolio = await this.prisma.workerPortfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio image not found`);
    }

    if (portfolio.workerId !== workerId) {
      throw new BadRequestException(
        'Unauthorized: Portfolio image does not belong to this worker',
      );
    }

    await this.prisma.workerPortfolio.delete({
      where: { id: portfolioId },
    });

    return { message: 'Portfolio image deleted successfully' };
  }

  /**
   * Update portfolio image description
   */
  async updatePortfolioImage(
    workerId: string,
    portfolioId: string,
    description: string,
  ): Promise<{ id: string; imageUrl: string; description?: string }> {
    const portfolio = await this.prisma.workerPortfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio image not found`);
    }

    if (portfolio.workerId !== workerId) {
      throw new BadRequestException(
        'Unauthorized: Portfolio image does not belong to this worker',
      );
    }

    const updated = await this.prisma.workerPortfolio.update({
      where: { id: portfolioId },
      data: { description },
    });

    return {
      id: updated.id,
      imageUrl: updated.imageUrl,
      description: updated.description,
    };
  }
}
