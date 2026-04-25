# Mehnati Marketplace - Backend Documentation

## Overview

**Mehnati Marketplace** is a full-stack platform connecting customers with skilled workers (electricians, plumbers, carpenters, etc.) across Pakistan. This is the NestJS backend service.

- **Port**: 4000 (default)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 5.8.x
- **Runtime**: Node.js with TypeScript

---

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database (43 services across 12 categories)
npm run prisma:seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:4000`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Frontend)                       │
│                    http://localhost:3000                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
│                    http://localhost:4000                     │
├─────────────────────────────────────────────────────────────┤
│  Global Pipes (ValidationPipe - whitelist, transform)        │
│  Global Filters (AllExceptionsFilter)                        │
│  Global Interceptors (TransformInterceptor)                  │
├─────────────────────────────────────────────────────────────┤
│  AppModule                                                   │
│  ├── PrismaModule (Global)                                   │
│  ├── UsersModule                                             │
│  ├── WorkersModule                                           │
│  └── ServicesModule                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase PostgreSQL                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Transaction     │  │ Direct          │                   │
│  │ Pooler (:6543)  │  │ Connection      │                   │
│  │ Prisma Client   │  │ Realtime Client │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
FYP_BACKEND/
├── prisma/
│   ├── schema.prisma              # Database schema (16 models, 5 enums)
│   ├── prisma.module.ts           # Global Prisma module
│   ├── prisma.service.ts          # PrismaService with dual connection pooling
│   ├── seed.ts                    # Seeds 43 services across 12 categories
│   └── migrations/                # Database migrations
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Health check endpoint
│   ├── app.service.ts             # Root service
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts    # Global exception filter
│   │   └── interceptors/
│   │       └── transform.interceptor.ts    # Response transformation
│   ├── modules/
│   │   ├── users/                 # User authentication & management
│   │   ├── workers/               # Worker profiles & verification
│   │   └── services/              # Service categories
│   ├── shared/
│   │   ├── utils/
│   │   │   └── pagination.util.ts
│   │   └── dto/
│   │       └── pagination.dto.ts
│   └── types/
│       └── api-response.type.ts
├── .env                           # Environment variables
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/postgres

# Server
PORT=4000
NODE_ENV=development

# Frontend
FRONTEND_URL="http://localhost:3000"

# JWT (for future authentication)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start dev server with hot-reload on port 4000 |
| `npm run build` | Create production build |
| `npm run start:prod` | Run production build |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |
| `npm run prisma:seed` | Seed database with services |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run test` | Run Jest tests |

---

## API Endpoints Summary

### Users Module (`/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/register` | Register new user |
| POST | `/users/login` | User authentication |
| GET | `/users/:id` | Get user by ID |
| GET | `/users` | Get all users (paginated) |
| PUT | `/users/:id` | Update user |
| POST | `/users/:id/verify` | Verify user |
| POST | `/users/:id/block` | Block user |
| POST | `/users/:id/unblock` | Unblock user |
| DELETE | `/users/:id` | Delete user |

### Workers Module (`/workers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workers/register` | Register worker with profile |
| GET | `/workers` | Get all workers (paginated) |
| GET | `/workers/verified` | Get verified workers only |
| GET | `/workers/:id` | Get worker by ID |
| PUT | `/workers/:id` | Update worker profile |
| POST | `/workers/:id/portfolio` | Add portfolio image |
| GET | `/workers/:id/portfolio` | Get portfolio images |
| DELETE | `/workers/:id/portfolio/:portfolioId` | Delete portfolio image |
| PUT | `/workers/:id/portfolio/:portfolioId` | Update portfolio description |

### Services Module (`/services`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/services` | Get all services |
| GET | `/services/active` | Get active services |
| GET | `/services/list/all` | Get services list |
| GET | `/services/:id` | Get service by ID |
| POST | `/services` | Create service (admin) |
| PUT | `/services/:id` | Update service |
| POST | `/services/:id/deactivate` | Deactivate service |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API welcome message |
| GET | `/health` | Health check status |

---

## Database Schema

### Models (16 total)

