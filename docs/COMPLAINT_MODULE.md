# Complaint Module Documentation

## Overview

The Complaint module handles dispute resolution between customers and workers. When a booking goes wrong, either party can file a complaint for admin review and resolution.

**Location**: `src/modules/complaints/`

**Priority**: MEDIUM

---

## Files Structure

```
complaints/
├── complaints.module.ts            # Module configuration
├── complaints.controller.ts        # HTTP endpoints (10 endpoints)
├── complaints.service.ts           # Business logic
├── index.ts                        # Barrel exports
├── dto/
│   ├── create-complaint.dto.ts     # File complaint validation
│   ├── update-complaint.dto.ts     # Update complaint
│   └── complaint-response.dto.ts   # Complaint response format
└── enums/
    └── complaint-status.enum.ts    # Complaint status constants
```

---

## Database Schema Reference

```prisma
model Complaint {
  id           String        @id @default(uuid())
  bookingId    String
  adminId      String?
  description  String
  isResolved   Boolean       @default(false)
  createdAt    DateTime      @default(now())
  evidenceUrls String[]
  admin        AdminProfile? @relation(fields: [adminId])
  booking      Booking       @relation(fields: [bookingId], onDelete: Cascade)

  @@index([bookingId])
}
```

---

## Complaint Status Flow

```
┌──────────────┐
│   FILED      │  ← Customer/Worker files complaint
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   REVIEW     │  ← Admin assigned, under review
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  RESOLVED    │  ← Admin made decision
└──────────────┘
```

---

## Valid Complaint Reasons

### Customer Can File For:

| Reason Code | Description |
|-------------|-------------|
| `POOR_QUALITY` | Work quality unsatisfactory |
| `INCOMPLETE_WORK` | Worker left job unfinished |
| `OVERCHARGING` | Worker charged more than agreed |
| `NO_SHOW` | Worker didn't arrive |
| `LATE_ARRIVAL` | Worker arrived very late |
| `UNPROFESSIONAL` | Rude or inappropriate behavior |
| `DAMAGE_PROPERTY` | Worker caused damage |
| `SAFETY_CONCERN` | Unsafe work practices |
| `OTHER` | Custom reason |

### Worker Can File For:

| Reason Code | Description |
|-------------|-------------|
| `NON_PAYMENT` | Customer refused to pay |
| `ABUSIVE_BEHAVIOR` | Customer was abusive |
| `FALSE_INFORMATION` | Job description was misleading |
| `UNSAFE_CONDITIONS` | Work environment unsafe |
| `SCOPE_CHANGE` | Customer demanded extra work |
| `OTHER` | Custom reason |

---

## Endpoints

### Customer Complaint Endpoints

#### 1. File Complaint (Customer)

**Endpoint**: `POST /bookings/:bookingId/complaint`

**Description**: Customer files a complaint about a booking.

**Request Body** (`CreateComplaintDto`):
```typescript
{
  description: string;      // Detailed explanation (min 20 chars)
  reason: string;           // Reason code (see above)
  evidenceUrls?: string[];  // Array of image URLs (max 5)
  expectedResolution?: string;  // What customer wants (refund, re-do, etc.)
}
```

**Response** (`ComplaintResponseDto`):
```typescript
{
  id: string;
  bookingId: string;
  description: string;
  reason: string;
  isResolved: boolean;
  createdAt: DateTime;
  evidenceUrls: string[];
  filedBy: {
    id: string;
    fullName: string;
    role: UserRole;
  };
  booking: {
    id: string;
    status: BookingStatus;
    finalPrice: number;
    service: { name: string };
    worker: { fullName: string };
  };
}
```

**Status Codes**:
- `201 Created` - Complaint filed successfully
- `400 Bad Request` - Invalid data, empty description
- `403 Forbidden` - Not the customer
- `404 Not Found` - Booking not found
- `409 Conflict` - Complaint already exists for this booking

