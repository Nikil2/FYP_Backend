# Bookings Module Documentation

## Overview

The Bookings module is the **core** of the marketplace platform. It handles the complete booking lifecycle from customer request to job completion, including price negotiation, worker assignment, and status management.

**Location**: `src/modules/bookings/`

**Priority**: HIGH

---

## Files Structure

```
bookings/
├── bookings.module.ts              # Module configuration
├── bookings.controller.ts          # HTTP endpoints (15+ endpoints)
├── bookings.service.ts             # Business logic
├── index.ts                        # Barrel exports
├── dto/
│   ├── create-booking.dto.ts       # Create booking validation
│   ├── update-booking.dto.ts       # Update booking data
│   ├── booking-response.dto.ts     # Booking response format
│   └── price-proposal.dto.ts       # Price negotiation DTOs
└── enums/
    └── booking-status.enum.ts      # BookingStatus constants
```

---

## Database Schema Reference

```prisma
model Booking {
  id          String          @id @default(uuid())
  customerId  String
  workerId    String
  serviceId   Int
  description String
  jobAddress  String
  jobLat      Float
  jobLng      Float
  status      BookingStatus   @default(PENDING)
  finalPrice  Decimal?        @db.Decimal(10, 2)
  scheduledAt DateTime?
  createdAt   DateTime        @default(now())
  customer    User            @relation("CustomerBookings")
  service     Service         @relation(fields: [serviceId])
  worker      WorkerProfile   @relation("WorkerJobs")
  complaints  Complaint[]
  feedback    Feedback?
  messages    Message[]
  proposals   PriceProposal[]

  @@index([customerId])
  @@index([workerId])
}

model PriceProposal {
  id         String          @id @default(uuid())
  bookingId  String
  proposedBy String
  amount     Decimal         @db.Decimal(10, 2)
  status     ProposalStatus  @default(PENDING)
  createdAt  DateTime        @default(now())
  parentId   String?
  booking    Booking         @relation(fields: [bookingId])
  parent     PriceProposal?  @relation("Counters")
  counters   PriceProposal[] @relation("Counters")

  @@index([bookingId])
}
```

---

## Booking Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKING STATUS FLOW                          │
└─────────────────────────────────────────────────────────────────┘

  PENDING ──→ NEGOTIATION ──→ ACCEPTED ──→ IN_PROGRESS ──→ COMPLETED
     │              │              │              │
     │              │              │              │
     ↓              ↓              ↓              ↓
  CANCELLED     REJECTED     CANCELLED      DISPUTED
                                         (→ Complaint Module)
```

### Status Descriptions

| Status | Description | Who Can Set |
|--------|-------------|-------------|
| `PENDING` | Initial state when customer creates booking | Customer |
| `NEGOTIATION` | Price discussion phase (proposals being sent) | System (auto) |
| `ACCEPTED` | Worker accepted the job at agreed price | Worker |
| `IN_PROGRESS` | Worker has started the job | Worker |
| `COMPLETED` | Job finished, awaiting customer confirmation | Customer |
| `CANCELLED` | Booking cancelled by either party | Customer/Worker/Admin |
| `DISPUTED` | Customer raised complaint, needs admin | System (auto) |

---

## Proposal Status Flow

```
  PENDING ──→ ACCEPTED
     │
     ├──→ REJECTED
     │
     └──→ COUNTERED (new proposal created)
