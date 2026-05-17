# Backend Full Flow Implementation Status and Handoff Guide

## Document Purpose
This is a backend-only handoff document for engineering implementation.
It explains:
- The intended end-to-end marketplace flow
- What is already built in the current backend
- What is not built yet
- Exact API/module gaps to implement next
- Recommended implementation order

Repository scope: `FYP_BACKEND`

---

## 1) Intended Product Flow (Backend Perspective)

## Phase A: Discovery
1. User opens app/web home.
2. User browses service categories.
3. User searches for service by keyword.
4. User selects service/sub-service.
5. Backend returns workers for that service with profile/portfolio/rating/price.

## Phase B: Booking Creation
6. User clicks Book Now on selected worker.
7. User submits job details (description, address, lat/lng, schedule, initial offer optional).
8. Backend creates booking and initial booking state.
9. Worker receives booking notification.

## Phase C: Negotiation
10. Worker sends price proposal.
11. User accepts/counters proposal.
12. Final proposal accepted -> booking status becomes accepted.

## Phase D: Execution
13. Worker accepts/starts work.
14. Worker marks job done.
15. User confirms completion.
16. Backend finalizes booking, updates worker stats, feedback becomes available.

## Phase E: Communication
17. Customer and worker chat in booking room.
18. Chat supports text (and image in phase 1.5/2).
19. Read receipts/unread counts update.
20. Real-time events via Socket.IO.

## Phase F: Post-Job
21. User gives rating/review.
22. If issue: user creates complaint/dispute.
23. Admin resolves complaint.
24. Notifications are sent for all key events.

---

## 2) Current Backend Module Inventory

Current modules under `src/modules`:
- `users` (built)
- `services` (built)
- `workers` (built)
- `bookings` (partially built)
- `admin` (built for admin panel workflows)
- `uploads` (folder exists, no complete user flow module)

Not present as working modules (missing implementation):
- `messages`
- `notifications`
- `feedback`
- `complaints` (customer/worker-facing; admin side has partial complaint handling)
- `saved-locations`
- `worker-schedule`

---

## 3) Database Readiness vs API Readiness

Prisma models already exist for many features:
- `Booking`, `PriceProposal`, `Message`, `Feedback`, `Complaint`, `Notification`, `SavedLocation`, `WorkerSchedule`, `WorkerPortfolio`

Important note:
- Data models existing in Prisma does **not** mean APIs are implemented.
- Several features are schema-ready but endpoint/service logic is still missing.

---

## 4) Built APIs (Verified)

## Users Module (Built)
- `POST /users/register`
- `POST /users/login`
- `GET /users/:id`
- `GET /users`
- `PUT /users/:id`
- `POST /users/:id/verify`
- `POST /users/:id/block`
- `POST /users/:id/unblock`
- `DELETE /users/:id`

Status: Functional basic auth/profile CRUD.
Gap: Role-based guards + ownership hardening required.

## Services Module (Built)
- `GET /services`
- `GET /services/active`
- `GET /services/list/all`
- `GET /services/:id`
- `POST /services`
- `PUT /services/:id`
- `POST /services/:id/deactivate`

Status: Functional list + admin CRUD.
Gap: Search/filter endpoint not specialized enough for production discovery.

## Workers Module (Built)
- `POST /workers/register`
- `GET /workers`
- `GET /workers/verified`
- `GET /workers/user/:userId`
- `GET /workers/me/:userId`
- `GET /workers/:id`
- `PUT /workers/:id`
- `PUT /workers/:id/online-status`
- `GET /workers/:id/orders`
- `GET /workers/:id/wallet/summary`
- `GET /workers/:id/wallet/transactions`
- `POST /workers/:id/portfolio`
- `GET /workers/:id/portfolio`
- `DELETE /workers/:id/portfolio/:portfolioId`
- `PUT /workers/:id/portfolio/:portfolioId`

Status: Good core worker profile and portfolio base.
Gap: No dedicated “workers by service + filter/sort/distance” production discovery endpoint.

