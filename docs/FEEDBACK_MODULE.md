# Feedback Module Documentation

## Overview

The Feedback module handles customer ratings and reviews for completed bookings. It allows customers to rate workers and provide feedback, which contributes to the worker's overall rating and reputation on the platform.

**Location**: `src/modules/feedback/`

**Priority**: MEDIUM

---

## Files Structure

```
feedback/
├── feedback.module.ts              # Module configuration
├── feedback.controller.ts          # HTTP endpoints (8 endpoints)
├── feedback.service.ts             # Business logic
├── index.ts                        # Barrel exports
├── dto/
│   ├── create-feedback.dto.ts      # Create review validation
│   ├── update-feedback.dto.ts      # Update review
│   └── feedback-response.dto.ts    # Feedback response format
└── guards/
    └── feedback.guard.ts           # Can only review own completed bookings
```

---

## Database Schema Reference

```prisma
model Feedback {
  id        String   @id @default(uuid())
  bookingId String   @unique
  userId    String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
  booking   Booking  @relation(fields: [bookingId], onDelete: Cascade)
  user      User     @relation(fields: [userId])
}
```

**Key Constraints**:
- `bookingId` is unique - One feedback per booking
- `rating` is 1-5 (integer)
- Only customer can create feedback for their booking
- Feedback can only be created after booking is COMPLETED

---

## Rating System

### Rating Scale

| Rating | Meaning | Color |
|--------|---------|-------|
| 5 | Excellent | Green |
| 4 | Good | Blue |
| 3 | Average | Yellow |
| 2 | Poor | Orange |
| 1 | Terrible | Red |

### Worker Rating Calculation

```typescript
averageRating = sum(all ratings) / total(count of ratings)
```

- Stored in `WorkerProfile.averageRating` (Decimal, 2 digits, 1 decimal place)
- Updated on every new feedback
- Rounded to 1 decimal place (e.g., 4.3)

---

## Endpoints

### Customer Feedback Endpoints

#### 1. Create Feedback (Submit Review)

**Endpoint**: `POST /bookings/:bookingId/feedback`

**Description**: Customer submits a rating and review for a completed booking.

**Request Body** (`CreateFeedbackDto`):
```typescript
{
  rating: number;       // 1-5 (required)
  comment?: string;     // Optional review text (max 500 chars)
}
```

**Response** (`FeedbackResponseDto`):
```typescript
{
  id: string;
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: DateTime;
  worker: {
    id: string;
    fullName: string;
    averageRating: number;  // Updated rating
    totalJobsCompleted: number;
  };
}
```

**Status Codes**:
- `201 Created` - Feedback submitted successfully
- `400 Bad Request` - Invalid rating (not 1-5), comment too long
- `403 Forbidden` - Not the customer, or booking not completed
- `404 Not Found` - Booking not found
- `409 Conflict` - Feedback already submitted for this booking

**Business Logic**:
1. Verify booking exists
2. Verify user is the customer who made the booking
3. Verify booking status is COMPLETED
4. Check feedback doesn't already exist (one per booking)
5. Validate rating (1-5) and comment length
6. Create feedback record
7. Update worker's `averageRating`
8. Increment worker's `totalJobsCompleted`
9. Send notification to worker

**Example**:
```bash
curl -X POST http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "rating": 5,
    "comment": "Excellent work! Fixed the wiring issue quickly and professionally."
  }'
```

---

#### 2. Get Feedback for Booking

**Endpoint**: `GET /bookings/:bookingId/feedback`

**Description**: Get feedback details for a specific booking.

**Response** (`FeedbackResponseDto`):
```typescript
{
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: DateTime;
  customer: {
    id: string;
    fullName: string;
    profilePicUrl?: string;
  };
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - No feedback for this booking

**Example**:
```bash
curl http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/feedback \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Get My Given Feedback

**Endpoint**: `GET /feedback/customer/my-reviews`

**Description**: Get all feedback submitted by the authenticated customer.

**Query Parameters**:
- `skip` (optional, default: 0)
- `take` (optional, default: 10)
- `rating` (optional) - Filter by rating given

**Response**:
```typescript
{
  data: Array<{
    id: string;
    bookingId: string;
    rating: number;
    comment?: string;
    createdAt: DateTime;
    worker: {
      id: string;
      fullName: string;
    };
    service: {
      id: number;
      name: string;
    };
  }>;
  total: number;
}
```

---

### Worker Feedback Endpoints

#### 4. Get My Reviews (Worker)

**Endpoint**: `GET /feedback/worker/my-reviews`

**Description**: Get all reviews received by the authenticated worker.

