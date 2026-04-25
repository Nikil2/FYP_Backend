# Notifications Module Documentation

## Overview

The Notifications module handles push notifications (FCM), in-app notifications, and email/SMS alerts. It centralizes all user communication from the platform.

**Location**: `src/modules/notifications/`

**Priority**: MEDIUM

---

## Files Structure

```
notifications/
├── notifications.module.ts         # Module configuration
├── notifications.controller.ts     # HTTP endpoints (8 endpoints)
├── notifications.service.ts        # Business logic + FCM integration
├── index.ts                        # Barrel exports
├── dto/
│   ├── create-notification.dto.ts  # Create notification
│   ├── notification-response.dto.ts # Response format
│   └── fcm-token.dto.ts            # Register FCM token
├── templates/
│   ├── email-templates.ts          # Email HTML templates
│   └── sms-templates.ts            # SMS message templates
└── providers/
    └── fcm.provider.ts             # Firebase Cloud Messaging setup
```

---

## Database Schema Reference

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  title     String
  body      String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], onDelete: Cascade)

  @@index([userId])
}
```

**Note**: This schema stores in-app notifications. For push notifications, we use FCM directly.

---

## Notification Channels

| Channel | Use Case | Priority |
|---------|----------|----------|
| **In-App** | All notifications, stored in DB | Always |
| **Push (FCM)** | Important real-time alerts | High priority |
| **Email** | Summaries, receipts, important updates | Medium |
| **SMS** | Critical alerts (OTP, urgent) | High cost, use sparingly |

---

## Notification Types

### Booking Notifications

| Event | In-App | Push | Email | SMS |
|-------|--------|------|-------|-----|
| Booking created | ✅ | ✅ | ❌ | ❌ |
| Booking accepted | ✅ | ✅ | ❌ | ❌ |
| Booking cancelled | ✅ | ✅ | ✅ | ❌ |
| Price proposal sent | ✅ | ✅ | ❌ | ❌ |
| Job started | ✅ | ✅ | ❌ | ❌ |
| Job completed | ✅ | ✅ | ✅ | ❌ |
| Booking reminder | ✅ | ✅ | ❌ | ✅ |

### Worker Notifications

| Event | In-App | Push | Email | SMS |
|-------|--------|------|-------|-----|
| Verification approved | ✅ | ✅ | ✅ | ❌ |
| Verification rejected | ✅ | ✅ | ✅ | ❌ |
| New review received | ✅ | ✅ | ❌ | ❌ |
| Complaint filed | ✅ | ✅ | ✅ | ❌ |
| Payment received | ✅ | ✅ | ✅ | ✅ |

### Customer Notifications

| Event | In-App | Push | Email | SMS |
|-------|--------|------|-------|-----|
| Worker arrived | ✅ | ✅ | ❌ | ❌ |
| Refund processed | ✅ | ✅ | ✅ | ❌ |
| Complaint resolved | ✅ | ✅ | ✅ | ❌ |
| OTP for login | ❌ | ❌ | ❌ | ✅ |

### Platform Notifications

| Event | In-App | Push | Email | SMS |
|-------|--------|------|-------|-----|
| Welcome message | ✅ | ✅ | ✅ | ❌ |
| Account blocked | ✅ | ✅ | ✅ | ❌ |
| Password changed | ✅ | ❌ | ✅ | ✅ |
| New feature announcement | ✅ | ❌ | ✅ | ❌ |

---

## Endpoints

### User Notification Endpoints

#### 1. Get My Notifications

**Endpoint**: `GET /notifications`

**Description**: Get all notifications for the authenticated user.

**Query Parameters**:
- `skip` (optional, default: 0)
- `take` (optional, default: 20)
- `unreadOnly` (optional, default: false) - Only return unread
- `type` (optional) - Filter by notification type/category

**Response**:
```typescript
{
  data: NotificationResponseDto[];
  total: number;
  unreadCount: number;
}
```

**NotificationResponseDto**:
```typescript
{
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: DateTime;
  actionUrl?: string;     // Deep link for tap action
  metadata?: Record<string, any>;  // Additional data
}
```

**Example**:
```bash
curl "http://localhost:4000/notifications?skip=0&take=20&unreadOnly=true" \
  -H "Authorization: Bearer <token>"
```

---

#### 2. Get Unread Count

**Endpoint**: `GET /notifications/unread-count`

**Description**: Get count of unread notifications.

**Response**:
```typescript
{
  count: number;
  lastReadAt?: DateTime;
}
```

**Example**:
```bash
curl http://localhost:4000/notifications/unread-count \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Mark as Read

**Endpoint**: `POST /notifications/:id/read`

**Description**: Mark a specific notification as read.