```

---

## Endpoints

### Customer Booking Endpoints

#### 1. Create Booking

**Endpoint**: `POST /bookings`

**Description**: Customer creates a new booking request.

**Request Body** (`CreateBookingDto`):
```typescript
{
  workerId: string;           // UUID of selected worker
  serviceId: number;          // Service category ID
  description: string;        // Job description (min 10 chars)
  jobAddress: string;         // Full job location address
  jobLat: number;             // Job location latitude
  jobLng: number;             // Job location longitude
  scheduledAt?: string;       // Optional: ISO 8601 datetime
  initialPrice?: number;      // Optional: Customer's initial offer
}
```

**Response** (`BookingResponseDto`):
```typescript
{
  id: string;
  customerId: string;
  workerId: string;
  serviceId: number;
  description: string;
  jobAddress: string;
  jobLat: number;
  jobLng: number;
  status: BookingStatus;
  finalPrice: number | null;
  scheduledAt: DateTime | null;
  createdAt: DateTime;

  // Relations
  customer: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  worker: {
    id: string;
    fullName: string;
    averageRating: number;
    verificationStatus: VerificationStatus;
  };
  service: {
    id: number;
    name: string;
    iconUrl?: string;
  };

  // Latest proposal
  latestProposal: {
    id: string;
    amount: number;
    proposedBy: string;
    status: ProposalStatus;
    createdAt: DateTime;
  } | null;
}
```

**Status Codes**:
- `201 Created` - Booking created successfully
- `400 Bad Request` - Invalid data (coordinates, service ID)
- `404 Not Found` - Worker or service not found
- `403 Forbidden` - Worker not verified/approved

**Business Logic**:
1. Validate worker exists and is APPROVED
2. Validate service exists
3. Validate coordinates (-90 to 90, -180 to 180)
4. Check worker's availability (if WorkerSchedule implemented)
5. Create booking with status PENDING
6. Send notification to worker

**Example**:
```bash
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "workerId": "550e8400-e29b-41d4-a716-446655440000",
    "serviceId": 1,
    "description": "Need to fix wiring in kitchen. Lights not working.",
    "jobAddress": "House 123, Street 45, F-10/2, Islamabad",
    "jobLat": 33.6844,
    "jobLng": 73.0479,
    "scheduledAt": "2026-04-25T10:00:00Z",
    "initialPrice": 2000
  }'
```

---

#### 2. Get Customer's Bookings

**Endpoint**: `GET /bookings/customer/my-bookings`

**Description**: Get all bookings for the authenticated customer.

**Query Parameters**:
- `status` (optional) - Filter by status
- `skip` (optional, default: 0)
- `take` (optional, default: 10)

**Response**:
```typescript
{
  data: BookingResponseDto[];
  total: number;
  hasMore: boolean;
}
```

**Example**:
```bash
curl "http://localhost:4000/bookings/customer/my-bookings?status=PENDING&skip=0&take=10" \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Get Booking by ID (Customer)

**Endpoint**: `GET /bookings/customer/:id`

**Description**: Get specific booking details for customer.

**Response** (`BookingResponseDto`): Complete booking with messages, proposals, and worker info.

**Status Codes**:
- `200 OK` - Success
- `403 Forbidden` - Not the customer who made this booking
- `404 Not Found` - Booking not found

---

#### 4. Cancel Booking (Customer)

**Endpoint**: `POST /bookings/customer/:id/cancel`

**Description**: Customer cancels a booking.

**Request Body**:
```typescript
{
  reason?: string;  // Optional cancellation reason
}
```

**Status Codes**:
- `200 OK` - Booking cancelled
- `400 Bad Request` - Cannot cancel completed/in-progress job
- `403 Forbidden` - Not authorized
- `404 Not Found` - Booking not found

**Business Logic**:
- Can only cancel PENDING, NEGOTIATION, or ACCEPTED bookings
- Cannot cancel IN_PROGRESS or COMPLETED (must use Complaint module)

---

#### 5. Accept Final Price (Customer)

**Endpoint**: `POST /bookings/customer/:id/accept-price`

**Description**: Customer accepts worker's final price proposal.

**Request Body**:
```typescript
{
  proposalId: string;  // The proposal to accept
}
```

**Status Codes**:
- `200 OK` - Price accepted, booking moves to ACCEPTED
- `400 Bad Request` - Invalid proposal or not customer's proposal
- `403 Forbidden` - Not authorized

---

#### 6. Mark Job Complete (Customer)

**Endpoint**: `POST /bookings/customer/:id/complete`

**Description**: Customer confirms job is complete.

**Request Body**:
```typescript
{
  feedback?: {
    rating: number;       // 1-5
    comment?: string;
  };
}
```

**Status Codes**:
- `200 OK` - Job marked complete
- `400 Bad Request` - Job not in IN_PROGRESS status
- `403 Forbidden` - Not authorized