**Query Parameters**:
- `skip` (optional, default: 0)
- `take` (optional, default: 10)
- `rating` (optional) - Filter by rating
- `sortBy` (optional): `rating` | `createdAt`
- `order` (optional): `asc` | `desc`

**Response**:
```typescript
{
  data: Array<{
    id: string;
    bookingId: string;
    rating: number;
    comment?: string;
    createdAt: DateTime;
    customer: {
      id: string;
      fullName: string;
    };
    service: {
      id: number;
      name: string;
    };
    booking: {
      finalPrice: number;
      completedAt: DateTime;
    };
  }>;
  total: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
```

**Example**:
```bash
curl "http://localhost:4000/feedback/worker/my-reviews?skip=0&take=20&rating=5" \
  -H "Authorization: Bearer <token>"
```

---

#### 5. Get Worker's Public Profile (With Reviews)

**Endpoint**: `GET /workers/:workerId/reviews`

**Description**: Get public view of worker's reviews (for customer viewing before booking).

**Query Parameters**:
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: DateTime;
    customerName: string;      // First name only, or anonymized
    customerInitial: string;   // First letter of name
    service: {
      name: string;
    };
  }>;
  total: number;
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    recommendationPercentage: number;  // % of 4-5 star reviews
  };
}
```

**Privacy Notes**:
- Customer full name hidden (show "Ahmed K." or "Customer")
- No contact information visible
- Only shows reviews for APPROVED workers

**Example**:
```bash
curl "http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000/reviews?skip=0&take=10"
```

---

### Admin Feedback Endpoints

#### 6. Get All Feedback (Admin)

**Endpoint**: `GET /admin/feedback`

**Description**: Admin view of all feedback with filters.

**Query Parameters**:
- `workerId` (optional)
- `customerId` (optional)
- `rating` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `skip` (optional)
- `take` (optional)

**Response**: Full feedback data (including all details for moderation)

---

#### 7. Delete Feedback (Admin)

**Endpoint**: `DELETE /admin/feedback/:id`

**Description**: Admin deletes inappropriate feedback.

**Request Body**:
```typescript
{
  reason: string;  // Required: Reason for deletion
}
```

**Status Codes**:
- `200 OK` - Feedback deleted
- `404 Not Found` - Feedback not found
- `403 Forbidden` - Not admin

**Business Logic**:
1. Verify admin role
2. Log deletion reason (audit trail)
3. Delete feedback
4. Recalculate worker's averageRating
5. Decrement worker's totalJobsCompleted
6. Notify worker of deletion (optional)

**Example**:
```bash
curl -X DELETE http://localhost:4000/admin/feedback/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "reason": "Feedback contains inappropriate language"
  }'
```

---

#### 8. Update Feedback (Customer - Limited)

**Endpoint**: `PUT /feedback/:id`

**Description**: Customer updates their own feedback (within time limit).

**Request Body**:
```typescript
{
  rating?: number;    // 1-5
  comment?: string;   // Max 500 chars
}
```

**Status Codes**:
- `200 OK` - Feedback updated
- `400 Bad Request` - Invalid data
- `403 Forbidden` - Not the author
- `404 Not Found` - Feedback not found
- `409 Conflict` - Edit window expired (e.g., 7 days)

**Business Logic**:
1. Verify user is feedback author
2. Check within edit window (e.g., 7 days from creation)
3. Update fields
4. Recalculate worker's rating if rating changed

**Time Limit Rationale**:
- Prevents rating manipulation after long periods
- Worker's rating reflects recent work quality

---

## DTOs

### CreateFeedbackDto

```typescript
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
```

---

### UpdateFeedbackDto

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedbackDto } from './create-feedback.dto';

export class UpdateFeedbackDto extends PartialType(CreateFeedbackDto) {}
```

---

### FeedbackResponseDto

```typescript
export class FeedbackResponseDto {
  id: string;
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: DateTime;

  // Relations (conditional based on endpoint)
  customer?: {
    id: string;
    fullName: string;
    profilePicUrl?: string;
  };
  worker?: {
    id: string;
    fullName: string;
    averageRating: number;
  };
  booking?: {
    finalPrice: number;
    service: { name: string };
  };
}
```

---

## Service Methods

### `createFeedback(bookingId: string, customerId: string, createFeedbackDto: CreateFeedbackDto): Promise<FeedbackResponseDto>`

