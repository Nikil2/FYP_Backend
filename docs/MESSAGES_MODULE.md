# Messages Module Documentation

## Overview

The Messages module provides in-app messaging between customers and workers for each booking. It supports text messages, images, and price proposal notifications within the booking context.

**Location**: `src/modules/messages/`

**Priority**: HIGH

---

## Files Structure

```
messages/
├── messages.module.ts              # Module configuration
├── messages.controller.ts          # HTTP endpoints (8 endpoints)
├── messages.service.ts             # Business logic
├── index.ts                        # Barrel exports
├── dto/
│   ├── send-message.dto.ts         # Send message validation
│   ├── message-response.dto.ts     # Message response format
│   └── upload-image.dto.ts         # Image upload validation
└── enums/
    └── message-type.enum.ts        # MessageType constants
```

---

## Database Schema Reference

```prisma
model Message {
  id        String      @id @default(uuid())
  senderId  String
  content   String
  type      MessageType @default(TEXT)
  createdAt DateTime    @default(now())
  bookingId String
  booking   Booking     @relation(fields: [bookingId], onDelete: Cascade)
  sender    User        @relation(fields: [senderId])

  @@index([bookingId])
  @@index([senderId])
}

enum MessageType {
  TEXT
  IMAGE
  PRICE_PROPOSAL
}
```

---

## Message Types

| Type | Description | Content Format |
|------|-------------|----------------|
| `TEXT` | Plain text message | Raw text string |
| `IMAGE` | Image attachment | Image URL |
| `PRICE_PROPOSAL` | Price proposal notification | JSON: `{ proposalId, amount, status }` |

---

## Endpoints

### 1. Get Booking Messages

**Endpoint**: `GET /bookings/:bookingId/messages`

**Description**: Retrieve all messages for a specific booking (chat history).

**Query Parameters**:
- `skip` (optional, default: 0) - Number of messages to skip
- `take` (optional, default: 50) - Number of messages to return
- `before` (optional) - Get messages before this message ID (for pagination)

**Response**:
```typescript
{
  data: MessageResponseDto[];
  hasMore: boolean;
}
```

**MessageResponseDto**:
```typescript
{
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  type: MessageType;
  createdAt: DateTime;
  isSelf: boolean;  // true if sender is current user
}
```

**Status Codes**:
- `200 OK` - Success
- `403 Forbidden` - Not authorized (not customer, worker, or admin of this booking)
- `404 Not Found` - Booking not found

**Authorization**:
- Customer can view messages if they are the booking customer
- Worker can view messages if they are the assigned worker
- Admin can view all messages

**Example**:
```bash
curl "http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/messages?skip=0&take=50" \
  -H "Authorization: Bearer <token>"
```

---

### 2. Send Text Message

**Endpoint**: `POST /bookings/:bookingId/messages`

**Description**: Send a text message to the booking chat.

**Request Body** (`SendMessageDto`):
```typescript
{
  content: string;    // Message text (1-1000 chars)
  type: 'TEXT';       // Message type
}
```

**Response** (`MessageResponseDto`):
```typescript
{
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  type: MessageType.TEXT;
  createdAt: DateTime;
  isSelf: true;
}
```

**Status Codes**:
- `201 Created` - Message sent
- `400 Bad Request` - Invalid content (empty, too long)
- `403 Forbidden` - Not authorized
- `404 Not Found` - Booking not found

**Business Logic**:
1. Verify booking exists
2. Verify user is customer or worker of this booking
3. Verify booking is not CANCELLED (optional: allow post-completion)
4. Create message record
5. Send push notification to other party

**Example**:
```bash
curl -X POST http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "content": "I will arrive at 10 AM tomorrow.",
    "type": "TEXT"
  }'
```

---

### 3. Send Image Message

**Endpoint**: `POST /bookings/:bookingId/messages/image`

**Description**: Send an image message (before/after photos, proof of work).

**Request Body** (multipart/form-data):
```
image: File           // Image file (max 5MB)
caption?: string      // Optional caption (max 200 chars)
```

**OR** (if using URL):
```typescript
{
  imageUrl: string;   // URL of uploaded image
  caption?: string;
}
```