**Business Logic**:
1. Verify booking status is IN_PROGRESS
2. Update status to COMPLETED
3. Increment worker's totalJobsCompleted
4. Recalculate worker's averageRating
5. Create Feedback if provided

---

### Worker Booking Endpoints

#### 7. Get Worker's Bookings

**Endpoint**: `GET /bookings/worker/my-bookings`

**Description**: Get all bookings for the authenticated worker.

**Query Parameters**:
- `status` (optional) - Filter by status
- `skip` (optional, default: 0)
- `take` (optional, default: 10)

**Response**: Same as customer's bookings

**Example**:
```bash
curl "http://localhost:4000/bookings/worker/my-bookings?status=ACCEPTED" \
  -H "Authorization: Bearer <token>"
```

---

#### 8. Get Booking by ID (Worker)

**Endpoint**: `GET /bookings/worker/:id`

**Description**: Get specific booking details for worker.

**Status Codes**:
- `200 OK` - Success
- `403 Forbidden` - Not the assigned worker
- `404 Not Found` - Booking not found

---

#### 9. Send Price Proposal (Worker)

**Endpoint**: `POST /bookings/worker/:id/proposal`

**Description**: Worker sends a price proposal to customer.

**Request Body** (`PriceProposalDto`):
```typescript
{
  amount: number;         // Proposed price (must be > 0)
  parentId?: string;      // If countering, ID of proposal being countered
}
```

**Response**:
```typescript
{
  id: string;
  bookingId: string;
  proposedBy: string;     // Worker's userId
  amount: number;
  status: ProposalStatus;
  createdAt: DateTime;
}
```

**Status Codes**:
- `201 Created` - Proposal sent
- `400 Bad Request` - Invalid amount or booking not in NEGOTIATION
- `403 Forbidden` - Not the assigned worker

**Business Logic**:
1. Verify booking status is PENDING or NEGOTIATION
2. If first proposal, change status to NEGOTIATION
3. Create PriceProposal record
4. Send notification to customer
5. If countered, update parent proposal status to COUNTERED

**Example**:
```bash
curl -X POST http://localhost:4000/bookings/worker/550e8400-e29b-41d4-a716-446655440000/proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 3500
  }'
```

---

#### 10. Accept Booking (Worker)

**Endpoint**: `POST /bookings/worker/:id/accept`

**Description**: Worker accepts the booking (after price is agreed).

**Request Body**:
```typescript
{
  finalPrice: number;  // Agreed upon price
}
```

**Status Codes**:
- `200 OK` - Booking accepted
- `400 Bad Request` - No accepted proposal or price mismatch
- `403 Forbidden` - Not authorized

**Business Logic**:
1. Verify there's an ACCEPTED proposal
2. Update booking status to ACCEPTED
3. Set finalPrice

---

#### 11. Start Job (Worker)

**Endpoint**: `POST /bookings/worker/:id/start`

**Description**: Worker marks job as in progress.

**Status Codes**:
- `200 OK` - Job started
- `400 Bad Request` - Booking not in ACCEPTED status
- `403 Forbidden` - Not authorized

---

#### 12. Complete Job (Worker)

**Endpoint**: `POST /bookings/worker/:id/mark-done`

**Description**: Worker marks job as done, awaiting customer confirmation.

**Status Codes**:
- `200 OK` - Job marked done
- `400 Bad Request` - Booking not in IN_PROGRESS status
- `403 Forbidden` - Not authorized

**Business Logic**:
- Sends notification to customer to confirm completion

---

#### 13. Reject Booking (Worker)

**Endpoint**: `POST /bookings/worker/:id/reject`

**Description**: Worker rejects the booking request.

**Request Body**:
```typescript
{
  reason?: string;  // Rejection reason
}
```

**Status Codes**:
- `200 OK` - Booking rejected
- `400 Bad Request` - Cannot reject accepted/completed job
- `403 Forbidden` - Not authorized

---

### Admin Booking Endpoints

#### 14. Get All Bookings (Admin)

**Endpoint**: `GET /bookings/admin/all`

**Description**: Admin view of all bookings with filters.

