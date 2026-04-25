# Messages Module

**Status:** Planned - To Be Implemented

## Purpose

The Messages module provides in-app messaging functionality for customers and workers to communicate about their bookings. It supports text messages, images, and price proposal notifications.

## Expected Functionality

### Core Features
- Send text messages within a booking context
- Send images (work photos, issue photos)
- Automatic price proposal message generation
- Message history retrieval per booking
- Real-time message delivery (future: WebSocket)

### Message Types
```
TEXT - Plain text messages
IMAGE - Image attachments (via URL)
PRICE_PROPOSAL - System-generated proposal notifications
```

### Business Logic
- Messages are tied to specific bookings
- Only customer and assigned worker can message in a booking
- Messages cannot be deleted (audit trail)
- Messages are ordered chronologically

## Planned API Endpoints

### Messages Controller (`/api/messages`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Send a new message |
| GET | `/booking/:bookingId` | Get all messages for a booking |
| GET | `/:id` | Get specific message |
| POST | `/upload` | Upload image for message |
| GET | `/unread` | Get unread message count |

## DTOs to Implement

```typescript
// CreateMessageDto
{
  bookingId: string;
  content: string;
  type?: MessageType; // defaults to TEXT
}

// ImageMessageDto
{
  bookingId: string;
  imageUrl: string;
  type: 'IMAGE';
}

// MessageResponseDto
{
  id: string;
  sender: {
    id: string;
    fullName: string;
    profilePicUrl?: string;
    role: UserRole;
  };
  content: string;
  type: MessageType;
  createdAt: string;
}
```

## Database Relations

- `Message.booking` → Booking (context of conversation)
- `Message.sender` → User (message sender)

## Implementation Notes

### Phase 1 (Basic Messaging)
- [ ] Send/receive text messages
- [ ] Message history retrieval
- [ ] Sender information in response

### Phase 2 (Media Support)
- [ ] Image upload and sharing
- [ ] Image thumbnail generation
- [ ] Cloud storage integration (Cloudinary/AWS S3)

### Phase 3 (Real-time & Advanced)
- [ ] WebSocket integration for real-time chat
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Push notifications for new messages

## Dependencies

- **Required Modules:** Bookings, Users
- **Integrates With:** File Uploads, Notifications

## Security Considerations

- Only participants of a booking can send/view messages
- Image uploads must be validated (file type, size limits)
- Content moderation may be needed for uploaded images
- Rate limiting on message sending to prevent spam

## WebSocket Events (Future)

```typescript
// Client → Server
'send_message' - Send new message
'join_booking_room' - Join booking chat room
'typing_start' - User started typing
'typing_stop' - User stopped typing

// Server → Client
'new_message' - Broadcast new message
'user_typing' - Show typing indicator
'message_read' - Message read receipt
```