## Bookings Module (Partially Built)
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/customer/:customerId`
- `GET /bookings/worker/:workerId`
- `GET /bookings/:id`
- `PATCH /bookings/:id/status`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/proposals`
- `POST /bookings/:id/proposals/:proposalId/accept`

Status: Core create/read/proposal flow exists.
Gap: Full workflow actions + strict transition and ownership rules missing.

## Admin Module (Built for Admin Panel)
Includes endpoints for:
- Login
- Dashboard stats
- User/worker management
- Jobs listing + job detail
- Complaints list/resolve/assign
- Reviews moderation
- Services management
- Revenue + analytics

Status: Strong admin operational module exists.
Gap: Admin auth hardening + some business logic consistency.

---

## 5) Full Flow Matrix: Built vs Remaining

## A. Home -> Browse Services
Built:
- Service list endpoints available.

Remaining:
- Add search endpoint and relevance behavior.
- Optional category-grouped response for UI efficiency.

## B. Select Service -> Show Workers
Built:
- Workers and worker services relation exists.
- Worker profile + portfolio fetch exists.

Remaining:
- Add endpoint for `serviceId`-based worker listing.
- Add filter options (verified, online, rating, price, optional distance).
- Add pagination metadata for scalable lists.

## C. Create Booking
Built:
- Booking creation endpoint with coordinates validation.
- Can create initial proposal if initial price provided.

Remaining:
- Enforce auth ownership (customer token identity, not arbitrary customerId).
- Validate worker-service relation before booking creation.
- Trigger notifications after creation.

## D. Negotiation
Built:
- Create price proposal.
- Accept proposal endpoint.

Remaining:
- Counter-proposal chain logic with parent/COUNTERED status consistency.
- Restrict who can propose/accept (customer vs assigned worker).
- Emit real-time updates to both users.

## E. Execution Lifecycle
Built:
- Generic status update endpoint exists.

Remaining:
- Add explicit action endpoints:
  - worker accept booking
  - worker reject booking
  - worker start job
  - worker mark done
  - customer confirm complete
  - customer/worker cancel with policy
- Implement strict valid transition matrix in service layer.

## F. Booking Chat
Built:
- `Message` table in Prisma only.

Remaining:
- Create `messages` module (controller + service + DTOs).
- Add booking chat REST APIs.
- Add unread/read flow.
- Add message auth checks per booking participant.

## G. Socket.IO Realtime
Built:
- Socket dependencies installed.

Remaining:
- Create chat gateway (namespace `/chat`).
- Room model by bookingId.
- Events:
  - `chat:join`
  - `chat:send`
  - `chat:read`
  - `chat:typing`
- Broadcast events:
  - `chat:message:new`
  - `chat:message:read`
  - `chat:typing:update`

## H. Notifications
Built:
- `Notification` Prisma model only.

Remaining:
- Notifications module APIs.
- Event-triggered creation (booking/proposal/chat/status updates).
- Unread count + mark read endpoints.

## I. Feedback/Reviews
Built:
- `Feedback` table exists.
- Admin can list/moderate reviews.

Remaining:
- Customer-facing feedback create/update endpoints.
- Tie feedback to completed booking rules.
- Recompute worker rating safely after feedback.

## J. Complaints/Disputes
Built:
- Complaint model exists.
- Admin complaint management endpoints exist.

Remaining:
- Customer/worker complaint create endpoint.
- Evidence upload handling for complaints.
- Auto status update to `DISPUTED` when complaint created.
- User-side complaint tracking endpoints.

## K. Saved Locations
Built:
- `SavedLocation` model only.

Remaining:
- CRUD APIs for user saved locations.

## L. Worker Schedule
Built:
- `WorkerSchedule` model only.

Remaining:
- CRUD APIs for schedule.
- Optional booking-time conflict check against schedule.

---

## 6) Critical Security and Authorization Gaps

These are high-priority blockers before production:

1. JWT guards are not consistently enforced across modules.
2. Role guards are missing for customer/worker/admin boundaries.
3. Ownership validation is weak in multiple endpoints (ID can be passed directly).
4. Admin login flow needs strict password hashing comparison.
5. Status updates are too permissive without actor-based transition checks.
6. Rate limiting is missing for login/messages/proposals.

