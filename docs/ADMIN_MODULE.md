# Admin Module Documentation

## Overview

The Admin module handles administrator operations including worker verification, complaint resolution, user management, and platform analytics. Admins have elevated privileges to manage the marketplace.

**Location**: `src/modules/admin/`

**Priority**: HIGH

---

## Files Structure

```
admin/
├── admin.module.ts                 # Module configuration
├── admin.controller.ts             # HTTP endpoints (12+ endpoints)
├── admin.service.ts                # Business logic
├── index.ts                        # Barrel exports
├── dto/
│   ├── verify-worker.dto.ts        # Worker verification decision
│   ├── resolve-complaint.dto.ts    # Complaint resolution
│   ├── admin-response.dto.ts       # Admin profile response
│   └── statistics.dto.ts           # Platform statistics
└── guards/
    └── admin.guard.ts              # Admin role guard
```

---

## Database Schema Reference

```prisma
model AdminProfile {
  id         String      @id @default(uuid())
  userId     String      @unique
  adminLevel String      @default("MODERATOR")
  user       User        @relation(fields: [userId], onDelete: Cascade)
  complaints Complaint[]
}

enum UserRole {
  ADMIN
  CUSTOMER
  WORKER
}
```

---

## Admin Levels

| Level | Permissions |
|-------|-------------|
| `SUPER_ADMIN` | Full access: users, workers, complaints, settings, analytics |
| `ADMIN` | Most operations: workers, complaints, users (not settings) |
| `MODERATOR` | Limited: complaints, basic user actions |

---

## Endpoints

### Worker Verification Endpoints

#### 1. Get Pending Verifications

**Endpoint**: `GET /admin/workers/pending`

**Description**: Get all workers awaiting verification approval.

**Query Parameters**:
- `skip` (optional, default: 0)
- `take` (optional, default: 20)
- `sortBy` (optional): `createdAt` | `experienceYears` | `name`
- `order` (optional): `asc` | `desc`

**Response**:
```typescript
{
  data: Array<{
    workerId: string;
    userId: string;
    fullName: string;
    phoneNumber: string;
    cnicNumber: string;
    cnicFrontUrl: string;
    cnicBackUrl: string;
    selfieImageUrl?: string;
    experienceYears: number;
    visitingCharges: number;
    bio?: string;
    homeAddress: string;
    services: Array<{ id: number; name: string }>;
    portfolio: Array<{ imageUrl: string; description?: string }>;
    createdAt: DateTime;
  }>;
  total: number;
}
```

**Authorization**: ADMIN or SUPER_ADMIN only

**Example**:
```bash
curl "http://localhost:4000/admin/workers/pending?skip=0&take=20" \
  -H "Authorization: Bearer <admin_token>"
```

---

#### 2. Approve Worker

**Endpoint**: `POST /admin/workers/:workerId/approve`

**Description**: Approve a worker's verification request.

**Request Body**:
```typescript
{
  reviewNotes?: string;  // Optional internal notes
}
```

**Response**:
```typescript
{
  workerId: string;
  verificationStatus: 'APPROVED';
  message: string;
}
```

**Business Logic**:
1. Verify worker exists and status is PENDING
2. Update verificationStatus to APPROVED
3. Save review notes (internal, not visible to worker)
4. Send approval notification to worker
5. Optionally: Send welcome SMS/email

**Status Codes**:
- `200 OK` - Worker approved
- `400 Bad Request` - Worker already verified/rejected
- `404 Not Found` - Worker not found

**Example**:
```bash
curl -X POST http://localhost:4000/admin/workers/550e8400-e29b-41d4-a716-446655440000/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewNotes": "All documents verified. Approved for electrical work."
  }'
```

---

#### 3. Reject Worker

**Endpoint**: `POST /admin/workers/:workerId/reject`

**Description**: Reject a worker's verification request.

**Request Body** (`RejectWorkerDto`):
```typescript
{
  reason: string;       // Required: Reason for rejection
  reviewNotes?: string; // Optional: Internal notes
}
```

**Response**:
```typescript
{
  workerId: string;
  verificationStatus: 'REJECTED';
  reason: string;
  message: string;
}
```

