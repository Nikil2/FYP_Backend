# Reviews & Ratings UI Module

**Status:** Planned - To Be Implemented

## Purpose

The Reviews & Ratings UI module allows customers to rate and review workers after completed bookings, and enables all users to view worker ratings and reviews to make informed decisions.

## Expected Functionality

### Core Features
- Submit star ratings (1-5)
- Write review comments
- View worker reviews list
- Rating breakdown display
- Review submission after completed bookings
- Photo attachments in reviews (future)

### Review Interface
```
┌─────────────────────────────────────┐
│  Rate Your Experience               │
├─────────────────────────────────────┤
│  How was your experience with       │
│  Muhammad Ali (Electrician)?        │
│                                     │
│  ⭐⭐⭐⭐⭐                             │
│  (Tap to rate)                      │
│                                     │
│  Tell us more (optional):           │
│  ┌─────────────────────────────┐   │
│  │ Write your review here...   │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]              [Submit]     │
└─────────────────────────────────────┘
```

### Worker Rating Display
```
┌─────────────────────────────────────┐
│  ⭐ 4.8 (124 reviews)               │
│  ████████████████████░ 92%          │
├─────────────────────────────────────┤
│  Rating Breakdown                   │
│  5★ ████████████████████  95        │
│  4★ ████░░░░░░░░░░░░░░░░  18        │
│  3★ ██░░░░░░░░░░░░░░░░░░   8        │
│  2★ ░░░░░░░░░░░░░░░░░░░░   2        │
│  1★ ░░░░░░░░░░░░░░░░░░░░   1        │
├─────────────────────────────────────┤
│  Recent Reviews                     │
│  ┌─────────────────────────────┐   │
│  │ ⭐⭐⭐⭐⭐                      │   │
│  │ "Excellent work! Very        │   │
│  │  professional and on time."  │   │
│  │ - Ahmed Khan | 2 days ago    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Planned Components

```
src/components/reviews/
├── RatingStars.tsx            # Interactive star display
├── RatingDisplay.tsx          # Read-only rating
├── RatingBreakdown.tsx        # Distribution bars
├── ReviewForm.tsx             # Submit review
├── ReviewCard.tsx             # Single review display
├── ReviewsList.tsx            # All reviews
├── ReviewPrompt.tsx           # "Rate your experience" modal
└── WorkerRating.tsx           # Worker rating summary
```

## Component Props

```typescript
// RatingStarsProps
interface RatingStarsProps {
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ReviewFormProps
interface ReviewFormProps {
  bookingId: string;
  workerName: string;
  onSubmit: (rating: number, comment?: string) => void;
  onCancel: () => void;
}

// ReviewCardProps
interface ReviewCardProps {
  review: Review;
  showBookingInfo?: boolean;
}

// Review type
interface Review {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  customer: {
    fullName: string;
    profilePicUrl?: string;
  };
  createdAt: string;
}
```

## Star Rating Component

```typescript
// Interactive star rating
const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  onRate,
  readonly = false,
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className="text-2xl"
        >
          {star <= (hoverRating || rating) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
};
```

## Implementation Notes

### Phase 1 (Basic Reviews)
- [ ] Star rating component
- [ ] Review form modal
- [ ] Submit review functionality
- [ ] Review list display

### Phase 2 (Enhanced)
- [ ] Rating breakdown visualization
- [ ] Worker rating summary card
- [ ] Review prompts after booking
- [ ] Empty states

### Phase 3 (Advanced)
- [ ] Photo attachments
- [ ] Helpful/unhelpful voting
- [ ] Worker responses
- [ ] Review reporting
- [ ] Verified booking badge

## API Integration

```typescript
// Reviews API service
const reviewsApi = {
  submitReview: (data) => apiClient.post('/api/feedback', data),
  getWorkerReviews: (workerId) => apiClient.get(`/api/feedback/worker/${workerId}`),
  getBookingReview: (bookingId) => apiClient.get(`/api/feedback/booking/${bookingId}`),
  getWorkerStats: (workerId) => apiClient.get(`/api/feedback/worker/${workerId}/stats`),
};

// Review submission
const handleSubmit = async (rating: number, comment?: string) => {
  try {
    await reviewsApi.submitReview({
      bookingId,
      rating,
      comment,
    });
    onSuccess();
  } catch (error) {
    onError('Failed to submit review');
  }
};
```

## Dependencies

- **API Endpoints:** `/api/feedback`, `/api/bookings`
- **UI Components:** Button, Modal, Card, Avatar, Badge
- **Hooks:** useAuth

## Urdu Translation Support

- "Rate Worker" / "کارکن کو ریٹ کریں"
- "Write a Review" / "ریویو لکھیں"
- "Excellent" / "بہترین"
- "Very Good" / "بہت اچھا"
- "Average" / "اوسط"
- "Below Average" / "اوسط سے کم"
- "Poor" / "کمزور"
- "Submit" / "جمع کرائیں"
- "Cancel" / "منسوخ کریں"
- "Reviews" / "ریویوز"
- "Rating" / "ریٹنگ"
