# Notifications Module Project Plan (Project-wide)

## 1) Goal
Build unified in-app + push notification system for customer, worker, and admin flows.

## 2) Current State
- Frontend worker topbar uses mock notifications in `FYP-frontend 2/src/components/worker-dashboard/worker-topbar.tsx`.
- Customer notifications page exists (`/customer/notifications`) but reads mock customer data.
- Backend has `Notification` table but no notifications module in `src/app.module.ts`.

## 3) Scope
- In-app notification center APIs.
- Unread counters.
- Mark single/all as read.
- Event-driven creation from booking/chat/verification flows.
- Push delivery using saved `fcmToken`.

## 4) Data Model Changes
Extend `Notification` model:
- `type NotificationType`
- `metadata Json?` (bookingId, workerId, deep-link hints)
- `readAt DateTime?`

Add enum `NotificationType` examples:
- `BOOKING_CREATED`
- `BOOKING_ACCEPTED`
- `BOOKING_CANCELLED`
- `PAYMENT_RECEIVED`
- `MESSAGE_RECEIVED`
- `VERIFICATION_APPROVED`
- `VERIFICATION_REJECTED`
- `SYSTEM_ALERT`

## 5) API Contracts
Base: `/notifications`

- `GET /notifications?cursor=<id>&limit=20&type=<optional>`
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id` (optional)

Admin/system emit endpoint (internal service only):
- `notificationsService.createForUser(userId, payload)`
- `notificationsService.createBulk(userIds, payload)`

## 6) Event Sources Across Project
Create notifications from:
- Worker verification approved/rejected (`admin` module).
- Booking lifecycle changes (`bookings` module).
- New chat message (`messages` module).
- Complaint resolved/assigned (`admin/complaints`).
- Payout or wallet updates (`payments` module).

## 7) Realtime Delivery
Optional but recommended:
- Socket namespace `/notifications`
- Server emits `notification:new` and `notification:read-updated`
- Client updates bell counter instantly

## 8) Frontend Integration Targets
Worker:
- `FYP-frontend 2/src/components/worker-dashboard/worker-topbar.tsx`

Customer:
- `FYP-frontend 2/src/app/customer/notifications/page.tsx`

Shared:
- Add `src/api/services/notifications.ts`
- Add `src/hooks/useNotifications.ts`

## 9) Verification Flow Integration (Important)
On `approveWorkerVerification` or `rejectWorkerVerification`:
- Update worker/user status.
- Immediately create notification to worker user.
- Message examples:
  - Approved: "Your profile is verified. Go live to receive jobs."
  - Rejected: "Your verification was rejected. Please update documents."

## 10) Implementation Steps
1. Create notifications module (controller/service/dto).
2. Prisma migration for type/metadata/readAt.
3. Add unread-count and mark-read endpoints.
4. Wire admin + booking + chat domain events to notifications service.
5. Add optional push provider wrapper (FCM).
6. Replace frontend mocks with API polling/socket.
7. Add integration tests.

## 11) Minimum Tests
- Auth user only reads own notifications.
- Unread count matches read actions.
- Verification approve/reject triggers worker notification.
- Metadata deep-link fields persist correctly.

## 12) Out of Scope (Phase 1)
- User-custom notification preferences matrix.
- Email/SMS channel fanout.
- Scheduled digests.
