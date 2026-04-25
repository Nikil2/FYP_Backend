# Database Schema Documentation

**Status:** Implemented (Reference)

## Overview

The Mehnati Marketplace database uses PostgreSQL with Prisma ORM. The schema supports user management, worker profiles, bookings, negotiations, messaging, and dispute resolution.

## Entity Relationship Diagram

```
┌─────────────┐
│    User     │
│  (auth)     │
└──────┬──────┘
       │
       │ 1:1
       │
┌──────▼──────┐         ┌─────────────┐
│WorkerProfile│◀───────▶│WorkerService│
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ 1:N                   │ N:1
       │                       │
┌──────▼──────┐         ┌──────▼──────┐
│   Booking   │◀───────▶│   Service   │
└──────┬──────┘         └─────────────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│PriceProposal│
└─────────────┘
```

## Core Models

### User

Authentication and profile information for all platform users.

```prisma
model User {
  id             String          @id @default(uuid())
  phoneNumber    String          @unique
  password       String
  fullName       String
  profilePicUrl  String?
  role           UserRole        @default(CUSTOMER)
  isVerified     Boolean         @default(false)
  isBlocked      Boolean         @default(false)
  fcmToken       String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  // Relations
  adminProfile   AdminProfile?
  bookings       Booking[]       @relation("CustomerBookings")
  feedbackGiven  Feedback[]
  messages       Message[]
  notifications  Notification[]
  savedLocations SavedLocation[]
  workerProfile  WorkerProfile?
}
```

**Indexes:**
- `phoneNumber` (unique)

### WorkerProfile

Detailed information about workers providing services.

```prisma
model WorkerProfile {
  id                 String             @id @default(uuid())
  userId             String             @unique
  cnicNumber         String             @unique
  cnicFrontUrl       String
  cnicBackUrl        String
  bio                String?
  experienceYears    Int                @default(0)
  visitingCharges    Decimal            @db.Decimal(10, 2)
  homeAddress        String
  homeLat            Float
  homeLng            Float
  liveLat            Float?
  liveLng            Float?
  isOnline           Boolean            @default(false)
  verificationStatus VerificationStatus @default(PENDING)
  averageRating      Decimal            @default(0) @db.Decimal(2, 1)
  totalJobsCompleted Int                @default(0)
  reviewNotes        String?
  reviewedBy         String?
  selfieImageUrl     String?

  // Relations
  bookings   Booking[]          @relation("WorkerJobs")
  portfolio  WorkerPortfolio[]
  user       User               @relation(...)
  schedule   WorkerSchedule[]
  services   WorkerService[]

  @@index([isOnline, verificationStatus])
}
```

**Indexes:**
- `userId` (unique)
- `cnicNumber` (unique)
- `[isOnline, verificationStatus]` (composite)

### Service

Service categories available on the platform.

```prisma
model Service {
  id       Int             @id @default(autoincrement())
  name     String          @unique
  iconUrl  String?
  isActive Boolean         @default(true)

  // Relations
  bookings Booking[]
  workers  WorkerService[]
}
```

### Booking

Core booking entity representing job requests.

```prisma
model Booking {
  id          String          @id @default(uuid())
  customerId  String
  workerId    String
  serviceId   Int
  description String
  jobAddress  String
  jobLat      Float
  jobLng      Float
  status      BookingStatus   @default(PENDING)
  finalPrice  Decimal?        @db.Decimal(10, 2)
  scheduledAt DateTime?
  createdAt   DateTime        @default(now())

  // Relations
  customer   User            @relation("CustomerBookings", ...)
  worker     WorkerProfile   @relation("WorkerJobs", ...)
  service    Service         @relation(...)
  complaints Complaint[]
  feedback   Feedback?
  messages   Message[]
  proposals  PriceProposal[]

  @@index([customerId])
  @@index([workerId])
}
```

**Indexes:**
- `customerId`
- `workerId`

### PriceProposal

Price negotiation offers between customer and worker.

