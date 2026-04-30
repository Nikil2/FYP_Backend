# Chat Module Project Plan (Customer <-> Worker)

## 1) Goal
Build production chat for booking-specific conversation between customer and worker, replacing frontend mock chat.

## 2) Current State
- Frontend currently has local-only modal chat in `FYP-frontend 2/src/components/modals/chat-modal.tsx`.
- Backend has `Message` table in Prisma, but no `messages` controller/service/module registered in `app.module.ts`.

## 3) Scope
- Booking-scoped 1:1 chat thread.
- Text + image message support.
- Read receipts (at least delivered/read status).
- Real-time updates via WebSocket gateway.
- REST fallback for history + send.

## 4) Data Model
Use existing `Message` model and extend minimally:
- Add optional `attachmentUrl String?`
- Add `readAt DateTime?`
- Add `deletedAt DateTime?` (optional for soft delete)

Optional optimization table:
- `ConversationReadState` (userId, bookingId, lastReadMessageId, lastReadAt)

## 5) API Contracts
Base: `/messages`

- `GET /messages/booking/:bookingId?cursor=<id>&limit=30`
  - Auth required (customer or assigned worker only)
  - Returns chronological messages + nextCursor

- `POST /messages/booking/:bookingId`
  - Body:
  ```json
  {
    "content": "I can reach in 20 mins",
    "type": "TEXT",
    "attachmentUrl": null
  }
  ```
  - Persists message and emits socket event.

- `POST /messages/booking/:bookingId/read`
  - Body: `{ "lastReadMessageId": "..." }`
  - Marks unread messages as read by current user.

- `DELETE /messages/:messageId`
  - Soft delete only by sender (or admin).

## 6) WebSocket Events
Gateway namespace: `/chat`

Client -> Server:
- `chat:join` `{ bookingId }`
- `chat:send` `{ bookingId, content, type, attachmentUrl }`
- `chat:read` `{ bookingId, lastReadMessageId }`
- `chat:typing` `{ bookingId, isTyping }`

Server -> Client:
- `chat:message:new`
- `chat:message:read`
- `chat:typing:update`
- `chat:error`

## 7) Authorization Rules
- User must be booking customer or booking worker.
- Blocked users cannot send.
- Booking must exist and be active/valid for messaging.

## 8) Notification Integration
When message is sent:
- If recipient offline, create notification row (`type=message` after schema extension).
- If recipient has `fcmToken`, dispatch push notification.

## 9) Frontend Integration Targets
Replace mock usage in:
- `FYP-frontend 2/src/components/modals/chat-modal.tsx`

Add API layer:
- `src/api/services/messages.ts`

Add socket client hook:
- `src/hooks/useChatSocket.ts`

## 10) Implementation Steps
1. Create `messages` module (controller/service/dto).
2. Add Prisma migration for message extensions.
3. Implement REST endpoints and ownership guards.
4. Add WebSocket gateway + room join strategy by booking.
5. Add push trigger into notifications service.
6. Integrate frontend modal with real API + socket.
7. Add tests (unit + e2e).

## 11) Minimum Tests
- Only participant users can fetch/send.
- Message ordering and pagination cursor correctness.
- Read receipt updates unread count.
- Socket broadcast reaches both participants.

## 12) Out of Scope (Phase 1)
- Group chat.
- Voice notes.
- End-to-end encryption.
- Message edit history.