---

## 7) API Gaps to Add (Concrete List)

## Booking User Flow APIs to Add
- `POST /bookings/:id/worker/accept`
- `POST /bookings/:id/worker/reject`
- `POST /bookings/:id/worker/start`
- `POST /bookings/:id/worker/mark-done`
- `POST /bookings/:id/customer/confirm-complete`
- `POST /bookings/:id/customer/dispute`
- `GET /bookings/:id/timeline` (optional but very useful)

## Message/Chat APIs to Add
- `GET /messages/booking/:bookingId?cursor=&limit=`
- `POST /messages/booking/:bookingId`
- `POST /messages/booking/:bookingId/read`
- `GET /messages/booking/:bookingId/unread-count`
- `DELETE /messages/:messageId` (soft delete)

## Discovery APIs to Add
- `GET /services/search?q=`
- `GET /workers/by-service/:serviceId`
  - filters: `online`, `minRating`, `maxPrice`, `sort`, pagination

## Notification APIs to Add
- `GET /notifications/me`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /notifications/unread-count`

## Saved Location APIs to Add
- `GET /users/me/saved-locations`
- `POST /users/me/saved-locations`
- `PUT /users/me/saved-locations/:id`
- `DELETE /users/me/saved-locations/:id`

## Worker Schedule APIs to Add
- `GET /workers/:id/schedule`
- `PUT /workers/:id/schedule`
- `POST /workers/:id/schedule`
- `DELETE /workers/:id/schedule/:scheduleId`

---

## 8) Recommended Implementation Order

## Step 1: Security Foundation
- Add JWT auth guard + role guard + ownership checks.
- Lock all existing endpoints with proper access control.

## Step 2: Booking Lifecycle Completion
- Add missing booking action endpoints.
- Enforce transition matrix per actor role.

## Step 3: Messages REST Module
- Implement persistence-based chat endpoints.
- Add pagination and read/unread state.

## Step 4: Socket.IO Chat Gateway
- Real-time rooms + send/read/typing events.

## Step 5: Notifications Module
- Trigger from booking/message/proposal/status events.

## Step 6: Feedback + Complaint User Flows
- Customer feedback submit.
- Customer/worker complaint create and track.

## Step 7: Discovery and Scheduling Enhancements
- Service search and workers-by-service filtering.
- Worker schedule APIs and optional booking conflict checks.

## Step 8: QA + E2E
- Write complete tests for full booking-chat-dispute flow.

---

## 9) Definition of Done (Backend)

Backend is considered complete when all are true:
1. Authenticated customer can discover service and fetch real worker list by service.
2. Customer can create booking and proceed through valid lifecycle only.
3. Worker can negotiate, accept/start/mark-done via explicit protected endpoints.
4. Customer can confirm completion and submit feedback.
5. Customer and worker can chat in real-time with persisted history.
6. Notifications are generated and retrievable for key lifecycle events.
7. Dispute creation and admin resolution work end-to-end.
8. All sensitive routes enforce JWT + role + ownership checks.
9. Core flows have e2e test coverage.

---

## 10) Developer Notes for Editor Agent

When implementing remaining work:
- Reuse existing module style and DTO patterns.
- Keep status transition logic centralized in service helpers.
- Never trust IDs from body for identity; derive actor from JWT token.
- Keep booking participant authorization reusable (helper/guard).
- Use database transactions where proposal acceptance or multi-write events occur.
- Add indexes where needed for frequent query paths (messages by booking, notifications by user/read status).

---

## 11) Quick Checklist

- [x] Users module base
- [x] Services module base
- [x] Workers module base
- [~] Bookings module partial
- [x] Admin module base
- [ ] Messages module
- [ ] Socket gateway for chat
- [ ] Notifications module
- [ ] Feedback user APIs
- [ ] Complaint user APIs
- [ ] Saved locations APIs
- [ ] Worker schedule APIs
- [ ] Full auth/role/ownership hardening
- [ ] End-to-end tests for full flow

