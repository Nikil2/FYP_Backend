# Mehnati Marketplace - Backend Full System Overview

Date: 2026-05-17
Scope: Backend flow and module status (implemented vs. missing)

---

## 1) Purpose
This document consolidates the end-to-end backend flow for the marketplace and highlights what is already implemented vs. what remains. It is intended to align the backend roadmap with the frontend user journey (browse services -> select worker -> book -> chat -> complete -> feedback/complaint).

---

## 2) Current Backend Snapshot (Code-Wired Modules)
These modules are wired in the Nest app and have active controllers/services:

- Users: registration, login, profile management
- Workers: registration, profile, online status, portfolio, wallet summaries (derived)
- Services: service catalog CRUD + active list
- Bookings: create booking, list, get, cancel, create proposal, accept proposal
- Admin: login, dashboard, user/worker management, jobs, complaints, reviews, services, analytics

Wired in AppModule:
- src/app.module.ts

---

## 3) End-to-End Flow (User Journey) With Backend Mapping

### A) Public Home: Service Browse + Search
Flow:
1) User lands on home page and browses categories/services.
2) Search filters services or workers by service.

Backend coverage:
- GET /services
- GET /services/active
- GET /services/list/all

Missing:
- Search endpoint (service + worker discovery)
- Filter by service + city + online + rating
- Map or radius search

Suggested API additions:
- GET /workers/search?serviceId=&city=&minRating=&online=&lat=&lng=&radius=
- GET /services/search?q=

---

### B) Service -> Worker Selection + Portfolio
Flow:
1) User selects a service.
2) List workers who provide the service.
3) View worker profile + portfolio.

Backend coverage:
- GET /workers
- GET /workers/verified
- GET /workers/:id
- GET /workers/:id/portfolio

Missing:
- Filtered worker list by serviceId
- Sorting (rating, price, distance)

Suggested API additions:
- GET /workers/by-service/:serviceId
- GET /workers/search (see above)

---

### C) Booking Creation
Flow:
1) Customer clicks Book Now.
2) Booking created with location + description + optional initial price.
3) Worker receives notification.

Backend coverage:
- POST /bookings

Notes:
- Booking creation currently accepts customerId in body (no auth guard)
- Initial price creates a proposal and sets status NEGOTIATION

Missing:
- Auth guards (customer must be authenticated)
- Notification trigger on booking create

---

### D) Negotiation (Price Proposals)
Flow:
1) Customer/worker proposes price
2) Counter-offers until accepted
3) Final price accepted -> booking status ACCEPTED

Backend coverage:
- POST /bookings/:id/proposals
- POST /bookings/:id/proposals/:proposalId/accept

Missing:
- Reject proposal
- Counter proposal
- Proposal history endpoints
- Enforce proposal ownership + booking status

Suggested API additions (price proposals module):
- GET /proposals/booking/:bookingId
- POST /proposals/:id/reject
- POST /proposals/:id/counter
- GET /proposals/booking/:bookingId/latest

---

### E) Chat (Booking Messaging)
Flow:
1) Customer and worker chat in real time.
2) Messages stored per booking.
3) Read receipts and push notifications.

Backend coverage:
- Prisma model exists (Message)
- No module, controller, or WebSocket gateway

Missing:
- Messages module REST endpoints
- Socket.IO gateway / room strategy
- Read receipts + offline notifications
- Attachment upload (image messages)

---

### F) Job Execution (Start + Complete)
Flow:
1) Worker accepts job and starts work
2) Worker marks IN_PROGRESS
3) Customer marks COMPLETED

Backend coverage:
- PATCH /bookings/:id/status (generic update)
- POST /bookings/:id/cancel

Missing:
- Role-specific endpoints (worker start/finish, customer complete)
- Status transition validation

Suggested endpoints:
- POST /bookings/worker/:id/accept
- POST /bookings/worker/:id/start
- POST /bookings/customer/:id/complete

---

### G) Feedback and Reviews
Flow:
1) Customer leaves rating and review after completion
2) Worker rating updated
3) Admin can moderate

Backend coverage:
- Prisma model exists (Feedback)
- Admin review moderation endpoints exist, but no customer/worker feedback module

Missing:
- Feedback module (create/get list)
- Worker public reviews endpoint

---

### H) Complaints / Disputes
Flow:
1) Customer or worker files complaint
2) Booking status -> DISPUTED
3) Admin resolves complaint

Backend coverage:
- Prisma model exists (Complaint)
- Admin endpoints for list/resolve/assign exist

