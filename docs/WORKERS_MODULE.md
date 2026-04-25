# Workers Module Documentation

## Overview

The Workers module handles worker registration, profile management, verification, and portfolio management. Workers are users with special privileges to provide services on the platform.

**Location**: `src/modules/workers/`

---

## Files Structure

```
workers/
├── workers.module.ts           # Module configuration
├── workers.controller.ts       # HTTP endpoints (9 endpoints)
├── workers.service.ts          # Business logic
├── index.ts                    # Barrel exports
└── dto/
    ├── create-worker.dto.ts    # Worker registration validation
    └── worker-response.dto.ts  # Extended worker response format
```

---

## Key Concepts

### Worker vs User

- **User**: Base authentication entity with phone, password, and role
- **Worker**: Extended profile with CNIC, skills, location, and verification status

### Verification Flow

1. Worker registers with CNIC and documents
2. Status set to `PENDING`
3. Admin reviews and approves/rejects
4. Approved workers can accept bookings

---

## Endpoints

### 1. Register Worker

**Endpoint**: `POST /workers/register`

**Description**: Register a new worker with complete profile including services and portfolio.

**Request Body** (`CreateWorkerDto`):
```typescript
{
  // User Base Fields
  phoneNumber: string;        // Pakistani phone number
  password: string;           // Min 6 characters
  fullName: string;
  profilePicUrl?: string;
  fcmToken?: string;

  // Worker-Specific Fields
  cnicNumber: string;         // CNIC without dashes
  cnicFrontUrl: string;       // CNIC front image URL
  cnicBackUrl: string;        // CNIC back image URL
  selfieUrl?: string;         // Optional selfie for verification
  workPhotosUrls?: string[];  // Array of work sample URLs

  // Location
  homeAddress: string;
  homeLat: number;            // Latitude (-90 to 90)
  homeLng: number;            // Longitude (-180 to 180)

  // Professional Details
  experienceYears: number;    // 0 or more
  visitingCharges: number;    // Base charge for home visits
  bio?: string;               // Optional description

  // Services (at least one required)
  serviceIds: number[];       // Array of service category IDs

  // Portfolio (optional)
  portfolioImages?: Array<{
    imageUrl: string;
    description?: string;
  }>;
}
```

**Response** (`WorkerResponseDto`):
```typescript
{
  // User fields
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole.WORKER;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Worker profile fields
  workerId: string;
  cnicNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  homeAddress: string;
  homeLat: number;
  homeLng: number;
  bio?: string;
  experienceYears: number;
  visitingCharges: number;
  isOnline: boolean;
  verificationStatus: VerificationStatus;  // PENDING, APPROVED, or REJECTED
  averageRating: number;
  totalJobsCompleted: number;

  // Services worker offers
  services: Array<{
    id: number;
    name: string;
    iconUrl?: string;
  }>;

  // Portfolio images
  portfolio: Array<{
    id: string;
    imageUrl: string;
    description?: string;
  }>;
}
```

**Status Codes**:
- `201 Created` - Worker registered successfully
- `400 Bad Request` - Invalid data (coordinates, services, etc.)
- `409 Conflict` - Phone number or CNIC already registered

**Validation**:
- Phone number must be unique
- CNIC must be unique
- Coordinates must be valid (-90 to 90, -180 to 180)
- At least one service must be selected
- All service IDs must exist in database

**Example**:
```bash
curl -X POST http://localhost:4000/workers/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "03001234567",
    "password": "password123",
    "fullName": "Muhammad Ahmed",
    "cnicNumber": "421011234567",
    "cnicFrontUrl": "https://example.com/cnic-front.jpg",
    "cnicBackUrl": "https://example.com/cnic-back.jpg",
    "homeAddress": "House 123, Street 45, Islamabad",
    "homeLat": 33.6844,
    "homeLng": 73.0479,
    "experienceYears": 5,
    "visitingCharges": 500,
    "bio": "Experienced electrician specializing in home wiring",
    "serviceIds": [1, 2, 3],
    "portfolioImages": [
      {
        "imageUrl": "https://example.com/work1.jpg",
        "description": "Complete home rewiring project"
      }
    ]
  }'
```

