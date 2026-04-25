# Admin Dashboard Module

**Status:** Planned - To Be Implemented

## Purpose

The Admin Dashboard module provides a comprehensive administrative interface for platform management, including user management, worker verification, dispute resolution, and analytics.

## Expected Functionality

### Core Features
- Platform overview with key metrics
- User management (view, block, verify)
- Worker verification approval/rejection
- Complaint/dispute management
- Service category management
- Revenue and analytics reports
- Activity logs

### Admin Levels & Access
```
MODERATOR:
  - View users and workers
  - Handle basic complaints
  - Block/unblock users

SENIOR_MODERATOR:
  - All MODERATOR permissions
  - Approve/reject worker verification
  - Handle escalated complaints
  - Manage service categories

SUPER_ADMIN:
  - All permissions
  - Admin management
  - Platform settings
  - Revenue reports
```

## Planned Pages

```
src/app/admin/
├── page.tsx                 # Dashboard home with stats
├── layout.tsx               # Admin layout with sidebar
├── users/
│   └── page.tsx            # User management
├── workers/
│   ├── page.tsx            # Worker list
│   └── verification/
│       └── page.tsx        # Pending verifications
├── complaints/
│   ├── page.tsx            # All complaints
│   └── [id]/page.tsx       # Complaint detail
├── services/
│   └── page.tsx            # Service categories
├── analytics/
│   └── page.tsx            # Analytics & reports
├── revenue/
│   └── page.tsx            # Revenue reports
└── settings/
    └── page.tsx            # Platform settings
```

## Components

```
src/components/admin/
├── DashboardShell.tsx       # Admin container with sidebar
├── Sidebar.tsx              # Navigation sidebar
├── StatsCards.tsx           # Dashboard stat cards
├── UsersTable.tsx           # User management table
├── WorkersTable.tsx         # Workers list
├── VerificationQueue.tsx    # Pending verifications
├── ComplaintsTable.tsx      # Complaints list
├── ComplaintDetail.tsx      # Single complaint view
├── RevenueChart.tsx         # Revenue graphs
├── ActivityLog.tsx          # Recent activity
└── ServiceCategories.tsx    # Category management
```

## Dashboard Metrics

```typescript
interface AdminDashboardStats {
  // Users
  totalUsers: number;
  newUsersToday: number;
  blockedUsers: number;

  // Workers
  totalWorkers: number;
  verifiedWorkers: number;
  pendingVerifications: number;
  onlineWorkers: number;

  // Bookings
  totalBookings: number;
  bookingsToday: number;
  activeBookings: number;
  disputedBookings: number;

  // Financial
  revenueToday: number;
  revenueMonth: number;
  pendingPayouts: number;

  // Support
  openComplaints: number;
  avgResolutionTime: string;
}
```

## Implementation Notes

### Phase 1 (Basic Admin)
- [ ] Admin layout with sidebar
- [ ] Dashboard stats cards
- [ ] User listing with block action
- [ ] Worker verification queue

### Phase 2 (Enhanced)
- [ ] Complaint management
- [ ] Service category CRUD
- [ ] Basic analytics charts
- [ ] Activity logs

### Phase 3 (Advanced)
- [ ] Advanced analytics
- [ ] Export functionality
- [ ] Multi-admin support
- [ ] Role management
- [ ] Audit trail viewer

## Security Considerations

- Admin authentication required
- Role-based access control (RBAC)
- All admin actions logged
- Session timeout for security
- Sensitive data masking

## API Integration

```typescript
// Admin API service
const adminApi = {
  getDashboard: () => apiClient.get('/api/admin/dashboard'),
  getUsers: (params) => apiClient.get('/api/admin/users', params),
  blockUser: (id, reason) => apiClient.put(`/api/admin/users/${id}/block`, { reason }),
  getPendingVerifications: () => apiClient.get('/api/admin/workers/pending'),
  verifyWorker: (id, approved, notes) => apiClient.put(`/api/admin/workers/${id}/verify`, { approved, notes }),
  getComplaints: () => apiClient.get('/api/admin/complaints'),
  resolveComplaint: (id, resolution) => apiClient.put(`/api/admin/complaints/${id}/resolve`, resolution),
};
```

## Urdu Translation Support

- "Admin Dashboard" / "ایڈمن ڈیش بورڈ"
- "User Management" / "یوزر مینجمنٹ"
- "Worker Verification" / "کارکن کی تصدیق"
- "Complaints" / "شکایات"
- "Analytics" / "تجزیات"
- "Revenue" / "آمدنی"
- "Settings" / "ترتیبات"