**Query Parameters**:
- `status` (optional)
- `customerId` (optional)
- `workerId` (optional)
- `serviceId` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: BookingResponseDto[];
  total: number;
  filters: {
    status?: string;
    customerId?: string;
    workerId?: string;
    // ...
  };
}
```

---

#### 15. Force Cancel Booking (Admin)

**Endpoint**: `POST /bookings/admin/:id/cancel`

**Description**: Admin forcibly cancels a booking (for disputes).

**Request Body**:
```typescript
{
  reason: string;
  refundAmount?: number;
}
```

**Status Codes**:
- `200 OK` - Booking cancelled
- `403 Forbidden` - Not admin
- `404 Not Found` - Booking not found

---

#### 16. Get Booking Statistics (Admin)

**Endpoint**: `GET /bookings/admin/statistics`

**Description**: Get platform booking statistics.

**Query Parameters**:
- `startDate` (optional)
- `endDate` (optional)

**Response**:
```typescript
{
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  disputedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  byStatus: Record<BookingStatus, number>;
  byService: Array<{
    serviceId: number;
    serviceName: string;
    count: number;
  }>;
}
```

---

## DTOs

### CreateBookingDto

```typescript
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, MinLength, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  workerId: string;

  @IsNumber()
  @IsNotEmpty()
  serviceId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsString()
  @IsNotEmpty()
  jobAddress: string;

  @IsNumber()
  @IsLatitude()
  @IsNotEmpty()
  @Type(() => Number)
  jobLat: number;

  @IsNumber()
  @IsLongitude()
  @IsNotEmpty()
  @Type(() => Number)
  jobLng: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  initialPrice?: number;
}
```

---

### PriceProposalDto

```typescript
import { IsNumber, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceProposalDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}
```

---

### BookingResponseDto

```typescript
import { BookingStatus } from '@prisma/client';

export class BookingResponseDto {
  id: string;
  customerId: string;
  workerId: string;
  serviceId: number;
  description: string;
  jobAddress: string;
  jobLat: number;
  jobLng: number;
  status: BookingStatus;
  finalPrice: number | null;
  scheduledAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;