**Business Logic**:
1. Verify worker exists and status is PENDING
2. Update verificationStatus to REJECTED
3. Save rejection reason (visible to worker)
4. Send rejection notification with reason
5. Worker can reapply with corrected documents

**Status Codes**:
- `200 OK` - Worker rejected
- `400 Bad Request` - Worker already verified/rejected
- `404 Not Found` - Worker not found

**Example**:
```bash
curl -X POST http://localhost:4000/admin/workers/550e8400-e29b-41d4-a716-446655440000/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "reason": "CNIC image is blurry. Please upload a clear photo.",
    "reviewNotes": "Front CNIC unclear, selfie does not match CNIC photo"
  }'
```

---

#### 4. Get Worker Verification History

**Endpoint**: `GET /admin/workers/:workerId/verification-history`

**Description**: Get complete verification history for a worker (submissions, approvals, rejections).

**Response**:
```typescript
{
  workerId: string;
  currentStatus: VerificationStatus;
  history: Array<{
    action: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    timestamp: DateTime;
    reason?: string;      // If rejected
    reviewNotes?: string; // Internal notes
    adminName?: string;   // Admin who reviewed
  }>;
}
```

---

### Complaint Management Endpoints

#### 5. Get All Complaints

**Endpoint**: `GET /admin/complaints`

**Description**: Get all complaints with filters.

**Query Parameters**:
- `status` (optional): `resolved` | `unresolved`
- `bookingId` (optional)
- `customerId` (optional)
- `workerId` (optional)
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: Array<{
    id: string;
    bookingId: string;
    description: string;
    isResolved: boolean;
    createdAt: DateTime;
    evidenceUrls: string[];
    customer: {
      id: string;
      fullName: string;
      phoneNumber: string;
    };
    worker: {
      id: string;
      fullName: string;
      phoneNumber: string;
    };
    service: {
      id: number;
      name: string;
    };
    assignedAdmin?: {
      id: string;
      adminLevel: string;
    };
  }>;
  total: number;
  unresolvedCount: number;
}
```

**Example**:
```bash
curl "http://localhost:4000/admin/complaints?status=unresolved&skip=0&take=20" \
  -H "Authorization: Bearer <admin_token>"
```

---

#### 6. Get Complaint by ID

**Endpoint**: `GET /admin/complaints/:id`

**Description**: Get detailed complaint information.

**Response**:
```typescript
{
  id: string;
  bookingId: string;
  description: string;
  isResolved: boolean;
  createdAt: DateTime;
  evidenceUrls: string[];
  customer: { /* full customer object */ };
  worker: { /* full worker object */ };
  booking: {
    id: string;
    status: BookingStatus;
    finalPrice: number;
    description: string;
    service: { name: string };
  };
  messages: Array<{
    id: string;
    content: string;
    senderName: string;
    createdAt: DateTime;
  }>;  // Recent messages for context
}
```

---

#### 7. Assign Complaint to Admin

**Endpoint**: `POST /admin/complaints/:id/assign`

**Description**: Assign a complaint to a specific admin (for team management).

**Request Body**:
```typescript
{
  adminId: string;  // Admin to assign to
}
```

**Response**:
```typescript
{
  complaintId: string;
  assignedTo: string;
  assignedAdminName: string;
}
```

---

#### 8. Resolve Complaint

**Endpoint**: `POST /admin/complaints/:id/resolve`

**Description**: Mark complaint as resolved with decision.

**Request Body** (`ResolveComplaintDto`):
```typescript
{
  decision: 'CUSTOMER_FAVORED' | 'WORKER_FAVORED' | 'PARTIAL_REFUND' | 'FULL_REFUND' | 'NO_ACTION';
  resolutionNotes: string;  // Explanation of decision
  refundAmount?: number;    // If refund is issued
  penaltyAmount?: number;   // Penalty on worker
  workerAction?: 'WARNING' | 'SUSPENSION' | 'TERMINATION' | 'NONE';
  suspensionDays?: number;  // If suspension
}
```

**Response**:
```typescript
{
  complaintId: string;
  isResolved: true;
  resolvedAt: DateTime;
  resolvedBy: string;
  decision: string;
  resolutionNotes: string;
}
```

**Business Logic**:
1. Update complaint status to resolved
2. Save resolution details
3. Execute decision:
   - Process refund if applicable
   - Apply worker penalty/suspension if applicable
   - Update booking status if needed
4. Send notifications to both parties
5. Log admin action

**Example**:
```bash
curl -X POST http://localhost:4000/admin/complaints/550e8400-e29b-41d4-a716-446655440000/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "decision": "PARTIAL_REFUND",
    "resolutionNotes": "Worker completed 50% of work. Refunding Rs. 1500 to customer.",
    "refundAmount": 1500,
    "penaltyAmount": 500,
    "workerAction": "WARNING"
  }'
