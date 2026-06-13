import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminResponseDto,
  DashboardResponseDto,
  WorkerQualityDto,
  DashboardActivityDto,
} from './dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate admin credentials and return admin profile
   */
  async validateAdminCredentials(
    username: string,
    password: string,
  ): Promise<{ admin: AdminResponseDto; accessToken: string }> {
    // Find user by phone number (username is stored as phoneNumber)
    const user = await this.prisma.user.findFirst({
      where: {
        phoneNumber: username,
        role: 'ADMIN',
        isBlocked: false,
      },
      include: {
        adminProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    // In production, use bcrypt to compare passwords
    // For now, simple comparison (passwords should be hashed in production)
    if (user.password !== password) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    // Generate JWT token with ADMIN role
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      admin: this.mapAdminResponse(user),
      accessToken,
    };
  }

  /**
   * Get dashboard statistics and data
   */
  async getDashboardStats(): Promise<DashboardResponseDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalWorkers,
      verifiedWorkers,
      pendingVerifications,
      blockedWorkers,
      onlineWorkers,
      totalBookings,
      bookingsToday,
      activeComplaints,
      flaggedReviews,
      monthlyRevenueResult,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      this.prisma.workerProfile.count(),
      this.prisma.workerProfile.count({
        where: { verificationStatus: 'APPROVED' },
      }),
      this.prisma.workerProfile.count({
        where: { verificationStatus: 'PENDING' },
      }),
      this.prisma.workerProfile.count({ where: { user: { isBlocked: true } } }),
      this.prisma.workerProfile.count({ where: { isOnline: true } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { createdAt: { gte: today } } }),
      this.prisma.complaint.count({ where: { isResolved: false } }),
      this.prisma.feedback.count({ where: { rating: { lte: 2 } } }),
      this.prisma.booking.aggregate({
        _sum: { finalPrice: true },
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().setDate(1)), // First day of current month
          },
        },
      }),
    ]);

    // Get average worker rating
    const avgRatingResult = await this.prisma.workerProfile.aggregate({
      _avg: { averageRating: true },
    });

    // Get recent activity
    const recentActivity = await this.getRecentAdminActivity();

    // Get worker quality snapshot
    const workerQuality = await this.getWorkerQualitySnapshot();

    // Get open complaints count
    const openComplaints = activeComplaints;

    // Calculate pending payouts (completed bookings without payment)
    const pendingPayouts = await this.prisma.booking.count({
      where: {
        status: 'COMPLETED',
        finalPrice: { not: null },
      },
    });

    return {
      stats: {
        totalUsers,
        totalWorkers,
        verifiedWorkers,
        pendingVerifications,
        totalBookings,
        bookingsToday,
        activeComplaints,
        monthlyRevenue: Number(monthlyRevenueResult._sum.finalPrice) || 0,
        averageWorkerRating: Number(avgRatingResult._avg.averageRating) || 0,
        onlineWorkers,
        blockedWorkers,
        flaggedReviews,
      },
      recentActivity,
      workerQuality,
      openComplaints,
      pendingPayouts,
      averageResolutionTime: '2.5 days', // This would be calculated from resolved complaints
    };
  }

  /**
   * Get all users with filtering and pagination
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      role: { not: 'ADMIN' },
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { id: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status === 'Active') {
      where.isBlocked = false;
    } else if (status === 'Blocked') {
      where.isBlocked = true;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          workerProfile: {
            select: {
              verificationStatus: true,
              averageRating: true,
              totalJobsCompleted: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u: any) => ({
        id: u.id,
        phoneNumber: u.phoneNumber,
        fullName: u.fullName,
        profilePicUrl: u.profilePicUrl,
        role: u.role,
        isBlocked: u.isBlocked,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        workerProfile: u.workerProfile,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Block or unblock a user
   */
  async toggleUserBlock(userId: string, block: boolean): Promise<any> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: block },
      include: {
        adminProfile: true,
        workerProfile: {
          select: {
            verificationStatus: true,
            averageRating: true,
          },
        },
      },
    });

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      role: user.role,
      isBlocked: user.isBlocked,
      isVerified: user.isVerified,
      workerProfile: user.workerProfile,
    };
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Get all workers with their profiles
   */
  async getAllWorkers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      const userSearch = await this.prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search } },
          ],
        },
        select: { id: true },
      });
      where.userId = { in: userSearch.map((u: any) => u.id) };
    }

    if (status === 'verified') {
      where.verificationStatus = 'APPROVED';
      where.user = { isBlocked: false };
    } else if (status === 'pending') {
      where.verificationStatus = 'PENDING';
    } else if (status === 'blocked') {
      where.user = { isBlocked: true };
    } else if (status === 'rejected') {
      where.verificationStatus = 'REJECTED';
    }

    const [workers, total] = await Promise.all([
      this.prisma.workerProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              fullName: true,
              phoneNumber: true,
              profilePicUrl: true,
              isBlocked: true,
            },
          },
          services: {
            include: {
              service: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.workerProfile.count({ where }),
    ]);

    const workerIds = workers.map((w: any) => w.id);
    const userIds = workers.map((w: any) => w.userId);
    const portfolioLookupIds = [...new Set([...workerIds, ...userIds])];

    const portfolioRows = portfolioLookupIds.length
      ? await this.prisma.workerPortfolio.findMany({
          where: { workerId: { in: portfolioLookupIds } },
          select: { id: true, workerId: true, imageUrl: true, description: true },
        })
      : [];

    const portfolioByWorkerId = portfolioRows.reduce(
      (acc, row) => {
        if (!acc[row.workerId]) acc[row.workerId] = [];
        acc[row.workerId].push({ id: row.id, imageUrl: row.imageUrl, description: row.description });
        return acc;
      },
      {} as Record<string, Array<{ id: string; imageUrl: string; description: string | null }>>,
    );

    return {
      data: workers.map((worker: any) => {
        const byWorkerId = portfolioByWorkerId[worker.id] || [];
        const byUserId = portfolioByWorkerId[worker.userId] || [];
        const merged = [...byWorkerId, ...byUserId];
        const portfolio = merged.filter(
          (item, index, arr) => arr.findIndex((e) => e.id === item.id) === index,
        );

        return {
          id: worker.id,
          userId: worker.userId,
          cnicNumber: worker.cnicNumber,
          cnicFrontUrl: worker.cnicFrontUrl,
          cnicBackUrl: worker.cnicBackUrl,
          selfieImageUrl: worker.selfieImageUrl,
          bio: worker.bio,
          experienceYears: worker.experienceYears,
          visitingCharges: Number(worker.visitingCharges),
          homeAddress: worker.homeAddress,
          verificationStatus: worker.verificationStatus,
          averageRating: Number(worker.averageRating),
          totalJobsCompleted: worker.totalJobsCompleted,
          isOnline: worker.isOnline,
          user: worker.user,
          services: worker.services.map((s: any) => s.service),
          portfolio,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending worker verifications
   */
  async getPendingVerifications() {
    const workers = await this.prisma.workerProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: {
          select: {
            fullName: true,
            phoneNumber: true,
            profilePicUrl: true,
            createdAt: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const workerIds = workers.map((worker) => worker.id);
    const userIds = workers.map((worker) => worker.userId);
    const portfolioLookupIds = [...new Set([...workerIds, ...userIds])];

    const portfolioRows = portfolioLookupIds.length
      ? await this.prisma.workerPortfolio.findMany({
          where: {
            workerId: { in: portfolioLookupIds },
          },
          select: {
            id: true,
            workerId: true,
            imageUrl: true,
            description: true,
          },
        })
      : [];

    const portfolioByWorkerId = portfolioRows.reduce(
      (acc, row) => {
        if (!acc[row.workerId]) {
          acc[row.workerId] = [];
        }
        acc[row.workerId].push({
          id: row.id,
          imageUrl: row.imageUrl,
          description: row.description,
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{ id: string; imageUrl: string; description: string | null }>
      >,
    );

    return workers.map((worker: any) => ({
      id: worker.id,
      userId: worker.userId,
      cnicNumber: worker.cnicNumber,
      cnicFrontUrl: worker.cnicFrontUrl,
      cnicBackUrl: worker.cnicBackUrl,
      bio: worker.bio,
      experienceYears: worker.experienceYears,
      visitingCharges: Number(worker.visitingCharges),
      homeAddress: worker.homeAddress,
      homeLat: worker.homeLat,
      homeLng: worker.homeLng,
      selfieImageUrl: worker.selfieImageUrl,
      verificationStatus: worker.verificationStatus,
      totalJobsCompleted: worker.totalJobsCompleted,
      averageRating: Number(worker.averageRating),
      user: worker.user,
      services: worker.services.map((s: any) => s.service),
      portfolio: (() => {
        const byWorkerId = portfolioByWorkerId[worker.id] || [];
        const byUserId = portfolioByWorkerId[worker.userId] || [];
        const merged = [...byWorkerId, ...byUserId];

        // Deduplicate in case both keys point to same rows.
        return merged.filter(
          (item, index, arr) =>
            arr.findIndex((entry) => entry.id === item.id) === index,
        );
      })(),
      submittedAt: worker.user?.createdAt || new Date(),
    }));
  }

  /**
   * Approve worker verification
   */
  async approveWorkerVerification(
    workerId: string,
    reviewedBy: string,
  ): Promise<any> {
    const worker = await this.prisma.workerProfile.update({
      where: { id: workerId },
      data: {
        verificationStatus: 'APPROVED',
        reviewNotes: 'Verified and approved by admin',
        reviewedBy,
      },
      include: {
        user: {
          select: {
            fullName: true,
            phoneNumber: true,
            isVerified: true,
          },
        },
      },
    });

    // Also verify the user
    await this.prisma.user.update({
      where: { id: worker.userId },
      data: { isVerified: true },
    });

    return worker;
  }

  /**
   * Reject worker verification
   */
  async rejectWorkerVerification(
    workerId: string,
    reviewedBy: string,
    reason: string,
  ): Promise<any> {
    const worker = await this.prisma.workerProfile.update({
      where: { id: workerId },
      data: {
        verificationStatus: 'REJECTED',
        reviewNotes: reason,
        reviewedBy,
      },
      include: {
        user: {
          select: {
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    });

    return worker;
  }

  /**
   * Get all complaints
   */
  async getComplaints(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status === 'resolved') {
      where.isResolved = true;
    } else if (status === 'pending') {
      where.isResolved = false;
    }

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              id: true,
              description: true,
              customer: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                },
              },
              worker: {
                include: {
                  user: {
                    select: {
                      fullName: true,
                      phoneNumber: true,
                    },
                  },
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
          admin: {
            select: {
              adminLevel: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      data: complaints.map((c) => ({
        id: c.id,
        bookingId: c.bookingId,
        description: c.description,
        isResolved: c.isResolved,
        evidenceUrls: c.evidenceUrls,
        createdAt: c.createdAt,
        booking: c.booking,
        admin: c.admin,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve a complaint
   */
  async resolveComplaint(complaintId: string, adminUserId: string): Promise<any> {
    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId: adminUserId },
    });
    if (!adminProfile) {
      throw new NotFoundException('Admin profile not found');
    }

    const complaint = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        isResolved: true,
        adminId: adminProfile.id,
      },
      include: {
        booking: {
          select: {
            id: true,
            customer: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
            worker: {
              include: {
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return complaint;
  }

  /**
   * Assign complaint to admin
   */
  async assignComplaint(complaintId: string, adminId: string): Promise<any> {
    const complaint = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { adminId },
      include: {
        admin: {
          select: {
            adminLevel: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    return complaint;
  }

  /**
   * Get live and historical jobs/bookings with worker, customer, and service metadata.
   */
  async getJobs(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    const normalizedStatus = status?.trim().toUpperCase();

    if (normalizedStatus && normalizedStatus !== 'ALL') {
      if (normalizedStatus === 'ACTIVE') {
        where.status = {
          in: ['PENDING', 'NEGOTIATION', 'ACCEPTED', 'IN_PROGRESS'],
        };
      } else {
        where.status = normalizedStatus;
      }
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { jobAddress: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: search } } },
        { worker: { id: { contains: search, mode: 'insensitive' } } },
        {
          worker: {
            user: { fullName: { contains: search, mode: 'insensitive' } },
          },
        },
        { worker: { user: { phoneNumber: { contains: search } } } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              profilePicUrl: true,
            },
          },
          worker: {
            select: {
              id: true,
              verificationStatus: true,
              averageRating: true,
              totalJobsCompleted: true,
              isOnline: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                  profilePicUrl: true,
                  isBlocked: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              iconUrl: true,
            },
          },
          _count: {
            select: {
              messages: true,
              proposals: true,
              complaints: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        description: job.description,
        jobAddress: job.jobAddress,
        finalPrice: job.finalPrice ? Number(job.finalPrice) : null,
        scheduledAt: job.scheduledAt,
        createdAt: job.createdAt,
        customerId: job.customerId,
        workerId: job.workerId,
        serviceId: job.serviceId,
        customer: job.customer,
        worker: {
          id: job.worker.id,
          verificationStatus: job.worker.verificationStatus,
          averageRating: Number(job.worker.averageRating),
          totalJobsCompleted: job.worker.totalJobsCompleted,
          isOnline: job.worker.isOnline,
          user: job.worker.user,
        },
        service: job.service,
        counts: {
          messages: job._count.messages,
          proposals: job._count.proposals,
          complaints: job._count.complaints,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get full end-to-end details for a single job/booking.
   */
  async getJobById(bookingId: string) {
    const job = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            profilePicUrl: true,
            isBlocked: true,
            createdAt: true,
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                profilePicUrl: true,
                isBlocked: true,
                isVerified: true,
              },
            },
            services: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    iconUrl: true,
                  },
                },
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            iconUrl: true,
          },
        },
        proposals: {
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: {
                id: true,
                adminLevel: true,
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        feedback: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      status: job.status,
      description: job.description,
      jobAddress: job.jobAddress,
      jobLat: job.jobLat,
      jobLng: job.jobLng,
      finalPrice: job.finalPrice ? Number(job.finalPrice) : null,
      scheduledAt: job.scheduledAt,
      createdAt: job.createdAt,
      customerId: job.customerId,
      workerId: job.workerId,
      serviceId: job.serviceId,
      customer: job.customer,
      worker: {
        id: job.worker.id,
        cnicNumber: job.worker.cnicNumber,
        experienceYears: job.worker.experienceYears,
        visitingCharges: Number(job.worker.visitingCharges),
        homeAddress: job.worker.homeAddress,
        verificationStatus: job.worker.verificationStatus,
        averageRating: Number(job.worker.averageRating),
        totalJobsCompleted: job.worker.totalJobsCompleted,
        isOnline: job.worker.isOnline,
        user: job.worker.user,
        services: job.worker.services.map((entry) => entry.service),
      },
      service: job.service,
      proposals: job.proposals.map((proposal) => ({
        id: proposal.id,
        bookingId: proposal.bookingId,
        proposedBy: proposal.proposedBy,
        amount: Number(proposal.amount),
        status: proposal.status,
        parentId: proposal.parentId,
        createdAt: proposal.createdAt,
      })),
      messages: job.messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
        sender: message.sender,
      })),
      complaints: job.complaints,
      feedback: job.feedback
        ? {
            id: job.feedback.id,
            bookingId: job.feedback.bookingId,
            userId: job.feedback.userId,
            rating: job.feedback.rating,
            comment: job.feedback.comment,
            createdAt: job.feedback.createdAt,
            user: job.feedback.user,
          }
        : null,
      summary: {
        totalMessages: job.messages.length,
        totalProposals: job.proposals.length,
        totalComplaints: job.complaints.length,
        hasFeedback: Boolean(job.feedback),
      },
    };
  }

  /**
   * Get all reviews/feedback
   */
  async getReviews(
    page: number = 1,
    limit: number = 10,
    filter?: string,
    minRating?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filter === 'flagged' || minRating) {
      where.rating = { lte: minRating || 2 };
    }

    const [reviews, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              fullName: true,
              phoneNumber: true,
              profilePicUrl: true,
            },
          },
          booking: {
            select: {
              id: true,
              description: true,
              worker: {
                include: {
                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data: reviews.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        userId: r.userId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: r.user,
        booking: r.booking,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Hide/unhide a review (soft delete via flag)
   * For now, we'll just delete it. Can add isVisible flag to schema later.
   */
  async toggleReviewVisibility(reviewId: string, hide: boolean): Promise<void> {
    if (hide) {
      await this.prisma.feedback.delete({
        where: { id: reviewId },
      });
    }
    // Unhide not supported yet without schema change
  }

  /**
   * Get all service categories
   */
  async getAllServices() {
    const services = await this.prisma.service.findMany({
      orderBy: { name: 'asc' },
    });

    return services.map((s) => ({
      id: s.id,
      name: s.name,
      iconUrl: s.iconUrl,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      categoryIcon: s.categoryIcon,
      isActive: s.isActive,
    }));
  }

  /**
   * Create a new service category
   */
  async createService(
    name: string,
    iconUrl: string | undefined,
    categoryId: string,
    categoryName: string,
    categoryIcon?: string,
  ) {
    if (!categoryId || !categoryName) {
      throw new BadRequestException('categoryId and categoryName are required');
    }

    const existing = await this.prisma.service.findUnique({
      where: {
        categoryId_name: {
          categoryId,
          name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Service with this name already exists');
    }

    const service = await this.prisma.service.create({
      data: {
        name,
        iconUrl,
        categoryId,
        categoryName,
        categoryIcon: categoryIcon || null,
        isActive: true,
      },
    });

    return {
      id: service.id,
      name: service.name,
      iconUrl: service.iconUrl,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      categoryIcon: service.categoryIcon,
      isActive: service.isActive,
    };
  }

  /**
   * Update a service category
   */
  async updateService(id: number, updateData: UpdateServiceDto) {
    const service = await this.prisma.service.update({
      where: { id },
      data: updateData,
    });

    return {
      id: service.id,
      name: service.name,
      iconUrl: service.iconUrl,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      categoryIcon: service.categoryIcon,
      isActive: service.isActive,
    };
  }

  /**
   * Deactivate a service category
   */
  async deactivateService(id: number) {
    const service = await this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      categoryIcon: service.categoryIcon,
      isActive: service.isActive,
    };
  }

  /**
   * Activate a service category
   */
  async activateService(id: number) {
    const service = await this.prisma.service.update({
      where: { id },
      data: { isActive: true },
    });

    return {
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      categoryIcon: service.categoryIcon,
      isActive: service.isActive,
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats() {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [grossRevenue, refunds, monthlyBookings] = await Promise.all([
      this.prisma.booking.aggregate({
        _sum: { finalPrice: true },
        where: {
          status: 'COMPLETED',
          createdAt: { gte: currentMonth },
        },
      }),
      this.prisma.booking.aggregate({
        _sum: { finalPrice: true },
        where: {
          status: 'CANCELLED',
          createdAt: { gte: currentMonth },
          finalPrice: { not: null },
        },
      }),
      this.prisma.booking.findMany({
        where: {
          createdAt: { gte: currentMonth },
          status: 'COMPLETED',
        },
        select: {
          finalPrice: true,
          createdAt: true,
        },
      }),
    ]);

    const gross = Number(grossRevenue._sum.finalPrice) || 0;
    const refund = Number(refunds._sum.finalPrice) || 0;
    const platformFee = gross * 0.15; // 15% platform fee
    const netRevenue = gross - refund - platformFee;

    // Group by week for chart
    const revenueByWeek = this.groupRevenueByWeek(monthlyBookings);

    return {
      grossRevenue: gross,
      platformFee,
      refunds: refund,
      netRevenue,
      revenueByWeek,
      totalTransactions: monthlyBookings.length,
    };
  }

  /**
   * Get analytics data
   */
  async getAnalytics() {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      disputedBookings,
      dailyBookings,
      serviceDemand,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
      this.prisma.booking.count({ where: { status: 'DISPUTED' } }),
      this.prisma.booking.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: lastWeek },
        },
      }),
      this.prisma.booking.groupBy({
        by: ['serviceId'],
        _count: true,
      }),
    ]);

    const completionRate =
      totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const disputeRate =
      totalBookings > 0 ? (disputedBookings / totalBookings) * 100 : 0;

    // Get service names for demand
    const serviceIds = serviceDemand.map((s) => s.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    const serviceDemandWithNames = serviceDemand.map((s) => ({
      serviceId: s.serviceId,
      serviceName:
        services.find((srv) => srv.id === s.serviceId)?.name || 'Unknown',
      count: s._count,
    }));

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      disputedBookings,
      completionRate,
      disputeRate,
      dailyBookings: this.groupBookingsByDay(dailyBookings),
      serviceDemand: serviceDemandWithNames,
    };
  }

  // Helper methods
  private mapAdminResponse(user: any): AdminResponseDto {
    return {
      id: user.adminProfile?.id || '',
      userId: user.id,
      adminLevel: user.adminProfile?.adminLevel || 'MODERATOR',
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      profilePicUrl: user.profilePicUrl,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    };
  }

  private async getRecentAdminActivity(): Promise<DashboardActivityDto[]> {
    const [recentComplaints, recentVerifications] = await Promise.all([
      this.prisma.complaint.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              customer: { select: { fullName: true } },
              worker: { include: { user: { select: { fullName: true } } } },
            },
          },
        },
      }),
      this.prisma.workerProfile.findMany({
        take: 5,
        where: { verificationStatus: { not: 'PENDING' } },
        orderBy: { id: 'desc' },
        include: {
          user: { select: { fullName: true, createdAt: true } },
        },
      }),
    ]);

    const activities: DashboardActivityDto[] = [
      ...recentComplaints.map((complaint: any) => ({
        id: complaint.id,
        type: 'complaint',
        description: `Complaint on booking ${complaint.booking.id}`,
        timestamp: complaint.createdAt,
      })),
      ...recentVerifications.map((worker: any) => ({
        id: worker.id,
        type: 'verification',
        description: `${worker.user.fullName} verification ${worker.verificationStatus.toLowerCase()}`,
        timestamp: worker.user?.createdAt || new Date(),
      })),
    ];

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private async getWorkerQualitySnapshot(): Promise<WorkerQualityDto[]> {
    const workers = await this.prisma.workerProfile.findMany({
      take: 5,
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { averageRating: 'desc' },
    });

    return workers.map((worker) => ({
      workerId: worker.id,
      workerName: worker.user.fullName,
      rating: Number(worker.averageRating),
      totalReviews: worker.totalJobsCompleted,
      completedJobs: worker.totalJobsCompleted,
      verificationStatus: worker.verificationStatus,
    }));
  }

  private groupRevenueByWeek(bookings: any[]) {
    const weeks: { [key: string]: number } = {};
    bookings.forEach((b) => {
      const weekKey = this.getWeekKey(b.createdAt);
      weeks[weekKey] = (weeks[weekKey] || 0) + Number(b.finalPrice || 0);
    });
    return Object.entries(weeks).map(([week, amount]) => ({ week, amount }));
  }

  private groupBookingsByDay(bookings: any[]) {
    const days: { [key: string]: number } = {};
    bookings.forEach((b) => {
      const dayKey = b.createdAt.toISOString().split('T')[0];
      days[dayKey] = (days[dayKey] || 0) + 1;
    });
    return Object.entries(days).map(([day, count]) => ({ day, count }));
  }

  private getWeekKey(date: Date): string {
    const d = new Date(date);
    const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
    return weekStart.toISOString().split('T')[0];
  }

  // ==================== BONUS PROGRAM ====================

  /** Read (and lazily create) the singleton bonus config. */
  async getBonusConfig() {
    const existing = await this.prisma.bonusConfig.findUnique({
      where: { id: 1 },
    });
    return existing ?? this.prisma.bonusConfig.create({ data: { id: 1 } });
  }

  /** Update bonus thresholds, cashback rates, and eligibility gates. */
  async updateBonusConfig(body: Record<string, number>) {
    const allowed = [
      'commissionRate',
      'bronzeJobs',
      'silverJobs',
      'goldJobs',
      'platinumJobs',
      'bronzeCashback',
      'silverCashback',
      'goldCashback',
      'platinumCashback',
      'minRating',
      'minCompletionRate',
      'maxCancellationRate',
    ];
    const data: Record<string, number> = {};
    for (const key of allowed) {
      if (body[key] !== undefined && body[key] !== null) {
        data[key] = body[key];
      }
    }

    await this.getBonusConfig(); // ensure row exists
    return this.prisma.bonusConfig.update({ where: { id: 1 }, data });
  }

  /** Total commission earned vs total bonuses paid (US-012). */
  async getBonusAnalytics() {
    const [commissionAgg, bonusPaidAgg, paidCount, rejectedCount, workers] =
      await Promise.all([
        this.prisma.walletTransaction.aggregate({
          where: { type: 'COMMISSION_DEBIT' },
          _sum: { amount: true },
        }),
        this.prisma.bonusRecord.aggregate({
          where: { status: 'PAID' },
          _sum: { bonusAmount: true },
        }),
        this.prisma.bonusRecord.count({ where: { status: 'PAID' } }),
        this.prisma.bonusRecord.count({ where: { status: 'REJECTED' } }),
        this.prisma.workerProfile.findMany({ select: { currentTier: true } }),
      ]);

    const totalCommissionEarned = commissionAgg._sum.amount
      ? Math.abs(Number(commissionAgg._sum.amount))
      : 0;
    const totalBonusesPaid = Number(bonusPaidAgg._sum.bonusAmount ?? 0);

    const tierTally: Record<string, number> = {};
    for (const w of workers) {
      tierTally[w.currentTier] = (tierTally[w.currentTier] ?? 0) + 1;
    }

    return {
      totalCommissionEarned,
      totalBonusesPaid,
      netPlatformRevenue: totalCommissionEarned - totalBonusesPaid,
      bonusesPaidCount: paidCount,
      bonusesRejectedCount: rejectedCount,
      workersByTier: Object.entries(tierTally).map(([tier, count]) => ({
        tier,
        count,
      })),
    };
  }

  /** Suspend / restore a worker's bonus eligibility (US-013). */
  async setBonusSuspension(workerId: string, suspended: boolean) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { id: true },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }
    return this.prisma.workerProfile.update({
      where: { id: workerId },
      data: { isBonusSuspended: suspended },
      select: { id: true, isBonusSuspended: true },
    });
  }

  // ==================== FINANCE ADMIN ====================

  async getFinanceSummary() {
    const [commissionAgg, bonusAgg, topupAgg, workerWallets] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { type: 'COMMISSION_DEBIT' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletTransaction.aggregate({
        where: { type: 'BONUS_CREDIT' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletTransaction.aggregate({
        where: { type: 'TOPUP_CREDIT' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.workerProfile.aggregate({
        _sum: { walletBalance: true },
        _count: true,
      }),
    ]);

    const totalCommission = Math.abs(Number(commissionAgg._sum.amount ?? 0));
    const totalBonuses = Number(bonusAgg._sum.amount ?? 0);
    const totalTopups = Number(topupAgg._sum.amount ?? 0);

    return {
      totalCommissionCollected: totalCommission,
      totalBonusesPaid: totalBonuses,
      totalTopupsReceived: totalTopups,
      netPlatformRevenue: totalCommission - totalBonuses,
      commissionTxnCount: commissionAgg._count,
      bonusTxnCount: bonusAgg._count,
      totalWorkerWalletBalance: Number(workerWallets._sum.walletBalance ?? 0),
      totalWorkers: workerWallets._count,
    };
  }

  async getAllCommissions(page: number, limit: number, workerId?: string) {
    const skip = (page - 1) * limit;
    const where = {
      type: 'COMMISSION_DEBIT' as const,
      ...(workerId ? { workerId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          worker: {
            select: {
              id: true,
              user: { select: { fullName: true, phoneNumber: true } },
            },
          },
        },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllWorkerWallets(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          user: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { phoneNumber: { contains: search } },
            ],
          },
        }
      : {};

    const [workers, total] = await Promise.all([
      this.prisma.workerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { walletBalance: 'asc' },
        select: {
          id: true,
          walletBalance: true,
          currentTier: true,
          isBonusSuspended: true,
          totalJobsCompleted: true,
          averageRating: true,
          user: { select: { fullName: true, phoneNumber: true } },
        },
      }),
      this.prisma.workerProfile.count({ where }),
    ]);

    return {
      data: workers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllBonusRecords(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [items, total] = await Promise.all([
      this.prisma.bonusRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          worker: {
            select: {
              id: true,
              currentTier: true,
              user: { select: { fullName: true, phoneNumber: true } },
            },
          },
        },
      }),
      this.prisma.bonusRecord.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async releaseBonusManually(bonusId: string) {
    const bonus = await this.prisma.bonusRecord.findUnique({
      where: { id: bonusId },
      include: { worker: { select: { id: true, walletBalance: true } } },
    });
    if (!bonus) throw new NotFoundException(`Bonus record ${bonusId} not found`);
    if (bonus.status === 'PAID')
      throw new BadRequestException('Bonus already paid');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bonusRecord.update({
        where: { id: bonusId },
        data: { status: 'PAID' },
      });

      await tx.walletTransaction.create({
        data: {
          workerId: bonus.workerId,
          type: 'BONUS_CREDIT',
          amount: bonus.bonusAmount,
          balanceAfter: Number(bonus.worker.walletBalance) + Number(bonus.bonusAmount),
          description: `Admin-released bonus (window ${bonus.windowIndex})`,
          bonusId: bonus.id,
        },
      });

      await tx.workerProfile.update({
        where: { id: bonus.workerId },
        data: { walletBalance: { increment: bonus.bonusAmount } },
      });

      return updated;
    });
  }

  async rejectBonus(bonusId: string) {
    const bonus = await this.prisma.bonusRecord.findUnique({ where: { id: bonusId } });
    if (!bonus) throw new NotFoundException(`Bonus record ${bonusId} not found`);
    if (bonus.status !== 'PENDING')
      throw new BadRequestException('Only PENDING bonuses can be rejected');

    return this.prisma.bonusRecord.update({
      where: { id: bonusId },
      data: { status: 'REJECTED' },
    });
  }
}