**Business Logic**:
1. Verify booking exists
2. Verify user is the customer
3. Verify booking is in valid state (ACCEPTED, IN_PROGRESS, or COMPLETED)
4. Check no existing complaint for this booking
5. Validate description length and evidence URLs
6. Create complaint
7. Update booking status to DISPUTED
8. Send notifications to worker and admin team
9. Assign to next available admin (round-robin)

**Example**:
```bash
curl -X POST http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/complaint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "description": "Worker completed only half the work and left. The wiring in the kitchen is still not functioning.",
    "reason": "INCOMPLETE_WORK",
    "evidenceUrls": [
      "https://example.com/evidence1.jpg",
      "https://example.com/evidence2.jpg"
    ],
    "expectedResolution": "Full refund and different worker to complete the job"
  }'
```

---

#### 2. Get My Complaints (Customer)

**Endpoint**: `GET /complaints/customer/my-complaints`

**Description**: Get all complaints filed by the customer.

**Query Parameters**:
- `status` (optional): `resolved` | `unresolved` | `all`
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: ComplaintResponseDto[];
  total: number;
}
```

---

#### 3. Get Complaint by ID (Customer)

**Endpoint**: `GET /complaints/customer/:id`

**Description**: Get details of a specific complaint filed by customer.

**Response**: Full complaint details with booking info and any admin responses.

---

#### 4. Update Complaint (Customer)

**Endpoint**: `PUT /complaints/customer/:id`

**Description**: Customer adds more information to their complaint.

**Request Body**:
```typescript
{
  description?: string;
  evidenceUrls?: string[];
  expectedResolution?: string;
  additionalNotes?: string;
}
```

**Status Codes**:
- `200 OK` - Complaint updated
- `403 Forbidden` - Not the filer
- `404 Not Found` - Complaint not found
- `400 Bad Request` - Cannot update resolved complaint

---

### Worker Complaint Endpoints

#### 5. File Complaint (Worker)

**Endpoint**: `POST /bookings/:bookingId/complaint/worker`

**Description**: Worker files a complaint about a customer or booking.

**Request Body**:
```typescript
{
  description: string;
  reason: string;         // Worker reason codes
  evidenceUrls?: string[];
}
```

**Business Logic**: Same as customer filing

**Example**:
```bash
curl -X POST http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/complaint/worker \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <worker_token>" \
  -d '{
    "description": "Customer refused to pay the agreed amount after job completion.",
    "reason": "NON_PAYMENT",
    "evidenceUrls": ["https://example.com/chat-proof.jpg"]
  }'
```

---

#### 6. Get My Complaints (Worker)

**Endpoint**: `GET /complaints/worker/my-complaints`

**Description**: Get all complaints filed by or against the worker.

**Query Parameters**:
- `type` (optional): `filed_by_me` | `filed_against_me` | `all`
- `status` (optional)
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: Array<{
    id: string;
    bookingId: string;
    description: string;
    reason: string;
    isResolved: boolean;
    createdAt: DateTime;
    filedBy: {
      fullName: string;
      role: UserRole;
    };
    // If filed against worker, include admin decision if resolved
    adminDecision?: {
      decision: string;
      resolutionNotes: string;
      resolvedAt: DateTime;
    };
  }>;
  total: number;
}
```

---

### Admin Complaint Endpoints

#### 7. Get All Complaints (Admin)

**Endpoint**: `GET /admin/complaints`

**Description**: Get all complaints for admin review.

