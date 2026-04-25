# Notifications Module

**Status:** Planned - To Be Implemented

## Purpose

The Notifications module manages platform notifications for all users. It handles in-app notifications and can be extended for push notifications (FCM) and email notifications.

## Expected Functionality

### Core Features
- Create notifications for user events
- Retrieve user's notification history
- Mark notifications as read
- Delete notifications
- FCM token management for push notifications
- Notification preferences (future)

### Notification Triggers
- New booking assigned (worker)
- Booking status changed
- New message received
- Price proposal received
- Complaint filed/resolved
- Worker verification status changed
- Payment received/pending

### Business Logic
- Notifications are user-specific
- Auto-cleanup of old notifications (30 days)
- FCM tokens can be updated per device
- Users can only access their own notifications

## Planned API Endpoints

### Notifications Controller (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's notifications |
| GET | `/unread` | Get unread count |
| PUT | `/:id/read` | Mark as read |
| PUT | `/read-all` | Mark all as read |
| DELETE | `/:id` | Delete notification |
| DELETE | `/all` | Delete all notifications |
| POST | `/fcm-token` | Register FCM token |
| POST | `/send` | Send notification (internal/admin) |

## DTOs to Implement

```typescript
// CreateNotificationDto
{
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  data?: Record<string, any>; // For deep linking
}

// FcmTokenDto
{
  fcmToken: string;
  deviceId?: string;
}

// NotificationResponseDto
{
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  type?: NotificationType;
  data?: Record<string, any>;
}
```

## Database Relations

- `Notification.user` → User (notification recipient)

## Implementation Notes

### Phase 1 (In-App Notifications)
- [ ] Create and store notifications
- [ ] Retrieve user notifications
- [ ] Mark as read functionality
- [ ] Unread count endpoint

### Phase 2 (Push Notifications)
- [ ] FCM integration
- [ ] Token management
- [ ] Push notification sending
- [ ] Deep linking support

### Phase 3 (Advanced)
- [ ] Email notifications
- [ ] SMS notifications (for critical events)
- [ ] Notification preferences/settings
- [ ] Scheduled notifications
- [ ] Notification categories

## Dependencies

- **Required Modules:** Users
- **Integrates With:** All modules (for event triggers)

## Security Considerations

- Users can only access their own notifications
- FCM tokens must be validated
- Rate limiting on notification creation
- Sensitive notification content should be encrypted

## Notification Types (Future Enhancement)

```typescript
enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_UPDATED = 'BOOKING_UPDATED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  PROPOSAL_RECEIVED = 'PROPOSAL_RECEIVED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  VERIFICATION_UPDATE = 'VERIFICATION_UPDATE',
  COMPLAINT_FILED = 'COMPLAINT_FILED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}
```

## FCM Integration Example

```typescript
// Service method for sending push notification
async sendPushNotification(userId: string, title: string, body: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (user.fcmToken) {
    await this.firebaseAdmin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
    });
  }
}
```

## Urdu Translation Support

- "Notifications" / "اطلاعات"
- "New Booking" / "نئی بکنگ"
- "Message Received" / "پیغام موصول ہوا"
- "Mark as Read" / "پڑھا ہوا نشان زد کریں"
