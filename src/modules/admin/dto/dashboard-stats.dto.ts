export class DashboardStatsDto {
  totalUsers: number;
  totalWorkers: number;
  verifiedWorkers: number;
  pendingVerifications: number;
  totalBookings: number;
  bookingsToday: number;
  activeComplaints: number;
  monthlyRevenue: number;
  averageWorkerRating: number;
  onlineWorkers: number;
  blockedWorkers: number;
  flaggedReviews: number;
}

export class DashboardActivityDto {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}

export class WorkerQualityDto {
  workerId: string;
  workerName: string;
  rating: number;
  totalReviews: number;
  completedJobs: number;
  verificationStatus: string;
}

export class DashboardResponseDto {
  stats: DashboardStatsDto;
  recentActivity: DashboardActivityDto[];
  workerQuality: WorkerQualityDto[];
  openComplaints: number;
  pendingPayouts: number;
  averageResolutionTime: string;
}