```prisma
model PriceProposal {
  id         String          @id @default(uuid())
  bookingId  String
  proposedBy String
  amount     Decimal         @db.Decimal(10, 2)
  status     ProposalStatus  @default(PENDING)
  createdAt  DateTime        @default(now())
  parentId   String?

  // Relations
  booking  Booking         @relation(..., onDelete: Cascade)
  parent   PriceProposal?  @relation("Counters", ...)
  counters PriceProposal[] @relation("Counters")

  @@index([bookingId])
}
```

### Message

In-app messages between customers and workers.

```prisma
model Message {
  id        String      @id @default(uuid())
  senderId  String
  content   String
  type      MessageType @default(TEXT)
  createdAt DateTime    @default(now())
  bookingId String

  // Relations
  booking Booking @relation(..., onDelete: Cascade)
  sender  User    @relation(...)

  @@index([bookingId])
  @@index([senderId])
}
```

### Feedback

Customer ratings and reviews for workers.

```prisma
model Feedback {
  id        String   @id @default(uuid())
  bookingId String   @unique
  userId    String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())

  // Relations
  booking Booking @relation(..., onDelete: Cascade)
  user    User    @relation(...)
}
```

**Indexes:**
- `bookingId` (unique)

### Complaint

Dispute records for problematic bookings.

```prisma
model Complaint {
  id           String        @id @default(uuid())
  bookingId    String
  adminId      String?
  description  String
  isResolved   Boolean       @default(false)
  createdAt    DateTime      @default(now())
  evidenceUrls String[]

  // Relations
  admin  AdminProfile? @relation(...)
  booking Booking      @relation(..., onDelete: Cascade)

  @@index([bookingId])
}
```

### Notification

Platform notifications for users.

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  title     String
  body      String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  // Relations
  user User @relation(..., onDelete: Cascade)

  @@index([userId])
}
```

### AdminProfile

Admin user details and permissions.

```prisma
model AdminProfile {
  id         String      @id @default(uuid())
  userId     String      @unique
  adminLevel String      @default("MODERATOR")

  // Relations
  user       User        @relation(..., onDelete: Cascade)
  complaints Complaint[]
}
```

### SavedLocation

Customer saved addresses for quick booking.

```prisma
model SavedLocation {
  id      String @id @default(uuid())
  userId  String
  address String
  lat     Float
  lng     Float

  // Relations
  user User @relation(...)
}
```

### WorkerPortfolio

Worker's work photos for display.

```prisma
model WorkerPortfolio {
  id          String        @id @default(uuid())
  workerId    String
  imageUrl    String
  description String?
  workerName  String?

  // Relations
  worker WorkerProfile @relation(..., onDelete: Cascade)

  @@index([workerName])
}
```

### WorkerSchedule

Worker availability by day of week.

```prisma
model WorkerSchedule {
  id        String        @id @default(uuid())
  workerId  String
  dayOfWeek Int
  startTime String
  endTime   String

  // Relations
  worker WorkerProfile @relation(..., onDelete: Cascade)

  @@unique([workerId, dayOfWeek])
}
```

## Enums

### UserRole

```prisma
enum UserRole {
  ADMIN
  CUSTOMER
  WORKER
}
```

### VerificationStatus

```prisma
enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### BookingStatus

```prisma
enum BookingStatus {
  PENDING
  NEGOTIATION
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DISPUTED
}
```

### MessageType

```prisma
enum MessageType {
  TEXT
  IMAGE
  PRICE_PROPOSAL
}
```

### ProposalStatus

```prisma
enum ProposalStatus {
  PENDING
  ACCEPTED
  REJECTED
  COUNTERED
}
```

## Key Relationships

| Parent | Child | Type | Cascade |
|--------|-------|------|---------|
| User | WorkerProfile | 1:1 | Delete |
| User | Booking | 1:N | - |
| WorkerProfile | Booking | 1:N | - |
| Service | Booking | 1:N | - |
| Booking | PriceProposal | 1:N | Delete |
| Booking | Message | 1:N | Delete |
| Booking | Feedback | 1:1 | Delete |
| Booking | Complaint | 1:N | Delete |

## Database Extensions

```prisma
extensions = [
  postgis,                          // Geospatial queries
  uuid_ossp(map: "uuid-ossp", schema: "extensions")
]
```

## Migration Commands

```bash
# Generate migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```