---

### 2. Get All Workers (Paginated)

**Endpoint**: `GET /workers`

**Description**: Retrieve all workers with pagination.

**Query Parameters**:
- `skip` (optional, default: 0) - Number of workers to skip
- `take` (optional, default: 10) - Number of workers to return

**Response**:
```typescript
WorkerResponseDto[]
```

**Example**:
```bash
curl "http://localhost:4000/workers?skip=0&take=10"
```

---

### 3. Get Verified Workers

**Endpoint**: `GET /workers/verified`

**Description**: Retrieve only approved/verified workers.

**Query Parameters**:
- `skip` (optional, default: 0) - Number of workers to skip
- `take` (optional, default: 10) - Number of workers to return

**Response**:
```typescript
WorkerResponseDto[]
```

**Example**:
```bash
curl "http://localhost:4000/workers/verified?skip=0&take=10"
```

---

### 4. Get Worker by ID

**Endpoint**: `GET /workers/:id`

**Description**: Retrieve detailed worker profile by worker ID.

**Parameters**:
- `id` (path) - Worker UUID

**Response** (`WorkerResponseDto`): Complete worker profile with services and portfolio

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Worker not found

**Example**:
```bash
curl http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000
```

---

### 5. Update Worker Profile

**Endpoint**: `PUT /workers/:id`

**Description**: Update worker profile information.

**Parameters**:
- `id` (path) - Worker UUID

**Request Body** (Partial `CreateWorkerDto`):
```typescript
{
  fullName?: string;
  profilePicUrl?: string;
  fcmToken?: string;
  bio?: string;
  experienceYears?: number;
  visitingCharges?: number;
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
}
```

**Response** (`WorkerResponseDto`): Updated worker profile

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Worker not found

**Example**:
```bash
curl -X PUT http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio with 10 years of experience",
    "experienceYears": 10,
    "visitingCharges": 700
  }'
```

---

### 6. Add Portfolio Image

**Endpoint**: `POST /workers/:id/portfolio`

**Description**: Add a new portfolio image to worker's profile.

**Parameters**:
- `id` (path) - Worker UUID

**Request Body**:
```typescript
{
  imageUrl: string;
  description?: string;
}
```

**Response**:
```typescript
{
  id: string;
  imageUrl: string;
  description?: string;
}
```

**Status Codes**:
- `201 Created` - Success
- `404 Not Found` - Worker not found

**Example**:
```bash
curl -X POST http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/new-work.jpg",
    "description": "Kitchen sink installation"
  }'
```

---

### 7. Get Portfolio Images

**Endpoint**: `GET /workers/:id/portfolio`

**Description**: Retrieve all portfolio images for a worker.

**Parameters**:
- `id` (path) - Worker UUID

