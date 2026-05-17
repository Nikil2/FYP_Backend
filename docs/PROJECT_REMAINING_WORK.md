# Project Remaining Work - Full User Flow (Backend + Integration)

## Purpose
This document combines:
- What is already implemented in `FYP_BACKEND`
- What is still missing for the full production flow
- The exact order to finish the project end-to-end

Scope is based on your required flow:
Home -> Browse/Search Services -> Select Service -> Show Workers + Portfolio -> Book Now -> Booking Lifecycle -> Chat (Socket.IO) -> Completion/Feedback/Dispute.

---

## 1) Current State Snapshot

### Implemented Backend Modules
- `users` (register/login/basic profile CRUD)
- `services` (list/create/update/deactivate)
- `workers` (worker registration, services mapping, portfolio CRUD, online status, worker orders/wallet summaries)
- `bookings` (create booking, fetch bookings, status update, cancel, create/accept price proposal)
- `admin` (dashboard, user/worker/service management, jobs view, complaints/reviews/revenue analytics)

### Implemented Database Models (already in Prisma)
These already exist in `schema.prisma` and are ready for module usage:
- `Booking`, `PriceProposal`, `Message`, `Feedback`, `Complaint`, `Notification`, `SavedLocation`, `WorkerPortfolio`, `WorkerSchedule`, etc.

### Major Missing Backend Pieces
- No dedicated `messages` module in `src/modules/messages`
- No Socket.IO chat gateway for booking chat
- No `notifications` module for message/booking events
- No `feedback` module endpoints (rating/review lifecycle)
- No customer-side saved locations module endpoints
- No worker schedule module endpoints
- No complaint module endpoints for customer/worker side (admin can resolve complaints but complaint creation flow is incomplete from user journey)
- No auth guards/role guards applied across critical endpoints (many routes are currently open)

---

## 2) Full Flow Coverage vs Missing

## A) Home Search and Service Discovery

### Already Available
- `GET /services`
- `GET /services/active`

### Missing / To Improve
- Search endpoint with query support (example: `GET /services/search?q=plumb`) or query filters on `/services`
- Grouped-by-category response contract for frontend sections
- Ranking/sorting strategy (popular/recent/top-rated worker density)
- Optional location-aware service discovery

---

## B) Service -> Workers Listing (with portfolio)

### Already Available
- Workers include linked services and portfolio in worker fetch APIs
- Portfolio CRUD endpoints exist under `/workers/:id/portfolio`

### Missing / To Improve
- Dedicated endpoint for service-based worker discovery (example: `GET /workers/by-service/:serviceId`)
- Filtering by verification + online + distance + rating + price range
- Pagination + cursor strategy for large worker lists
- Worker list response optimized for card UI (name, rating, jobs done, charges, cover portfolio image)

---

## C) Booking Flow (Book Now to Completion)

### Already Available
- Create booking
- List bookings (customer/worker/global)
- Update status
- Cancel booking
- Price proposal create/accept

### Missing / To Improve (Critical)
- Authorization ownership checks (customer can only affect own booking; worker only assigned booking; admin-only endpoints)
- Strict booking status transition rules (currently too permissive with generic status update)
- Missing dedicated workflow endpoints from docs:
  - Worker accept/reject booking
  - Worker start job
  - Worker mark done
  - Customer confirm completion
  - Customer raise dispute
- Feedback creation on completion path + worker rating recalculation lifecycle hardening
- Booking audit trail/events for timeline UI

---

## D) Chat Flow (Socket.IO + REST)

### Current Reality
- `Message` table exists in Prisma
- No `messages` module in backend
- No socket namespace/gateway implementation

### Required to Complete
- Build `messages` module:
  - `GET /messages/booking/:bookingId` (history, cursor pagination)
  - `POST /messages/booking/:bookingId` (send text/image URL)
  - `POST /messages/booking/:bookingId/read` (read receipts)
  - `DELETE /messages/:messageId` (soft delete)
- Build Socket.IO gateway (namespace `/chat`):
  - `chat:join`, `chat:send`, `chat:read`, `chat:typing`
  - server emits `chat:message:new`, `chat:message:read`, `chat:typing:update`