**Business Logic**:
```typescript
async createFeedback(bookingId: string, customerId: string, dto: CreateFeedbackDto) {
  // 1. Verify booking
  const booking = await this.prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: true, customer: true, service: true },
  });

  if (!booking) throw new NotFoundException('Booking not found');
  if (booking.customerId !== customerId) throw new ForbiddenException();
  if (booking.status !== BookingStatus.COMPLETED) {
    throw new BadRequestException('Booking not completed yet');
  }

  // 2. Check feedback doesn't exist
  const existing = await this.prisma.feedback.findUnique({
    where: { bookingId },
  });
  if (existing) throw new ConflictException('Feedback already exists');

  // 3. Create feedback and update worker in transaction
  const result = await this.prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({
      data: {
        bookingId,
        userId: customerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // 4. Update worker stats
    const allFeedback = await tx.feedback.findMany({
      where: { booking: { workerId: booking.workerId } },
      select: { rating: true },
    });

    const averageRating = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;

    await tx.workerProfile.update({
      where: { id: booking.workerId },
      data: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalJobsCompleted: { increment: 1 },
      },
    });

    return feedback;
  });

  // 5. Send notification to worker
  await this.notificationService.sendWorkerNotification(booking.workerId, {
    title: 'New Review Received',
    body: `You received a ${dto.rating}-star review from ${booking.customer.fullName}`,
  });

  return result;
}
```

---

### `getWorkerReviews(workerId: string, skip: number, take: number): Promise<WorkerReviewsResponseDto>`

Returns paginated reviews with summary statistics.

---

### `deleteFeedback(feedbackId: string, adminId: string, reason: string): Promise<void>`

**Business Logic**:
1. Find feedback
2. Get workerId from associated booking
3. Delete feedback
4. Recalculate worker rating
5. Log admin action

---

### `recalculateWorkerRating(workerId: string): Promise<void>`

Utility method to recalculate worker's average rating (useful for data correction).

---

## Rating Distribution

Example calculation:

```typescript
{
  5: 45,   // 45 five-star reviews
  4: 30,   // 30 four-star reviews
  3: 15,   // 15 three-star reviews
  2: 5,    // 5 two-star reviews
  1: 5,    // 5 one-star reviews
}

// Recommendation percentage = (5-star + 4-star) / total * 100
// = (45 + 30) / 100 * 100 = 75%
```

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid rating, comment too long |
| `NotFoundException` | 404 | Booking or feedback not found |
| `ForbiddenException` | 403 | Not authorized, not customer |
| `ConflictException` | 409 | Feedback already exists, edit window expired |

---

## Notifications

| Event | Notify Who | Message |
|-------|------------|---------|
| New feedback submitted | Worker | "New review: [rating] stars from [Customer]" |
| Feedback deleted (admin) | Customer | "Your review was removed: [reason]" |

---

## Rating Badges (Frontend Display)

Based on average rating, show badges:

| Rating Range | Badge | Color |
|--------------|-------|-------|
| 4.5 - 5.0 | Top Rated | Gold |
| 4.0 - 4.4 | Excellent | Green |
| 3.5 - 3.9 | Good | Blue |
| 3.0 - 3.4 | Average | Yellow |
| Below 3.0 | Needs Improvement | Orange |

---

## Review Highlights (Future Enhancement)

Allow customers to select positive tags:

```typescript
{
  tags: ['ON_TIME', 'PROFESSIONAL', 'QUALITY_WORK', 'FAIR_PRICING', 'RECOMMENDED'];
}
```

Display as:
- ⏰ On Time
- 👔 Professional
- ⭐ Quality Work
- 💰 Fair Pricing
- ✅ Recommended

---

## Moderation Rules

**Auto-flag feedback for review if**:
- Contains profanity (filter list)
- Rating is 1-star with aggressive language
- Customer has pattern of low ratings
- Worker disputes the review

**Admin can remove feedback for**:
- Inappropriate language
- Discriminatory content
- Personal attacks
- Irrelevant content (e.g., about platform, not service)
- Fake/spam reviews

---

## Future Enhancements

1. **Photo attachments** - Customer can add photos of completed work
2. **Worker response** - Worker can publicly reply to reviews
3. **Verified review badge** - Mark reviews from verified completed bookings
4. **Helpful votes** - Other users can vote if review was helpful
5. **Review analytics** - Worker dashboard with rating trends
6. **Automated reminders** - Prompt customer to review after completion
7. **Review templates** - Suggest common phrases for customers
8. **Sentiment analysis** - Auto-detect negative reviews for priority support
9. **Review import** - Allow workers to import from other platforms
10. **Video testimonials** - Short video reviews

---

## Related Modules

- **Bookings Module** - Feedback tied to completed bookings
- **Workers Module** - Worker rating updates
- **Complaint Module** - Escalate bad experiences
- **Admin Module** - Moderation capabilities
- **Notification Module** - Review notifications