  // Relations
  customer: {
    id: string;
    fullName: string;
    phoneNumber: string;
    profilePicUrl?: string;
  };
  worker: {
    id: string;
    fullName: string;
    averageRating: number;
    verificationStatus: VerificationStatus;
    profilePicUrl?: string;
  };
  service: {
    id: number;
    name: string;
    iconUrl?: string;
  };
  latestProposal: PriceProposalDto | null;
  messagesCount: number;
}
```

---

## Service Methods

### `createBooking(createBookingDto: CreateBookingDto, customerId: string): Promise<BookingResponseDto>`

Creates a new booking:
1. Validate worker exists and is APPROVED
2. Validate service exists
3. Validate coordinates
4. Create booking with status PENDING
5. Create initial PriceProposal if initialPrice provided
6. Send notification to worker

**Throws**:
- `BadRequestException` - Invalid data
- `NotFoundException` - Worker or service not found
- `ForbiddenException` - Worker not verified

---

### `getBookingById(bookingId: string, userId: string, role: UserRole): Promise<BookingResponseDto>`

Retrieves booking by ID with authorization check:
- Customer can view their own bookings
- Worker can view their assigned bookings
- Admin can view all

**Throws**:
- `NotFoundException` - Booking not found
- `ForbiddenException` - Not authorized

---

### `getCustomerBookings(customerId: string, filters: BookingFilters): Promise<PagedResponse<BookingResponseDto>>`

---

### `getWorkerBookings(workerId: string, filters: BookingFilters): Promise<PagedResponse<BookingResponseDto>>`

---

### `sendPriceProposal(bookingId: string, workerId: string, amount: number, parentId?: string): Promise<PriceProposal>`

**Business Logic**:
1. Verify booking status is PENDING or NEGOTIATION
2. Verify worker is assigned to booking
3. If first proposal, update status to NEGOTIATION
4. If parentId provided, update parent to COUNTERED
5. Create new proposal

**Throws**:
- `BadRequestException` - Invalid booking status
- `ForbiddenException` - Not the assigned worker

---

### `acceptPriceProposal(bookingId: string, customerId: string, proposalId: string): Promise<Booking>`

**Business Logic**:
1. Verify customer is booking owner
2. Verify proposal belongs to booking
3. Update proposal status to ACCEPTED
4. Update booking status to ACCEPTED
5. Set finalPrice

---

### `startJob(bookingId: string, workerId: string): Promise<Booking>`

---

### `completeJob(bookingId: string, customerId: string, feedback?: FeedbackDto): Promise<Booking>`

**Business Logic**:
1. Verify status is IN_PROGRESS
2. Update to COMPLETED
3. Increment worker's totalJobsCompleted
4. Update worker's averageRating
5. Create Feedback if provided
6. Send notification to worker

---

### `cancelBooking(bookingId: string, userId: string, role: UserRole, reason?: string): Promise<Booking>`

**Business Logic**:
1. Verify user is authorized (customer, worker, or admin)
2. Verify booking can be cancelled (not COMPLETED)
3. Update status to CANCELLED
4. Send notification to other party

---

## Booking Guards & Authorization

| Endpoint | Required Role | Authorization Check |
|----------|--------------|---------------------|
| POST /bookings | CUSTOMER | Authenticated customer |
| GET /bookings/customer/* | CUSTOMER | User ID matches booking.customerId |
| POST /bookings/worker/* | WORKER | User ID matches booking.workerId |
| GET /bookings/worker/* | WORKER | User ID matches booking.workerId |
| GET /bookings/admin/* | ADMIN | Admin role check |

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid data, invalid status transition |
| `NotFoundException` | 404 | Booking, worker, or service not found |
| `ForbiddenException` | 403 | Not authorized, worker not verified |
| `ConflictException` | 409 | Invalid state transition |

---

## Common Status Transitions

### Valid Transitions Table

| From Status | To Status | Who | Condition |
|-------------|-----------|-----|-----------|
| PENDING | NEGOTIATION | System | First proposal sent |
| PENDING | CANCELLED | Customer | Before acceptance |
| NEGOTIATION | ACCEPTED | Customer | Price agreed |
| NEGOTIATION | CANCELLED | Customer/Worker | Negotiation failed |
| ACCEPTED | IN_PROGRESS | Worker | Job started |
| ACCEPTED | CANCELLED | Customer | Before worker starts |
| IN_PROGRESS | COMPLETED | Customer | Job confirmed done |
| IN_PROGRESS | DISPUTED | Customer | Issue raised |
| COMPLETED | - | - | Terminal state |
| CANCELLED | - | - | Terminal state |
| DISPUTED | RESOLVED | Admin | Complaint resolved |

---

## Notifications to Send

| Event | Notify Who | Message |
|-------|------------|---------|
| Booking created | Worker | "New booking request from [Customer]" |
| Proposal sent | Customer | "[Worker] sent a price proposal" |
| Proposal accepted | Worker | "Customer accepted your proposal" |
| Booking accepted | Customer | "[Worker] accepted your booking" |
| Job started | Customer | "[Worker] has started the job" |
| Job marked done | Customer | "Job completed. Please confirm." |
| Job confirmed | Worker | "Customer confirmed job completion" |
| Booking cancelled | Other party | "Booking cancelled: [reason]" |

---

## Future Enhancements

1. **Automatic worker matching** - Suggest nearby workers
2. **Recurring bookings** - Weekly/monthly schedules
3. **Multi-worker bookings** - Team jobs
4. **Booking templates** - Save common booking types
5. **Estimated duration** - Based on service type
6. **Advance payment** - Partial upfront payment
7. **Cancellation fees** - For late cancellations
8. **Booking reminders** - SMS/Push before scheduled time

---

## Related Modules

- **Messages Module** - Communication per booking
- **PriceProposal Module** - Price negotiation (may be separate or part of bookings)
- **Feedback Module** - Ratings after completion
- **Complaint Module** - Dispute resolution
- **Notification Module** - Push notifications
- **Workers Module** - Worker selection
- **Services Module** - Service categories
