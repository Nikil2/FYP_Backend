# Customer Dashboard Module

**Status:** Planned - To Be Implemented

## Purpose

The Customer Dashboard module provides a centralized interface for customers to manage their bookings, view order history, track active jobs, and access account settings.

## Expected Functionality

### Core Features
- View active and past bookings
- Track booking status in real-time
- Quick rebooking functionality
- Notification center access
- Saved locations management
- Payment history
- Quick access to support/complaints

### Dashboard Sections
```
┌─────────────────────────────────────┐
│  Welcome Back, [Customer Name]      │
├─────────────────────────────────────┤
│  Active Bookings (3)                │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Card │ │Card │ │Card │           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  Recent Activity                    │
│  - Booking #123 status updated      │
│  - New message from Electrician     │
│  - Payment received                 │
├─────────────────────────────────────┤
│  Quick Actions                      │
│  [Book New Service] [View All]      │
└─────────────────────────────────────┘
```

## Planned Components

### Page: `/customer/dashboard` (or `/customer`)

```
src/app/customer/
├── page.tsx                 # Main dashboard page
├── layout.tsx               # Customer layout with navbar
└── components/
    ├── DashboardShell.tsx   # Main container
    ├── ActiveBookings.tsx   # Active bookings grid
    ├── BookingCard.tsx      # Individual booking card
    ├── RecentActivity.tsx   # Activity timeline
    ├── QuickActions.tsx     # CTA buttons
    ├── StatsOverview.tsx    # Booking stats
    └── NotificationsPanel.tsx
```

## Component Props

```typescript
// DashboardProps
interface DashboardProps {
  customer: Customer;
  activeBookings: Booking[];
  recentActivity: Activity[];
  notifications: Notification[];
}

// BookingCardProps
interface BookingCardProps {
  booking: Booking;
  onTrack: (bookingId: string) => void;
  onMessage: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
}

// ActivityItem
interface Activity {
  id: string;
  type: 'STATUS_CHANGE' | 'MESSAGE' | 'PAYMENT' | 'REVIEW';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}
```

## Implementation Notes

### Phase 1 (Basic Dashboard)
- [ ] Dashboard layout shell
- [ ] Active bookings display
- [ ] Booking status badges
- [ ] Quick actions buttons

### Phase 2 (Enhanced)
- [ ] Real-time status updates
- [ ] Activity timeline
- [ ] Notification badges
- [ ] Stats overview

### Phase 3 (Advanced)
- [ ] Personalized recommendations
- [ ] Frequently used services
- [ ] Favorite workers
- [ ] Spending analytics

## Dependencies

- **API Endpoints:** `/api/bookings/customer/my`, `/api/notifications`, `/api/users/me`
- **UI Components:** Button, Card, Badge, Avatar
- **Hooks:** useServices, useAuth

## Routing

```
/customer              → Dashboard home
/customer/orders       → All orders list
/customer/orders/:id   → Order detail
/customer/profile      → Profile settings
/customer/locations    → Saved locations
/customer/notifications → Notifications center
/customer/rewards      → Loyalty/rewards (future)
```

## Urdu Translation Support

- "Dashboard" / "ڈیش بورڈ"
- "Active Bookings" / "فعال بکنگز"
- "Recent Activity" / "حالیہ سرگرمی"
- "Quick Actions" / "فوری اقدامات"
- "Book Now" / "ابھی بک کریں"
- "View All" / "سب دیکھیں"