**Response**:
```typescript
{
  id: string;
  isRead: true;
  readAt: DateTime;
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Notification not found
- `403 Forbidden` - Not the owner

---

#### 4. Mark All as Read

**Endpoint**: `POST /notifications/read-all`

**Description**: Mark all notifications as read for current user.

**Response**:
```typescript
{
  markedAsRead: number;  // Count of notifications marked
}
```

---

#### 5. Delete Notification

**Endpoint**: `DELETE /notifications/:id`

**Description**: Delete a notification.

**Status Codes**:
- `200 OK` - Deleted
- `404 Not Found` - Not found
- `403 Forbidden` - Not the owner

---

#### 6. Register FCM Token

**Endpoint**: `POST /notifications/fcm-token`

**Description**: Register or update user's FCM token for push notifications.

**Request Body** (`FcmTokenDto`):
```typescript
{
  fcmToken: string;      // FCM device token
  deviceType?: 'ios' | 'android' | 'web';
  deviceName?: string;   // e.g., "iPhone 14 Pro"
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

**Business Logic**:
1. Store FCM token linked to user
2. Handle token updates (same user, multiple devices)
3. Invalidate old tokens after expiry

**Example**:
```bash
curl -X POST http://localhost:4000/notifications/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "fcmToken": "eXwHk3z...abc123",
    "deviceType": "android",
    "deviceName": "Samsung Galaxy S23"
  }'
```

---

### Admin Notification Endpoints

#### 7. Send Broadcast Notification

**Endpoint**: `POST /admin/notifications/broadcast`

**Description**: Send notification to all users or filtered segment.

**Request Body**:
```typescript
{
  title: string;
  body: string;
  type: NotificationType;
  targetAudience: 'ALL' | 'CUSTOMERS' | 'WORKERS' | 'CUSTOM';
  filters?: {
    role?: UserRole[];
    city?: string[];
    workerVerificationStatus?: VerificationStatus;
    // ... other filters
  };
  sendPush: boolean;
  sendEmail: boolean;
  scheduledAt?: string;  // ISO 8601 for scheduled sending
}
```

**Response**:
```typescript
{
  broadcastId: string;
  status: 'queued' | 'sending' | 'completed' | 'failed';
  estimatedRecipients: number;
  scheduledAt?: DateTime;
}
```

**Business Logic**:
1. Validate admin role
2. Calculate target audience
3. Create broadcast job (async)
4. Send in batches to avoid rate limits
5. Track delivery statistics

**Example**:
```bash
curl -X POST http://localhost:4000/admin/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "title": "Eid Mubarak from Mehnati Marketplace!",
    "body": "Wishing you and your family a blessed Eid.",
    "type": "PLATFORM_ANNOUNCEMENT",
    "targetAudience": "ALL",
    "sendPush": true,
    "sendEmail": false
  }'
```

---

#### 8. Send Targeted Notification

**Endpoint**: `POST /admin/notifications/send`

**Description**: Send notification to specific users.

**Request Body**:
```typescript
{
  userIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  sendPush: boolean;
  sendEmail: boolean;
}
```

**Status Codes**:
- `201 Created` - Notifications queued
- `403 Forbidden` - Not admin

---

## DTOs

### CreateNotificationDto

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum NotificationType {
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  SYSTEM = 'SYSTEM',
  PROMOTIONAL = 'PROMOTIONAL',
  COMPLAINT = 'COMPLAINT',
  REVIEW = 'REVIEW',
}

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsOptional()
  actionUrl?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
```

---

### FcmTokenDto

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class FcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @IsEnum(['ios', 'android', 'web'])
  @IsOptional()
  deviceType?: 'ios' | 'android' | 'web';

  @IsString()
  @IsOptional()
  deviceName?: string;
}
```

---

## Service Methods

### `sendNotification(userId: string, title: string, body: string, options?: NotificationOptions): Promise<Notification>`

```typescript
async sendNotification(
  userId: string,
  title: string,
  body: string,
  options?: {
    type?: NotificationType;
    actionUrl?: string;
    metadata?: Record<string, any>;
    sendPush?: boolean;
    sendEmail?: boolean;
    sendSms?: boolean;
  },
) {
  // 1. Create in-app notification (always)
  const notification = await this.prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type: options?.type || 'SYSTEM',
    },
  });

  // 2. Send push notification (if enabled)
  if (options?.sendPush) {
    await this.sendPushNotification(userId, {
      title,
      body,
      data: {
        notificationId: notification.id,
        actionUrl: options.actionUrl,
        type: options.type,
      },
    });
  }

  // 3. Send email (if enabled)
  if (options?.sendEmail) {
    await this.sendEmail(userId, title, body);
  }

  // 4. Send SMS (if enabled, for critical only)
  if (options?.sendSms) {
    await this.sendSms(userId, body);
  }

  return notification;
}
```

---

### `sendPushNotification(userId: string, payload: PushPayload): Promise<void>`

```typescript
async sendPushNotification(userId: string, payload: PushPayload) {
  // 1. Get user's FCM tokens
  const tokens = await this.getUserFcmTokens(userId);

  if (tokens.length === 0) return;

  // 2. Build FCM message
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high',
      notification: {
        clickAction: payload.actionUrl || '/notifications',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,  // Increment badge count
        },
      },
    },
  };

  // 3. Send via FCM
  const response = await admin.messaging().sendEachForMulticast(message);

  // 4. Handle invalid tokens
  if (response.failureCount > 0) {
    await this.removeInvalidTokens(response.responses, tokens);
  }
}
```

---

### `sendBookingNotification(bookingId: string, event: BookingEvent): Promise<void>`

High-level method for booking-related notifications:

```typescript
async sendBookingNotification(bookingId: string, event: BookingEvent) {
  const booking = await this.prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, worker: true, service: true },
  });

  switch (event) {
    case 'BOOKING_CREATED':
      // Notify worker
      await this.sendNotification(booking.worker.userId, {
        title: 'New Booking Request',
        body: `${booking.customer.fullName} needs ${booking.service.name} service`,
        type: 'BOOKING',
        actionUrl: `/bookings/${bookingId}`,
        sendPush: true,
      });
      break;

    case 'BOOKING_ACCEPTED':
      // Notify customer
      await this.sendNotification(booking.customerId, {
        title: 'Booking Accepted',
        body: `${booking.worker.fullName} accepted your booking`,
        type: 'BOOKING',
        actionUrl: `/bookings/${bookingId}`,
        sendPush: true,
      });
      break;

    // ... other events
  }
}
```

---

## Email Templates

### Welcome Email

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
    .header { background: #00A651; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .button { background: #00A651; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Mehnati Marketplace!</h1>
    </div>
    <div class="content">
      <p>Assalam-o-Alaikum {{fullName}},</p>
      <p>Thank you for joining Mehnati Marketplace. We're excited to have you on board.</p>
      <p>Get started by:</p>
      <ul>
        <li>Complete your profile</li>
        <li>Browse available services</li>
        <li>Book your first service</li>
      </ul>
      <a href="{{appUrl}}" class="button">Get Started</a>
    </div>
  </div>
</body>
</html>
```

---

## SMS Templates

```typescript
const SMS_TEMPLATES = {
  OTP: 'Your Mehnati Marketplace OTP is {{otp}}. Valid for 5 minutes. Do not share with anyone.',

  BOOKING_REMINDER: 'Reminder: {{workerName}} will arrive at {{time}} for {{service}}. Address: {{address}}',

  PAYMENT_RECEIVED: 'Payment of Rs.{{amount}} received. Transaction ID: {{txnId}}. Thank you!',

  VERIFICATION_APPROVED: 'Congratulations! Your worker verification is approved. You can now accept bookings.',

  PASSWORD_CHANGED: 'Your password was changed successfully. Contact support if this wasn\'t you.',
};
```

---

## FCM Configuration

### Setup (`firebase-admin`)

```typescript
import * as admin from 'firebase-admin';

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FCM_PROJECT_ID,
  private_key_id: process.env.FCM_PRIVATE_KEY_ID,
  private_key: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FCM_CLIENT_EMAIL,
  // ... other fields
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export { admin };
```

### Environment Variables

```env
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY_ID=key-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

## Notification Preferences (Future Enhancement)

Allow users to customize notification settings:

```prisma
model NotificationPreference {
  id              String   @id @default(uuid())
  userId          String   @unique
  bookingUpdates  Boolean  @default(true)
  promotional     Boolean  @default(false)
  emailDigest     Boolean  @default(true)   // Weekly summary
  smsAlerts       Boolean  @default(false)
  pushEnabled     Boolean  @default(true)
  quietHoursStart String?  // e.g., "22:00"
  quietHoursEnd   String?  // e.g., "08:00"
}
```

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid FCM token, invalid email |
| `NotFoundException` | 404 | Notification not found |
| `ForbiddenException` | 403 | Not the notification owner |

---

## Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| Push notifications per user | 10 | per minute |
| Email per user | 5 | per minute |
| SMS per user | 3 | per hour |
| Broadcast (admin) | 2 | per hour |

---

## Best Practices

1. **In-App First**: Always create in-app notification as source of truth
2. **Push for Urgent**: Use push for time-sensitive alerts
3. **Email for Records**: Use email for receipts, summaries
4. **SMS Sparingly**: High cost, use only for critical (OTP, urgent)
5. **Respect Quiet Hours**: Don't send non-urgent notifications at night
6. **Localization**: Send in user's preferred language (English/Urdu)
7. **Deep Links**: Always include actionUrl for tap-to-open
8. **Badge Management**: Properly increment/decrement app badge

---

## Future Enhancements

1. **Notification scheduling** - Send at optimal times
2. **A/B testing** - Test different message copy
3. **Analytics dashboard** - Open rates, click-through rates
4. **Drip campaigns** - Onboarding email series
5. **In-app inbox search** - Find past notifications
6. **Notification categories** - User-filterable types
7. **WhatsApp integration** - Send via WhatsApp Business API
8. **Smart batching** - Group non-urgent notifications
9. **Urgency levels** - High/medium/low priority routing
10. **Delivery tracking** - Read receipts, engagement metrics

---

## Related Modules

- **Bookings Module** - Booking notifications
- **Workers Module** - Worker verification notifications
- **Feedback Module** - Review notifications
- **Complaint Module** - Complaint notifications
- **Admin Module** - Broadcast notifications
- **Users Module** - User FCM token storage