**Query Parameters**:
- `status` (optional): `resolved` | `unresolved`
- `assignedTo` (optional): `me` | `others` | `unassigned`
- `priority` (optional): `high` | `medium` | `low`
- `dateRange` (optional)
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: Array<{
    id: string;
    bookingId: string;
    description: string;
    reason: string;
    isResolved: boolean;
    createdAt: DateTime;
    evidenceUrls: string[];
    filedBy: {
      fullName: string;
      role: UserRole;
    };
    booking: {
      service: { name: string };
      customer: { fullName: string };
      worker: { fullName: string };
      finalPrice: number;
    };
    assignedAdmin?: {
      id: string;
      user: { fullName: string };
    };
    priority: 'high' | 'medium' | 'low';
  }>;
  total: number;
  stats: {
    unresolved: number;
    resolved: number;
    avgResolutionTime: number;  // hours
  };
}
```

**Priority Auto-Calculation**:
- `high`: NON_PAYMENT, DAMAGE_PROPERTY, SAFETY_CONCERN, ABUSIVE_BEHAVIOR
- `medium`: POOR_QUALITY, INCOMPLETE_WORK, OVERCHARGING
- `low`: LATE_ARRIVAL, UNPROFESSIONAL, OTHER

---

#### 8. Assign Complaint to Admin

**Endpoint**: `POST /admin/complaints/:id/assign`

**Description**: Assign complaint to specific admin (for team management).

**Request Body**:
```typescript
{
  adminId: string;
}
```

**Response**:
```typescript
{
  complaintId: string;
  assignedTo: string;
  adminName: string;
}
```

---

#### 9. Resolve Complaint (Admin)

**Endpoint**: `POST /admin/complaints/:id/resolve`

**Description**: Admin resolves complaint with decision.

**Request Body** (`ResolveComplaintDto`):
```typescript
{
  decision: 'CUSTOMER_FAVORED' | 'WORKER_FAVORED' | 'PARTIAL_REFUND' | 'FULL_REFUND' | 'NO_ACTION';
  resolutionNotes: string;  // Detailed explanation
  refundAmount?: number;
  penaltyAmount?: number;   // Deducted from worker
  workerAction?: 'WARNING' | 'SUSPENSION' | 'TERMINATION' | 'NONE';
  suspensionDays?: number;
  customerAction?: 'WARNING' | 'REFUND' | 'NONE';
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
  actions: {
    refundProcessed: boolean;
    workerPenalty: number;
    workerStatus: string;
  };
}
```

**Business Logic**:
1. Verify complaint exists and is not resolved
2. Verify admin role
3. Update complaint status
4. Process financial actions:
   - Issue refund to customer (if applicable)
   - Apply penalty to worker (if applicable)
5. Apply worker actions:
   - Send warning notification
   - Suspend worker account
   - Terminate worker account
6. Update booking status
7. Send notifications to both parties
8. Log admin action for audit

**Example**:
```bash
curl -X POST http://localhost:4000/admin/complaints/550e8400-e29b-41d4-a716-446655440000/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "decision": "PARTIAL_REFUND",
    "resolutionNotes": "Worker completed approximately 60% of the agreed work. Customer refunded Rs. 2000. Worker receives warning.",
    "refundAmount": 2000,
    "penaltyAmount": 500,
    "workerAction": "WARNING"
  }'
```

---

#### 10. Add Admin Notes (Internal)

**Endpoint**: `POST /admin/complaints/:id/notes`

**Description**: Admin adds internal notes (not visible to parties).

**Request Body**:
```typescript
{
  note: string;
  isInternal: boolean;  // true = only visible to admins
}
```

---

## DTOs

### CreateComplaintDto

```typescript
import { IsString, IsNotEmpty, IsArray, IsOptional, MaxLength, MinLength, IsUrl } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @MaxLength(5)
  evidenceUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  expectedResolution?: string;
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
  @MaxLength(2000)
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

  @IsOptional()
  @IsEnum(['WARNING', 'REFUND', 'NONE'])
  customerAction?: string;
}
```

---

### ComplaintResponseDto

```typescript
export class ComplaintResponseDto {
  id: string;
  bookingId: string;
  description: string;
  reason: string;
  isResolved: boolean;
  createdAt: DateTime;
  resolvedAt?: DateTime;
  evidenceUrls: string[];

  filedBy: {
    id: string;
    fullName: string;
    role: UserRole;
  };

  assignedAdmin?: {
    id: string;
    adminLevel: string;
    user: { fullName: string };
  };

  booking: {
    id: string;
    status: BookingStatus;
    finalPrice: number;
    service: { name: string };
    customer: { fullName: string };
    worker: { fullName: string };
  };