**Response**:
```typescript
Array<{
  id: string;
  imageUrl: string;
  description?: string;
}>
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Worker not found

**Example**:
```bash
curl http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000/portfolio
```

---

### 8. Delete Portfolio Image

**Endpoint**: `DELETE /workers/:id/portfolio/:portfolioId`

**Description**: Remove a portfolio image from worker's profile.

**Parameters**:
- `id` (path) - Worker UUID
- `portfolioId` (path) - Portfolio image UUID

**Response**:
```typescript
{
  message: string;
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Portfolio image not found
- `400 Bad Request` - Unauthorized (image doesn't belong to worker)

**Example**:
```bash
curl -X DELETE http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000/portfolio/123e4567-e89b-12d3-a456-426614174000
```

---

### 9. Update Portfolio Image Description

**Endpoint**: `PUT /workers/:id/portfolio/:portfolioId`

**Description**: Update the description of a portfolio image.

**Parameters**:
- `id` (path) - Worker UUID
- `portfolioId` (path) - Portfolio image UUID

**Request Body**:
```typescript
{
  description: string;
}
```

**Response**:
```typescript
{
  id: string;
  imageUrl: string;
  description?: string;
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Portfolio image not found
- `400 Bad Request` - Unauthorized

**Example**:
```bash
curl -X PUT http://localhost:4000/workers/550e8400-e29b-41d4-a716-446655440000/portfolio/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description of this project"
  }'
```

---

## Service Methods

### `registerWorker(createWorkerDto: CreateWorkerDto): Promise<WorkerResponseDto>`

Registers a new worker with the following steps:
1. Validate coordinates (-90 to 90, -180 to 180)
2. Validate serviceIds (at least one required)
3. Check if phone number already exists
4. Check if CNIC already registered
5. Verify all service IDs exist in database
6. Hash password using bcrypt
7. Create user with WORKER role in transaction
8. Create worker profile linked to user
9. Create worker-service relationships
10. Create portfolio images (if provided)
11. Return complete worker profile

**Throws**:
- `BadRequestException` - Invalid coordinates, no services, or invalid service IDs
- `ConflictException` - Phone or CNIC already registered

---

### `getWorkerById(workerId: string): Promise<WorkerResponseDto>`

Retrieves worker profile with services and portfolio.

**Throws**:
- `NotFoundException` - Worker not found

---

### `getWorkerByUserId(userId: string): Promise<WorkerResponseDto>`

Retrieves worker profile by associated user ID.

**Throws**:
- `NotFoundException` - Worker profile not found

---

### `updateWorker(workerId: string, updateData: Partial<CreateWorkerDto>): Promise<WorkerResponseDto>`

Updates worker profile in a transaction:
1. Update user fields (fullName, profilePicUrl, fcmToken)
2. Update worker profile fields (bio, experience, charges, location)

**Throws**:
- `NotFoundException` - Worker not found

---

### `getAllWorkers(skip: number, take: number): Promise<WorkerResponseDto[]>`

Retrieves all workers with pagination.

---

### `getVerifiedWorkers(skip: number, take: number): Promise<WorkerResponseDto[]>`

Retrieves workers with `verificationStatus: APPROVED`.

---

### `addPortfolioImage(workerId: string, imageUrl: string, description?: string): Promise<PortfolioDto>`

Adds a new portfolio image to worker.

**Throws**:
- `NotFoundException` - Worker not found

---

### `getPortfolio(workerId: string): Promise<PortfolioDto[]>`

Retrieves all portfolio images for a worker.

**Throws**:
- `NotFoundException` - Worker not found

---

### `deletePortfolioImage(workerId: string, portfolioId: string): Promise<{ message: string }>`

Deletes a portfolio image.

**Throws**:
- `NotFoundException` - Portfolio image not found
- `BadRequestException` - Image doesn't belong to worker

---

### `updatePortfolioImage(workerId: string, portfolioId: string, description: string): Promise<PortfolioDto>`

Updates portfolio image description.

**Throws**:
- `NotFoundException` - Portfolio image not found
- `BadRequestException` - Image doesn't belong to worker

---

## DTOs

### CreateWorkerDto

```typescript
export class CreateWorkerDto {
  // User Base Fields
  @IsPhoneNumber('PK')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  profilePicUrl?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;

  // Worker-Specific Fields
  @IsString()
  @IsNotEmpty()
  cnicNumber: string;

  @IsUrl()
  @IsNotEmpty()
  cnicFrontUrl: string;

  @IsUrl()
  @IsNotEmpty()
  cnicBackUrl: string;

  @IsOptional()
  @IsUrl()
  selfieUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  workPhotosUrls?: string[];

  @IsString()
  @IsNotEmpty()
  homeAddress: string;

  @IsLatitude()
  @IsNotEmpty()
  @Type(() => Number)
  homeLat: number;

  @IsLongitude()
  @IsNotEmpty()
  @Type(() => Number)
  homeLng: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  experienceYears: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  visitingCharges: number;

  @IsOptional()
  @IsString()
  bio?: string;

  // Services
  @IsArray()
  @IsNotEmpty()
  @Type(() => Number)
  serviceIds: number[];

  // Portfolio
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  portfolioImages?: Array<{
    imageUrl: string;
    description?: string;
  }>;
}
```

---

### WorkerResponseDto

```typescript
export class WorkerResponseDto {
  // User fields
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Worker profile fields
  workerId: string;
  cnicNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  homeAddress: string;
  homeLat: number;
  homeLng: number;
  bio?: string;
  experienceYears: number;
  visitingCharges: number;
  isOnline: boolean;
  verificationStatus: VerificationStatus;
  averageRating: number;
  totalJobsCompleted: number;

  // Services
  services: ServiceDto[];

  // Portfolio
  portfolio: PortfolioDto[];
}
```

---

### ServiceDto

```typescript
export class ServiceDto {
  id: number;
  name: string;
  iconUrl?: string;
}
```

---

### PortfolioDto

```typescript
export class PortfolioDto {
  id: string;
  imageUrl: string;
  description?: string;
}
```

---

## Verification Status

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting admin approval (default on registration) |
| `APPROVED` | Verified and can accept bookings |
| `REJECTED` | Verification denied (requires admin review notes) |

---

## Worker Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| `workerId` | string | Unique worker profile ID |
| `cnicNumber` | string | National ID (unique) |
| `cnicFrontUrl` | string | CNIC front image |
| `cnicBackUrl` | string | CNIC back image |
| `homeAddress` | string | Full address |
| `homeLat` | number | Home latitude |
| `homeLng` | number | Home longitude |
| `bio` | string? | Professional description |
| `experienceYears` | number | Years of experience |
| `visitingCharges` | number | Base visit fee |
| `isOnline` | boolean | Current availability status |
| `verificationStatus` | VerificationStatus | Approval status |
| `averageRating` | number | Average customer rating (0-5) |
| `totalJobsCompleted` | number | Total completed jobs |

---

## Transaction Safety

Worker registration uses database transactions to ensure data consistency:

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  // 1. Create user
  const user = await tx.user.create({ ... });

  // 2. Create worker profile
  const workerProfile = await tx.workerProfile.create({ ... });

  // 3. Link services
  for (const serviceId of serviceIds) {
    await tx.workerService.create({ ... });
  }

  // 4. Add portfolio images
  for (const portfolio of portfolioImages) {
    await tx.workerPortfolio.create({ ... });
  }

  return { user, workerProfile };
});
```

If any step fails, the entire transaction is rolled back.

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid coordinates, no services, invalid service IDs |
| `ConflictException` | 409 | Phone or CNIC already registered |
| `NotFoundException` | 404 | Worker or portfolio not found |

---

## Usage Examples

### Frontend Integration

```typescript
// Register a worker
async function registerWorker(workerData: CreateWorkerDto) {
  const response = await fetch('http://localhost:4000/workers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Get verified workers
async function getVerifiedWorkers() {
  const response = await fetch('http://localhost:4000/workers/verified');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Update worker profile
async function updateWorkerProfile(workerId: string, updateData: Partial<CreateWorkerDto>) {
  const response = await fetch(`http://localhost:4000/workers/${workerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Add portfolio image
async function addPortfolioImage(workerId: string, imageUrl: string, description?: string) {
  const response = await fetch(`http://localhost:4000/workers/${workerId}/portfolio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, description }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

---

## Related Modules

- **Users Module** - Base user authentication
- **Services Module** - Service categories workers can offer

---

## Future Enhancements

Potential features to add:

1. Worker verification by admin (approve/reject endpoints)
2. Worker search with filters (location, services, rating)
3. Worker availability schedule management
4. Worker statistics dashboard (earnings, jobs, ratings)
5. Portfolio image reordering
6. Document upload for additional verification
7. Worker specialization tags
8. Service area radius configuration
9. Real-time location tracking (liveLat, liveLng)
10. Worker performance metrics