- Add minimal schema extension (recommended):
  - `Message.readAt`, `Message.deletedAt`, optional `attachmentUrl`
- Booking participant authorization for every chat action

---

## E) Notifications

### Already Available
- `Notification` model exists in Prisma

### Missing / To Build
- Notifications service/module and APIs
- Trigger notifications on:
  - new booking
  - new price proposal
  - proposal accepted
  - status changes
  - new chat message
- Mark-read and unread count endpoints
- Optional FCM dispatch integration

---

## F) Disputes and Complaints

### Already Available
- Complaint model exists
- Admin can view/resolve complaints

### Missing / To Build
- Customer/worker complaint creation endpoint linked to booking
- Complaint evidence upload flow
- Booking status auto-shift to `DISPUTED` when complaint is raised
- Complaint timeline/status endpoint for both parties

---

## G) Auth, Security, and Production Hardening (High Priority)

### Current Gaps
- No route-level JWT guards on sensitive endpoints
- No role guards for admin/customer/worker boundaries
- Admin login currently compares plain password path (must use hashed verify)
- No rate limiting on login, messages, proposals
- No consistent ownership checks across update/cancel/status endpoints

### Required
- Add `JwtAuthGuard` + `RolesGuard`
- Add ownership validation policies
- Harden admin authentication with bcrypt compare
- Add DTO validation coverage and stricter enum transitions

---

## 3) Frontend Integration Reality (Important)

Even with backend partially ready, many frontend customer/dashboard pages still use mock data:
- `src/lib/mock-bookings.ts`
- `src/containers/user-dashboard/messages.tsx`
- `src/components/customer/booking-form.tsx`
- worker/service browse parts still include local filtering from static datasets

So remaining work is not only backend completion; API integration replacement is required across booking + chat + orders + notifications views.

---

## 4) Recommended Build Order (Execution Plan)

1. Security Foundation
- Add JWT + role guards + ownership policies across existing modules.

2. Booking Workflow Completion
- Implement dedicated booking action endpoints and strict transition matrix.

3. Messages Module (REST)
- Build DB-backed chat endpoints first with booking authorization.

4. Socket.IO Chat Gateway
- Add real-time events, room join, typing/read events.

5. Notifications Module
- Trigger from booking/proposal/chat events; add unread APIs.

6. Complaints + Feedback Completion
- Raise dispute flow, evidence, feedback lifecycle completion.

7. Search/Discovery Enhancements
- Service search endpoint + worker-by-service filtering/sorting.

8. Frontend API Migration
- Replace mock bookings/messages/orders with real APIs and socket client.

9. Testing + QA
- Unit tests for status transitions, proposal accept logic, ownership guards.
- E2E tests for full path: service select -> booking -> chat -> completion/dispute.

---

## 5) Definition of Done (Full Flow)

Project is considered complete when all are true:
- Customer can search services, open worker list by service, and view real portfolios.
- Customer can create booking and track accurate status timeline.
- Worker and customer can negotiate price, accept, start, and complete job with valid transitions.
- Booking chat works in real-time (Socket.IO) with persistent message history.
- Notifications update both roles for booking and chat events.
- Complaints/disputes can be raised and resolved with admin workflow.
- Dashboard/order/message screens use real backend only (no mock flow dependency).
- Auth/role/ownership protections are enforced on all sensitive endpoints.

---

## 6) Quick Gap Checklist

- [ ] Add `messages` module
- [ ] Add Socket.IO chat gateway
- [ ] Add notifications module + triggers
- [ ] Add feedback module endpoints
- [ ] Add customer complaint create flow
- [ ] Add saved locations module endpoints
- [ ] Add worker schedule module endpoints
- [ ] Add service search + worker-by-service discovery endpoint
- [ ] Enforce JWT + role guards + ownership checks
- [ ] Harden booking transition rules
- [ ] Replace frontend mock booking/message data with API integrations
- [ ] Add end-to-end tests for complete booking-chat-dispute lifecycle

