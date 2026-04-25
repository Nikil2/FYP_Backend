# Notifications UI Module

**Status:** Planned - To Be Implemented

## Purpose

The Notifications UI module displays platform notifications to users, allowing them to stay informed about booking updates, messages, payments, and system announcements.

## Expected Functionality

### Core Features
- Display notification list
- Unread count badge
- Mark as read (single/all)
- Delete notifications
- Notification categories
- Push notification handling
- Deep linking from notifications

### Notification Display
```
┌─────────────────────────────────────┐
│  Notifications (3 unread)           │
│  [Mark all as read]                 │
├─────────────────────────────────────┤
│  🔔 New Booking Request             │
│     You have a new booking from     │
│     Muhammad Ali for Electrician    │
│     5 minutes ago         [Unread]  │
├─────────────────────────────────────┤
│  💬 New Message                     │
│     Customer: "When can you come?"  │
│     1 hour ago            [Unread]  │
├─────────────────────────────────────┤
│  ✅ Booking Completed               │
│     Your booking #123 is completed  │
│     2 hours ago           [Read]    │
└─────────────────────────────────────┘
```

## Planned Components

```
src/components/notifications/
├── NotificationsPanel.tsx     # Full panel/drawer
├── NotificationsList.tsx      # Scrollable list
├── NotificationItem.tsx       # Single notification
├── NotificationBadge.tsx      # Unread count badge
├── NotificationIcon.tsx       # Type-based icons
├── EmptyNotifications.tsx     # Empty state
└── NotificationSettings.tsx   # Preferences (future)
```

## Component Props

```typescript
// NotificationsPanelProps
interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onNotificationClick: (notification: Notification) => void;
}

// NotificationItemProps
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

// Notification type
interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data?: {
    bookingId?: string;
    userId?: string;
    // Deep link data
  };
}
```

## Notification Types

```typescript
enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',       // 🔔 New booking
  BOOKING_UPDATED = 'BOOKING_UPDATED',       // 📝 Status change
  BOOKING_ACCEPTED = 'BOOKING_ACCEPTED',     // ✅ Worker accepted
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',   // ✅ Job done
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',     // 💬 New message
  PROPOSAL_RECEIVED = 'PROPOSAL_RECEIVED',   // 💰 New offer
  PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED',   // ✅ Offer accepted
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',     // 💵 Payment
  VERIFICATION_UPDATE = 'VERIFICATION_UPDATE', // ✅ Verified
  COMPLAINT_FILED = 'COMPLAINT_FILED',       // ⚠️ Dispute
  COMPLAINT_RESOLVED = 'COMPLAINT_RESOLVED', // ✅ Resolved
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',       // ⭐ New review
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT', // 📢 Announcement
}
```

## Notification Icons Mapping

```typescript
const notificationIcons = {
  BOOKING_CREATED: '🔔',
  BOOKING_UPDATED: '📝',
  BOOKING_ACCEPTED: '✅',
  BOOKING_COMPLETED: '✅',
  MESSAGE_RECEIVED: '💬',
  PROPOSAL_RECEIVED: '💰',
  PROPOSAL_ACCEPTED: '✅',
  PAYMENT_RECEIVED: '💵',
  VERIFICATION_UPDATE: '✅',
  COMPLAINT_FILED: '⚠️',
  COMPLAINT_RESOLVED: '✅',
  REVIEW_RECEIVED: '⭐',
  SYSTEM_ANNOUNCEMENT: '📢',
};
```

## Implementation Notes

### Phase 1 (Basic Notifications)
- [ ] Notification list display
- [ ] Unread badge count
- [ ] Mark as read functionality
- [ ] Delete notification

### Phase 2 (Enhanced)
- [ ] Notification type icons
- [ ] Relative timestamps
- [ ] Deep linking on click
- [ ] Mark all as read

### Phase 3 (Advanced)
- [ ] Push notifications (FCM)
- [ ] Notification preferences
- [ ] Notification categories
- [ ] Scheduled notifications
- [ ] Sound/vibration settings

## API Integration

```typescript
// Notifications API service
const notificationsApi = {
  getNotifications: (params) => apiClient.get('/api/notifications', params),
  getUnreadCount: () => apiClient.get('/api/notifications/unread'),
  markAsRead: (id) => apiClient.put(`/api/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/api/notifications/read-all'),
  deleteNotification: (id) => apiClient.delete(`/api/notifications/${id}`),
  deleteAll: () => apiClient.delete('/api/notifications/all'),
};

// Polling for new notifications
const useNotificationsPolling = (interval = 30000) => {
  const fetchNotifications = async () => {
    const [notifications, unread] = await Promise.all([
      notificationsApi.getNotifications({ limit: 20 }),
      notificationsApi.getUnreadCount(),
    ]);
    return { notifications, unread };
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, interval);
    return () => clearInterval(id);
  }, []);
};
```

## Dependencies

- **API Endpoints:** `/api/notifications`
- **UI Components:** Button, Badge, Avatar
- **Hooks:** useAuth

## Urdu Translation Support

- "Notifications" / "اطلاعات"
- "Mark as read" / "پڑھا ہوا نشان زد کریں"
- "Mark all as read" / "سب پڑھا ہوا نشان زد کریں"
- "Delete" / "حذف کریں"
- "New Booking" / "نئی بکنگ"
- "New Message" / "نیا پیغام"
- "Payment Received" / "ادائیگی موصول ہوئی"
- "Booking Completed" / "بکنگ مکمل ہوئی"