**Response**:
```typescript
{
  id: string;
  senderId: string;
  senderName: string;
  content: string;    // Image URL
  type: MessageType.IMAGE;
  createdAt: DateTime;
  caption?: string;
}
```

**Status Codes**:
- `201 Created` - Image sent
- `400 Bad Request` - Invalid image, too large, unsupported format
- `403 Forbidden` - Not authorized

**Supported Formats**: JPEG, PNG, WEBP
**Max Size**: 5MB

**Example**:
```bash
curl -X POST http://localhost:4000/bookings/550e8400-e29b-41d4-a716-446655440000/messages/image \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/image.jpg" \
  -F "caption=Completed wiring work"
```

---

### 4. Send Price Proposal Message

**Endpoint**: `POST /bookings/:bookingId/messages/proposal`

**Description**: Send a price proposal as a message (integrates with PriceProposal system).

**Note**: This is typically called automatically when a worker sends a proposal via the Bookings module.

**Request Body**:
```typescript
{
  proposalId: string;
  amount: number;
  message?: string;  // Optional accompanying message
}
```

**Response**:
```typescript
{
  id: string;
  type: MessageType.PRICE_PROPOSAL;
  content: string;  // JSON stringified proposal data
  createdAt: DateTime;
  proposal: {
    id: string;
    amount: number;
    status: ProposalStatus;
  };
}
```

---

### 5. Get Unread Count

**Endpoint**: `GET /bookings/:bookingId/messages/unread-count`

**Description**: Get count of unread messages for the current user in a booking.

**Response**:
```typescript
{
  count: number;
  lastReadMessageId?: string;
}
```

**Business Logic**:
- Tracks last read message timestamp per user per booking
- Returns count of messages after last read

---

### 6. Mark Messages as Read

**Endpoint**: `POST /bookings/:bookingId/messages/read`

**Description**: Mark all messages in booking as read for current user.

**Request Body** (optional):
```typescript
{
  upToMessageId?: string;  // Mark up to specific message
}
```

**Response**:
```typescript
{
  markedAsRead: number;  // Count of messages marked as read
}
```

---

### 7. Delete Message

**Endpoint**: `DELETE /messages/:messageId`

**Description**: Delete a message (only by sender, within time limit).

**Status Codes**:
- `200 OK` - Message deleted
- `403 Forbidden` - Not the sender
- `404 Not Found` - Message not found
- `400 Bad Request` - Cannot delete messages older than 24 hours (configurable)

**Business Logic**:
- Only sender can delete their own message
- Optional: Time limit for deletion (e.g., 24 hours)
- Soft delete recommended (set `deletedAt` timestamp)

---

### 8. Get Recent Conversations

**Endpoint**: `GET /messages/conversations`

**Description**: Get list of all bookings with messages for current user (conversation list).

**Query Parameters**:
- `skip` (optional)
- `take` (optional)

**Response**:
```typescript
{
  data: Array<{
    booking: {
      id: string;
      service: { name: string };
      customer: { fullName: string };
      worker: { fullName: string };
    };
    lastMessage: {
      id: string;
      content: string;
      type: MessageType;
      createdAt: DateTime;
      senderName: string;
      isFromSelf: boolean;
    };
    unreadCount: number;
  }>;
  total: number;
}
```

**Example**:
```bash
curl "http://localhost:4000/messages/conversations?skip=0&take=10" \
  -H "Authorization: Bearer <token>"
```

---

## DTOs

### SendMessageDto

```typescript
import { IsString, IsNotEmpty, IsEnum, MaxLength, MinLength } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  type: MessageType;
}
```

---

### SendImageMessageDto

```typescript
import { IsUrl, IsString, IsOptional, MaxLength } from 'class-validator';

export class SendImageMessageDto {
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
```

---

### MessageResponseDto

```typescript
import { MessageType, UserRole } from '@prisma/client';

export class MessageResponseDto {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderProfilePicUrl?: string;
  content: string;
  type: MessageType;
  createdAt: DateTime;
  isSelf: boolean;
  deletedAt?: DateTime;  // If soft deleted
}
```

---

## Service Methods

### `sendMessage(bookingId: string, senderId: string, content: string, type: MessageType): Promise<MessageResponseDto>`