```

---

#### 9. Add Evidence to Complaint

**Endpoint**: `POST /admin/complaints/:id/evidence`

**Description**: Admin adds additional evidence to complaint (internal notes, screenshots).

**Request Body**:
```typescript
{
  evidenceUrl: string;
  description?: string;
  isVisibleToParties: boolean;  // Whether parties can see this evidence
}
```

---

### User Management Endpoints

#### 10. Get All Users (Admin View)

**Endpoint**: `GET /admin/users`

**Description**: Get all users with advanced filters.

**Query Parameters**:
- `role` (optional): `CUSTOMER` | `WORKER` | `ADMIN`
- `isVerified` (optional): `true` | `false`
- `isBlocked` (optional): `true` | `false`
- `search` (optional): Search by name or phone
- `sortBy` (optional): `createdAt` | `fullName` | `phoneNumber`
- `skip` (optional)
- `take` (optional)

**Response**: Extended user list with additional admin fields

---

#### 11. Block User (Admin)

**Endpoint**: `POST /admin/users/:id/block`

**Description**: Block a user account.

**Request Body**:
```typescript
{
  reason: string;
  duration?: number;  // Days (optional, null = permanent)
}
```

**Note**: Also available in Users module, but admin version includes reason tracking.

---

#### 12. Impersonate User (SUPER_ADMIN)

**Endpoint**: `POST /admin/users/:id/impersonate`

**Description**: Generate a temporary token to act as the user (for debugging/support).

**Response**:
```typescript
{
  token: string;
  expiresAt: DateTime;
  originalAdminId: string;
}
```

**Security**:
- Logs impersonation action
- Token expires in 15 minutes
- All actions logged with original admin ID
- SUPER_ADMIN only

---

### Platform Analytics Endpoints

#### 13. Get Platform Statistics

**Endpoint**: `GET /admin/statistics`

**Description**: Get comprehensive platform analytics.

**Query Parameters**:
- `period` (optional): `today` | `week` | `month` | `year` | `all`
- `startDate` (optional)
- `endDate` (optional)

**Response**:
```typescript
{
  overview: {
    totalUsers: number;
    totalWorkers: number;
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
  };
  bookings: {
    byStatus: Record<BookingStatus, number>;
    byService: Array<{ serviceId: number; name: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
  };
  workers: {
    pendingVerifications: number;
    approved: number;
    rejected: number;
    topRated: Array<{ workerId: string; name: string; rating: number }>;
  };
  revenue: {
    total: number;
    thisMonth: number;
    averageBookingValue: number;
  };
  complaints: {
    total: number;
    resolved: number;
    pending: number;
    averageResolutionTime: number;  // hours
  };
  users: {
    newThisMonth: number;
    activeCustomers: number;
    activeWorkers: number;
  };
}
```

---

#### 14. Get Revenue Report

**Endpoint**: `GET /admin/revenue`

**Description**: Get detailed revenue report.

**Query Parameters**:
- `startDate`
- `endDate`
- `groupBy` (optional): `day` | `week` | `month`

**Response**:
```typescript
{
  totalRevenue: number;
  platformFees: number;
  refunds: number;
  netRevenue: number;
  breakdown: Array<{
    period: string;
    revenue: number;
    bookings: number;
    average: number;
  }>;
}
```

---

#### 15. Export Data (SUPER_ADMIN)

**Endpoint**: `POST /admin/export`

**Description**: Export platform data for analysis.

**Request Body**:
```typescript
{
  type: 'users' | 'workers' | 'bookings' | 'complaints' | 'revenue';
  format: 'csv' | 'json' | 'xlsx';
  filters: {
    startDate?: string;
    endDate?: string;
    // ... type-specific filters
  };
}
```

**Response**:
```typescript
{
  exportId: string;
  status: 'processing' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt: DateTime;
}
```

**Process**:
1. Create export job (async)
2. Send notification when ready
3. Download from URL (expires in 24 hours)

---

## DTOs

### VerifyWorkerDto

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class VerifyWorkerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}
```

---

### RejectWorkerDto

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectWorkerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}
```

---

### ResolveComplaintDto

```typescript
import { IsEnum, IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveComplaintDto {
  @IsEnum(['CUSTOMER_FAVORED', 'WORKER_FAVORED', 'PARTIAL_REFUND', 'FULL_REFUND', 'NO_ACTION'])
  @IsNotEmpty()
  decision: string;

  @IsString()
  @IsNotEmpty()
  resolutionNotes: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  refundAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  penaltyAmount?: number;

  @IsOptional()
  @IsEnum(['WARNING', 'SUSPENSION', 'TERMINATION', 'NONE'])
  workerAction?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  suspensionDays?: number;
}
```

---

## Admin Guards

### AdminGuard

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return user && user.role === 'ADMIN';
  }
}
```

### SuperAdminGuard

```typescript
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return user && user.adminLevel === 'SUPER_ADMIN';
  }
}
```

---

## Service Methods

### `getPendingVerifications(skip: number, take: number): Promise<WorkerVerificationDto[]>`

---

### `approveWorker(workerId: string, reviewNotes?: string): Promise<WorkerResponseDto>`

**Business Logic**:
1. Find worker by ID
2. Verify status is PENDING
3. Update to APPROVED
4. Send notification
5. Log admin action

---

### `rejectWorker(workerId: string, reason: string, reviewNotes?: string): Promise<WorkerResponseDto>`

---

### `resolveComplaint(complaintId: string, resolution: ResolveComplaintDto, adminId: string): Promise<ComplaintResponseDto>`

**Complex Business Logic**:
1. Find complaint
2. Verify not already resolved
3. Update complaint status
4. Process refund (if applicable)
5. Apply worker penalty (if applicable)
6. Update booking status (if needed)
7. Send notifications
8. Log admin action

---

### `getPlatformStatistics(filters: StatisticsFilters): Promise<PlatformStatisticsDto>`

---

## Audit Logging

All admin actions should be logged:

```prisma
model AdminAuditLog {
  id        String   @id @default(uuid())
  adminId   String
  action    String
  resource  String
  resourceId String?
  details   Json?
  timestamp DateTime @default(now())
  ipAddress String?
}
```

**Logged Actions**:
- Worker approval/rejection
- Complaint resolution
- User block/unblock
- Refund processing
- Data export
- Impersonation

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid data, already processed |
| `NotFoundException` | 404 | Resource not found |
| `ForbiddenException` | 403 | Insufficient admin level |
| `UnauthorizedException` | 401 | Not authenticated |

---

## Notifications

| Event | Notify Who | Message |
|-------|------------|---------|
| Worker approved | Worker | "Your verification has been approved" |
| Worker rejected | Worker | "Verification rejected: [reason]" |
| Complaint resolved | Customer + Worker | "Complaint resolved: [decision]" |
| User blocked | User | "Account blocked: [reason]" |

---

## Future Enhancements

1. **Admin dashboard** - Real-time metrics, charts
2. **Bulk actions** - Approve/reject multiple workers
3. **Worker categories** - Assign service specializations
4. **Automated verification** - AI-based CNIC verification
5. **SLA tracking** - Monitor complaint resolution time
6. **Admin shift scheduling** - Coverage management
7. **Internal notes** - Threaded discussions on complaints
8. **Escalation workflow** - Multi-level dispute resolution
9. **Performance reports** - Worker/customer analytics
10. **Geofencing** - Service area management

---

## Related Modules

- **Workers Module** - Worker verification
- **Complaint Module** - Dispute resolution
- **Users Module** - User management
- **Bookings Module** - Booking oversight
- **Notification Module** - Admin notifications