  resolution?: {
    decision: string;
    resolutionNotes: string;
    resolvedBy: string;
    refundAmount?: number;
    penaltyAmount?: number;
  };
}
```

---

## Service Methods

### `fileComplaint(bookingId: string, filedBy: string, role: UserRole, createComplaintDto: CreateComplaintDto): Promise<ComplaintResponseDto>`

**Business Logic**:
```typescript
async fileComplaint(bookingId: string, filedBy: string, role: UserRole, dto: CreateComplaintDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Verify booking
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, worker: true, service: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // 2. Verify filer is customer or worker
    const isCustomer = role === 'CUSTOMER' && booking.customerId === filedBy;
    const isWorker = role === 'WORKER' && booking.workerId === filedBy;
    if (!isCustomer && !isWorker) throw new ForbiddenException();

    // 3. Check no existing complaint
    const existing = await tx.complaint.findUnique({
      where: { bookingId },
    });
    if (existing) throw new ConflictException('Complaint already exists');

    // 4. Create complaint
    const complaint = await tx.complaint.create({
      data: {
        bookingId,
        description: dto.description,
        reason: dto.reason,
        evidenceUrls: dto.evidenceUrls || [],
      },
    });

    // 5. Update booking status to DISPUTED
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.DISPUTED },
    });

    return complaint;
  });
}
```

---

### `resolveComplaint(complaintId: string, adminId: string, resolution: ResolveComplaintDto): Promise<ComplaintResponseDto>`

Complex method handling financial transactions and user actions.

---

## Admin Assignment Strategies

### Round-Robin (Recommended)

```typescript
async getNextAvailableAdmin(): Promise<string> {
  const admins = await this.prisma.adminProfile.findMany({
    where: { user: { isBlocked: false } },
    include: {
      _count: {
        select: {
          complaints: {
            where: { isResolved: false },
          },
        },
      },
    },
  });

  // Admin with fewest unresolved complaints
  return admins.reduce((min, admin) =>
    admin._count.complaints < min._count.complaints ? admin : min
  ).id;
}
```

---

## Notifications

| Event | Notify Who | Message |
|-------|------------|---------|
| Complaint filed | Other party | "Complaint filed for booking #[id]" |
| Complaint filed | Admin team | "New complaint requires review" |
| Admin assigned | Both parties | "Admin [name] assigned to your case" |
| Complaint resolved | Both parties | "Complaint resolved: [decision summary]" |
| Worker penalized | Worker | "Penalty applied: [amount]. Reason: [reason]" |
| Refund issued | Customer | "Refund of Rs. [amount] processed" |

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid data, description too short |
| `NotFoundException` | 404 | Booking or complaint not found |
| `ForbiddenException` | 403 | Not authorized to file/view |
| `ConflictException` | 409 | Complaint already exists |

---

## SLA Targets (Future Enhancement)

| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| High | 2 hours | 24 hours |
| Medium | 8 hours | 72 hours |
| Low | 24 hours | 7 days |

Track admin performance against SLAs.

---

## Future Enhancements

1. **Multi-party complaints** - Both parties can file, linked together
2. **Evidence upload endpoint** - Direct file upload (not just URLs)
3. **Chat mediation room** - Real-time admin-customer-worker chat
4. **Automated decisions** - AI-suggested resolutions based on history
5. **Appeal process** - Party can appeal admin decision
6. **Compensation templates** - Standard refund amounts by complaint type
7. **Worker strike system** - 3 warnings = suspension
8. **Customer rating impact** - Frequent complainers flagged
9. **Scheduled callbacks** - Admin can schedule phone calls
10. **Integration with payment** - Auto-process refunds

---

## Related Modules

- **Bookings Module** - Complaints tied to bookings
- **Admin Module** - Admin resolution workflow
- **Notification Module** - Complaint notifications
- **Feedback Module** - Alternative for minor issues
- **Message Module** - Communication history as evidence