| Model | Description |
|-------|-------------|
| `User` | Core user entity (ADMIN, CUSTOMER, WORKER roles) |
| `WorkerProfile` | Worker-specific data (CNIC, rates, verification) |
| `AdminProfile` | Admin-level permissions |
| `Service` | Available services (43 seeded) |
| `WorkerService` | Many-to-many: workers and services |
| `Booking` | Job bookings with status workflow |
| `PriceProposal` | Price negotiation system |
| `Message` | Chat messages |
| `Feedback` | Ratings and reviews |
| `Complaint` | Dispute management |
| `Notification` | Push notifications |
| `SavedLocation` | User saved addresses |
| `WorkerPortfolio` | Worker work samples |
| `WorkerSchedule` | Worker availability |

### Enums

| Enum | Values |
|------|--------|
| `UserRole` | ADMIN, CUSTOMER, WORKER |
| `VerificationStatus` | PENDING, APPROVED, REJECTED |
| `BookingStatus` | PENDING, NEGOTIATION, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED |
| `MessageType` | TEXT, IMAGE, PRICE_PROPOSAL |
| `ProposalStatus` | PENDING, ACCEPTED, REJECTED, COUNTERED |

---

## Seeded Services (43 total)

The database is seeded with 43 services across 12 categories:

1. **Electrician** (6): Wiring, Switch/Socket, Fan, Light, Circuit Breaker, UPS/Inverter
2. **Plumber** (6): Leak Repair, Pipe Installation, Tap/Faucet, Toilet, Drain Cleaning, Geyser
3. **Carpenter** (5): Door, Cabinet, Furniture, Shelf, Wood Polishing
4. **Painter** (5): Wall, Exterior, Wood Polish, Waterproofing, Texture/Design
5. **AC Technician** (5): Installation, Repair, Service, Gas Refilling, Deep Cleaning
6. **Mason** (5): Wall Construction, Tile Work, Plastering, Flooring, Demolition
7. **Mechanic** (5): Bike Repair, Car Repair, Oil Change, Tire, Battery
8. **Home Cleaner** (5): Full Home, Kitchen, Bathroom, Sofa/Carpet, Water Tank
9. **Tailoring** (3): Ladies, Gents, Alterations
10. **Car Care** (4): Wash, Maintenance, Tire, Interior Cleaning
11. **Home Construction** (4): Mason/Tile, Carpenter, Painter, Welding
12. **Pest Control** (1): Pest Control

---

## Key Design Patterns

1. **Repository Pattern** - PrismaService as data access layer
2. **DTO Pattern** - Strict input/output validation with `class-validator`
3. **Service-Controller Separation** - Business logic isolated from HTTP layer
4. **Global Module** - PrismaModule available everywhere
5. **Transaction Support** - Worker registration uses `$transaction`
6. **Dual Connection Pooling** - Separate clients for REST and real-time operations

---

## Module Documentation

- [Users Module](./docs/USERS_MODULE.md) - User authentication and management
- [Workers Module](./docs/WORKERS_MODULE.md) - Worker profiles and verification
- [Services Module](./docs/SERVICES_MODULE.md) - Service categories management

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | NestJS 10.x |
| Runtime | Node.js (TypeScript) |
| ORM | Prisma 5.8.x |
| Database | PostgreSQL (Supabase) |
| Password Hashing | bcrypt |
| Validation | class-validator, class-transformer |

---

## Development Guidelines

### Validation

All DTOs use `class-validator` decorators for input validation:

```typescript
import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class CreateUserDto {
  @IsPhoneNumber('PK')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
```

### Error Handling

The global exception filter (`AllExceptionsFilter`) catches all errors and returns consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "timestamp": "2026-04-23T12:00:00.000Z"
}
```

### Response Format

The `TransformInterceptor` wraps all responses in a standard format:

```json
{
  "data": { ... },
  "statusCode": 200,
  "message": "Success",
  "timestamp": "2026-04-23T12:00:00.000Z"
}
```

---

## Database Connection

The `PrismaService` uses dual connection pooling:

1. **Primary Client** (port 6543) - Transaction pooler for REST API
2. **Realtime Client** (port 5432) - Direct connection for Socket.IO/chat

```typescript
// Usage in services
constructor(private prisma: PrismaService) {}

// For regular queries
await this.prisma.user.findMany();

// For real-time operations (future)
await this.prisma.realtimeClient.message.create();
```

---

## Contact

For questions or issues, refer to the main project documentation.
