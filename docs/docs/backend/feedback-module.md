# Feedback Module

**Status:** Planned - To Be Implemented

## Purpose

The Feedback module manages ratings and reviews for completed bookings. It allows customers to rate workers and provides a reputation system for the platform.

## Expected Functionality

### Core Features
- Submit ratings (1-5 stars) for completed bookings
- Write optional review comments
- Calculate and update worker's average rating
- Retrieve worker reviews
- One feedback per booking (prevents duplicate reviews)

### Rating System
```
5 Stars - Excellent
4 Stars - Good
3 Stars - Average
2 Stars - Below Average
1 Star - Poor
```

### Business Logic
- Only customers can leave feedback for workers
- Feedback can only be submitted for COMPLETED bookings
- One feedback per booking (unique constraint)
- Worker's averageRating updates automatically
- Feedback cannot be modified after submission (may allow admin deletion)

## Planned API Endpoints

### Feedback Controller (`/api/feedback`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Submit feedback for booking |
| GET | `/worker/:workerId` | Get all reviews for worker |
| GET | `/booking/:bookingId` | Get feedback for booking |
| GET | `/worker/:workerId/stats` | Get worker rating stats |
| DELETE | `/:id` | Delete feedback (admin only) |

## DTOs to Implement

```typescript
// CreateFeedbackDto
{
  bookingId: string;
  rating: number; // 1-5
  comment?: string;
}

// FeedbackResponseDto
{
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  customer: {
    id: string;
    fullName: string;
    profilePicUrl?: string;
  };
  createdAt: string;
}

// WorkerStatsDto
{
  workerId: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
```

## Database Relations

- `Feedback.booking` → Booking (completed booking)
- `Feedback.user` → User (customer who left review)

## Implementation Notes

### Phase 1 (Basic Reviews)
- [ ] Submit feedback with rating
- [ ] Get worker reviews
- [ ] Average rating calculation

### Phase 2 (Enhanced Reviews)
- [ ] Rating breakdown statistics
- [ ] Photo attachments in reviews (future)
- [ ] Worker response to reviews (future)

### Phase 3 (Advanced)
- [ ] Review verification (verified booking)
- [ ] Helpful/unhelpful review voting
- [ ] Review reporting mechanism
- [ ] Fake review detection

## Dependencies

- **Required Modules:** Bookings, Users, Workers
- **Integrates With:** Notifications (review reminders)

## Security Considerations

- Only customers who completed a booking can review
- Workers cannot review customers (in current design)
- Rating must be between 1-5
- Prevent review spam with rate limiting
- Consider allowing review edits within 24 hours

## Urdu Translation Support

- "Rate Worker" / "کارکن کو ریٹ کریں"
- "Write a Review" / "ریویو لکھیں"
- "Excellent" / "بہترین"
- "Poor" / "کمزور"
- "Rating" / "ریٹنگ"