Sends a text message:
1. Verify booking exists
2. Verify sender is customer or worker of booking
3. Verify booking is active (not cancelled)
4. Create message
5. Send notification to other party

**Throws**:
- `NotFoundException` - Booking not found
- `ForbiddenException` - Not authorized
- `BadRequestException` - Invalid content

---

### `sendImageMessage(bookingId: string, senderId: string, imageUrl: string, caption?: string): Promise<MessageResponseDto>`

---

### `getBookingMessages(bookingId: string, userId: string, skip: number, take: number): Promise<{ data: MessageResponseDto[]; hasMore: boolean }>`

Returns messages in chronological order (oldest first).

---

### `getUnreadCount(bookingId: string, userId: string): Promise<{ count: number }>`

---

### `markAsRead(bookingId: string, userId: string, upToMessageId?: string): Promise<{ markedAsRead: number }>`

---

### `deleteMessage(messageId: string, userId: string): Promise<void>`

**Business Logic**:
- Verify user is sender
- Check time limit (optional)
- Soft delete or hard delete

---

## WebSocket / Real-time Events

For real-time messaging, implement WebSocket events:

### Connection

```typescript
// Client connects with auth token
ws://localhost:4000/messages/ws?token=<jwt_token>
```

### Subscribe to Booking

```typescript
// Client subscribes to booking updates
{
  event: 'subscribe',
  data: { bookingId: '550e8400-e29b-41d4-a716-446655440000' }
}
```

### New Message Event

```typescript
// Server broadcasts to subscribers
{
  event: 'new_message',
  data: MessageResponseDto
}
```

### Typing Indicator

```typescript
// Client sends
{
  event: 'typing',
  data: { bookingId, isTyping: true }
}

// Server broadcasts
{
  event: 'user_typing',
  data: { bookingId, userId, userName, isTyping: true }
}
```

### Message Delivered/Read

```typescript
{
  event: 'message_read',
  data: { bookingId, messageId, readBy: userId, readAt: DateTime }
}
```

---

## Notifications

| Event | Notify Who | Channel | Message |
|-------|------------|---------|---------|
| New message received | Other party | Push (FCM) | "[Name]: [preview]" |
| Image sent | Other party | Push | "[Name] sent an image" |
| Price proposal | Customer | Push + In-app | "New price proposal: Rs. X" |

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid content, empty message, too long |
| `NotFoundException` | 404 | Booking or message not found |
| `ForbiddenException` | 403 | Not authorized, not part of booking |
| `PayloadTooLargeException` | 413 | Image exceeds size limit |
| `UnsupportedMediaTypeException` | 415 | Invalid image format |

---

## Message Search (Future Enhancement)

```typescript
// GET /bookings/:bookingId/messages/search?q=keyword
{
  query: string;
  results: Array<{
    id: string;
    content: string;
    senderName: string;
    createdAt: DateTime;
    highlight: string;  // Content with <mark> tags
  }>;
}
```

---

## Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| Send messages | 60 | per minute |
| Send images | 10 | per minute |
| Send proposals | 5 | per hour |

---

## Security Considerations

1. **Authorization**: Only booking participants can view/send messages
2. **Content Validation**: Sanitize HTML, prevent XSS
3. **Image Validation**: Check MIME type, not just extension
4. **Rate Limiting**: Prevent spam
5. **Moderation**: Admin access to all messages for dispute resolution
6. **Data Retention**: Policy for message deletion after X months

---

## Future Enhancements

1. **Voice messages** - Audio attachments
2. **Location sharing** - Send live location
3. **Message reactions** - Emoji reactions
4. **Message replies** - Threaded conversations
5. **File attachments** - PDFs, documents
6. **Message templates** - Quick replies for workers
7. **Translation** - Urdu/English auto-translate
8. **Chatbot** - Automated FAQs
9. **Broadcast messages** - Admin announcements
10. **Message export** - Download chat history

---

## Related Modules

- **Bookings Module** - Messages are tied to bookings
- **PriceProposal Module** - Price proposal messages
- **Notification Module** - Push notifications for new messages
- **Upload Module** - Image upload handling