Missing:
- Complaint module for customer/worker filing
- Booking status update to DISPUTED when complaint is filed

---

### I) Notifications
Flow:
1) Booking created -> notify worker
2) Proposal -> notify other party
3) Message -> push notification

Backend coverage:
- Prisma Notification model exists
- No module/controller/service implemented

Missing:
- Notifications module (REST + FCM integration)

---

### J) Worker Schedule / Availability
Flow:
1) Worker sets weekly schedule
2) Booking checks availability

Backend coverage:
- Prisma WorkerSchedule model exists

Missing:
- Schedules module (CRUD + availability checks)

---

### K) Payments + Wallet
Flow:
1) Booking completed -> payment recorded
2) Commission applied
3) Worker payout

Backend coverage:
- None (only derived wallet summary from bookings)

Missing:
- Payment models + module
- Wallet + payout workflows

---

### L) Saved Locations
Flow:
1) Customer saves frequent addresses
2) Use saved locations during booking

Backend coverage:
- Prisma SavedLocation model exists

Missing:
- Saved locations module

---

## 4) Module Status Table

| Module | Prisma Model | Code Module | Status |
|--------|--------------|-------------|--------|
| Users | Yes | Yes | Implemented |
| Workers | Yes | Yes | Implemented |
| Services | Yes | Yes | Implemented |
| Bookings | Yes | Yes | Partial (missing lifecycle + guards) |
| Price Proposals | Yes | Partial (inside bookings) | Partial |
| Messages / Chat | Yes | No | Missing |
| Notifications | Yes | No | Missing |
| Feedback | Yes | No | Missing (admin view only) |
| Complaints | Yes | No | Missing (admin view only) |
| Worker Schedule | Yes | No | Missing |
| Saved Locations | Yes | No | Missing |
| Payments | No | No | Missing |
| Uploads | No | Empty module | Missing |

---

## 5) API Coverage Map (Current vs Needed)

### Implemented
- Users: register, login, CRUD, block/unblock
- Workers: register, list, profile, portfolio, online status
- Services: list, create, update, deactivate
- Bookings: create, list, get, cancel, proposal create/accept
- Admin: dashboard, users/workers/services, jobs, complaints, reviews, analytics

### Missing or Partial
- Auth guards + role-based access control
- Booking status transitions (worker accept/start, customer complete)
- Proposal reject/counter/history
- Messages + WebSocket chat
- Notifications + FCM
- Feedback create + public reviews
- Complaint filing endpoints
- Worker schedule endpoints
- Saved locations endpoints
- Payments module + schema
- File upload endpoints (for chat images, portfolio, evidence)

---

## 6) Data Model Notes (Schema vs. Requirements)

Current schema already includes:
- Message, Notification, Feedback, Complaint, WorkerSchedule, SavedLocation, PriceProposal

Recommended schema upgrades for chat:
- Message.readAt
- Message.attachmentUrl
- Message.deletedAt
- ConversationReadState (optional)

Payments needs new models (Payment, WalletTransaction, PayoutRequest) and enums.

---

## 7) Priority Work Plan (Suggested)

Phase 0: Security and Auth
- Add JWT auth guard
- Add role guards (CUSTOMER, WORKER, ADMIN)
- Replace body userId fields with auth user

Phase 1: Booking Lifecycle + Proposals
- Add endpoints for accept/start/complete
- Enforce valid status transitions
- Add proposal reject/counter/history

Phase 2: Chat + Notifications
- Messages module (REST)
- WebSocket gateway (Socket.IO)
- Push + in-app notifications

Phase 3: Reviews, Complaints, Schedule
- Feedback module (create, get)
- Complaints module (file, list)
- Worker schedule module

Phase 4: Payments + Saved Locations + Uploads
- Payment models + module
- Saved locations module
- Upload endpoints + storage integration

---

## 8) Open Questions / Assumptions
- Will auth be phone+password only, or include OTP?
- Should booking creation allow multiple workers or only direct worker selection?
- Is payment cash-based initially or online gateway from day one?
- Should chat be blocked for cancelled bookings?

---

## 9) References
- docs/BOOKINGS_MODULE.md
- docs/CHAT_MODULE_PROJECT_PLAN.md
- docs/MESSAGES_MODULE.md
- docs/NOTIFICATIONS_MODULE.md
- docs/WORKER_SCHEDULE_MODULE.md
- docs/FEEDBACK_MODULE.md
- docs/COMPLAINT_MODULE.md
- docs/backend/payments-module.md
- docs/backend/price-proposals-module.md
- docs/backend/saved-locations-module.md
