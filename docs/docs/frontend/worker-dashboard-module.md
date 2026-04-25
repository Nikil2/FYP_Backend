# Worker Dashboard Module

**Status:** Planned - To Be Implemented

## Purpose

The Worker Dashboard module provides a comprehensive interface for workers to manage their profile, view and accept job requests, track earnings, and manage availability.

## Expected Functionality

### Core Features
- View pending and active job requests
- Accept/reject booking requests
- Earnings overview and wallet
- Profile management
- Availability schedule
- Portfolio management
- Performance metrics (ratings, completion rate)

### Dashboard Sections
```
┌─────────────────────────────────────┐
│  Welcome, [Worker Name]             │
│  ⭐ 4.8 (124 reviews) | Verified   │
├─────────────────────────────────────┤
│  Today's Earnings: Rs. 2,500        │
│  Pending Requests: 3                │
│  Active Jobs: 1                     │
├─────────────────────────────────────┤
│  Pending Requests                   │
│  ┌─────────────────────────────┐   │
│  │ Customer | Service | Price  │   │
│  │ [Accept] [Reject] [Counter] │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Quick Actions                      │
│  [Toggle Online] [View Schedule]    │
└─────────────────────────────────────┘
```

## Planned Components

### Page: `/worker/dashboard`

```
src/app/worker/dashboard/
├── page.tsx                 # Main dashboard page
├── layout.tsx               # Worker dashboard layout
├── profile/
│   └── page.tsx            # Profile management
├── orders/
│   ├── page.tsx            # All orders list
│   └── [id]/page.tsx       # Order detail
├── wallet/
│   └── page.tsx            # Earnings & payouts
└── settings/
    └── page.tsx            # Settings & preferences
```

### Components

```
src/components/worker-dashboard/
├── DashboardShell.tsx       # Main container
├── PendingRequests.tsx      # Pending job cards
├── RequestCard.tsx          # Individual request
├── EarningsOverview.tsx     # Stats cards
├── AvailabilityToggle.tsx   # Online/offline switch
├── PerformanceMetrics.tsx   # Rating, completion rate
├── TodaySchedule.tsx        # Today's jobs
└── QuickStats.tsx           # Summary stats
```

## Component Props

```typescript
// WorkerDashboardProps
interface WorkerDashboardProps {
  worker: WorkerProfile;
  pendingRequests: Booking[];
  activeJobs: Booking[];
  earnings: {
    today: number;
    week: number;
    month: number;
    pending: number;
  };
  stats: {
    averageRating: number;
    totalReviews: number;
    completionRate: number;
    totalJobs: number;
  };
}

// PendingRequestProps
interface PendingRequestProps {
  booking: Booking;
  onAccept: (bookingId: string, amount?: number) => void;
  onReject: (bookingId: string, reason?: string) => void;
  onCounter: (bookingId: string, amount: number) => void;
}
```

## Implementation Notes

### Phase 1 (Basic Dashboard)
- [ ] Dashboard layout (no navbar/footer)
- [ ] Pending requests list
- [ ] Accept/reject functionality
- [ ] Basic stats display

### Phase 2 (Enhanced)
- [ ] Price counter-offer modal
- [ ] Earnings breakdown
- [ ] Online/offline toggle
- [ ] Schedule integration

### Phase 3 (Advanced)
- [ ] Real-time request notifications
- [ ] Auto-accept rules
- [ ] Performance analytics
- [ ] Payout requests

## State Management

```typescript
// Worker dashboard state
const [isOnline, setIsOnline] = useState(false);
const [pendingCount, setPendingCount] = useState(0);
const [earnings, setEarnings] = useState<EarningsData>();

// Polling for new requests (or WebSocket)
useEffect(() => {
  const interval = setInterval(fetchPendingRequests, 30000); // 30s
  return () => clearInterval(interval);
}, []);
```

## Dependencies

- **API Endpoints:** `/api/workers/me`, `/api/bookings/worker/my`, `/api/proposals`, `/api/wallet`
- **UI Components:** Button, Card, Badge, Avatar, Modal
- **Hooks:** useWorkerRegistration

## Routing

```
/worker/dashboard         → Dashboard home
/worker/dashboard/orders  → All orders
/worker/dashboard/orders/:id → Order detail
/worker/dashboard/profile → Profile edit
/worker/dashboard/wallet  → Earnings & payouts
/worker/dashboard/settings → Settings
```

## Urdu Translation Support

- "Dashboard" / "ڈیش بورڈ"
- "Pending Requests" / "زیر التواء درخواستیں"
- "Accept" / "قبول کریں"
- "Reject" / "رد کریں"
- "Counter Offer" / "کاؤنٹر آفر"
- "Earnings" / "کمائی"
- "Online" / "آن لائن"
- "Verified" / "تصدیق شدہ"
