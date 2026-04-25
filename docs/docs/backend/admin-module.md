# Admin Module

**Status:** Planned - To Be Implemented

## Purpose

The Admin module provides administrative functionality for platform management. It includes user management, worker verification, dispute resolution, and platform analytics.

## Expected Functionality

### Core Features
- Admin dashboard with platform statistics
- User management (view, block, verify)
- Worker verification approval/rejection
- Complaint/dispute management
- Service category management
- Platform settings configuration
- Activity logs and audit trails

### Admin Levels
```
MODERATOR - Basic moderation tasks
SENIOR_MODERATOR - Handle escalations
SUPER_ADMIN - Full platform access
```

### Business Logic
- Admin profiles are linked to User accounts with ADMIN role
- Admin level determines accessible features
- All admin actions should be logged
- Sensitive operations require SUPER_ADMIN level

## Planned API Endpoints

### Admin Controller (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard statistics |
| GET | `/users` | List all users |
| PUT | `/users/:id/block` | Block/unblock user |
| PUT | `/users/:id/verify` | Verify user |
| GET | `/workers/pending` | Workers awaiting verification |
| PUT | `/workers/:id/verify` | Approve worker |
| PUT | `/workers/:id/reject` | Reject worker |
| GET | `/complaints` | All complaints |
| PUT | `/complaints/:id/resolve` | Resolve complaint |
| GET | `/analytics` | Platform analytics |
| POST | `/services` | Create service category |
| PUT | `/services/:id` | Update service category |

## DTOs to Implement

```typescript
// DashboardStatsDto
{
  totalUsers: number;
  totalWorkers: number;
  totalBookings: number;
  pendingComplaints: number;
  pendingVerifications: number;
  revenueToday: number;
  revenueMonth: number;
}

// VerifyWorkerDto
{
  approved: boolean;
  reviewNotes?: string;
}

// BlockUserDto
{
  blocked: boolean;
  reason?: string;
}

// CreateServiceDto
{
  name: string;
  nameUrdu?: string;
  iconUrl?: string;
}
```

## Database Relations

- `AdminProfile.user` → User (admin account)
- `AdminProfile.complaints` → Complaint[] (handled complaints)

## Implementation Notes

### Phase 1 (Basic Admin)
- [ ] Admin dashboard
- [ ] User listing and blocking
- [ ] Worker verification queue
- [ ] Basic complaint management

### Phase 2 (Enhanced)
- [ ] Service category management
- [ ] Activity logs
- [ ] Bulk operations
- [ ] Export functionality

### Phase 3 (Advanced)
- [ ] Advanced analytics
- [ ] Revenue reports
- [ ] Worker performance metrics
- [ ] Automated moderation rules
- [ ] Multi-admin workflow

## Dependencies

- **Required Modules:** Users, Workers, Complaints, Services
- **Integrates With:** All modules (read access)

## Security Considerations

- Admin authentication required for all endpoints
- Role-based access control (RBAC) based on admin level
- All admin actions must be logged
- Sensitive data access restricted
- Rate limiting on admin endpoints

## Admin Dashboard Metrics

```typescript
interface DashboardStats {
  // Users
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;

  // Workers
  totalWorkers: number;
  verifiedWorkers: number;
  pendingVerifications: number;
  onlineWorkers: number;

  // Bookings
  totalBookings: number;
  bookingsToday: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  disputedBookings: number;

  // Financial
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  pendingPayments: number;

  // Support
  openComplaints: number;
  resolvedComplaintsToday: number;
  averageResolutionTime: number;
}
```

## Urdu Translation Support

- "Admin Dashboard" / "ایڈمن ڈیش بورڈ"
- "Worker Verification" / "کارکن کی تصدیق"
- "Block User" / "یوزر کو بلاک کریں"
- "Complaints" / "شکایات"
- "Analytics" / "تجزیات"
