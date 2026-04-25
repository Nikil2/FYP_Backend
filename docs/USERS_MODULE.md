# Users Module Documentation

## Overview

The Users module handles user authentication, registration, and user management. It supports three user roles: `CUSTOMER`, `WORKER`, and `ADMIN`.

**Location**: `src/modules/users/`

---

## Files Structure

```
users/
├── users.module.ts           # Module configuration
├── users.controller.ts       # HTTP endpoints (10 endpoints)
├── users.service.ts          # Business logic
├── index.ts                  # Barrel exports
└── dto/
    ├── create-user.dto.ts    # Registration input validation
    ├── login.dto.ts          # Login input validation
    └── user-response.dto.ts  # User response format
```

---

## Endpoints

### 1. Register User

**Endpoint**: `POST /users/register`

**Description**: Register a new user with phone number and password.

**Request Body** (`CreateUserDto`):
```typescript
{
  phoneNumber: string;      // Pakistani phone number (e.g., 03001234567 or +923001234567)
  password: string;         // Minimum 6 characters
  fullName: string;
  profilePicUrl?: string;   // Optional
  role?: UserRole;          // Optional, defaults to CUSTOMER
  fcmToken?: string;        // Optional, for push notifications
}
```

**Response** (`UserResponseDto`):
```typescript
{
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Status Codes**:
- `201 Created` - User registered successfully
- `409 Conflict` - User with phone number already exists

**Example**:
```bash
curl -X POST http://localhost:4000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "03001234567",
    "password": "password123",
    "fullName": "Ali Khan",
    "role": "CUSTOMER"
  }'
```

---

### 2. Login User

**Endpoint**: `POST /users/login`

**Description**: Authenticate user with phone number and password.

**Request Body** (`LoginDto`):
```typescript
{
  phoneNumber: string;      // Pakistani phone number
  password: string;         // User password
}
```

**Response** (`UserResponseDto`):
```typescript
{
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Status Codes**:
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials or user blocked

**Example**:
```bash
curl -X POST http://localhost:4000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "03001234567",
    "password": "password123"
  }'
```

---

### 3. Get User by ID

**Endpoint**: `GET /users/:id`

**Description**: Retrieve user details by user ID.

**Parameters**:
- `id` (path) - User UUID

**Response** (`UserResponseDto`):
```typescript
{
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

**Example**:
```bash
curl http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000
```

---

### 4. Get User by Phone

**Endpoint**: `GET /users/phone/:phoneNumber`

**Description**: Retrieve user details by phone number.

**Parameters**:
- `phoneNumber` (path) - Pakistani phone number

**Response** (`UserResponseDto`): Same as above

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

---

### 5. Get All Users (Paginated)

**Endpoint**: `GET /users`

**Description**: Retrieve all users with pagination.

**Query Parameters**:
- `limit` (optional, default: 10) - Number of users per page
- `offset` (optional, default: 0) - Number of users to skip

**Response**:
```typescript
{
  data: UserResponseDto[];
  total: number;
}
```

**Example**:
```bash
curl "http://localhost:4000/users?limit=5&offset=0"
```

---

### 6. Update User

**Endpoint**: `PUT /users/:id`

**Description**: Update user profile information.

**Parameters**:
- `id` (path) - User UUID

**Request Body** (Partial `CreateUserDto`):
```typescript
{
  fullName?: string;
  profilePicUrl?: string;
  fcmToken?: string;
}
```

**Response** (`UserResponseDto`): Updated user object

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

**Example**:
```bash
curl -X PUT http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ali Khan Updated",
    "profilePicUrl": "https://example.com/avatar.jpg"
  }'
```

---

### 7. Verify User

**Endpoint**: `POST /users/:id/verify`

**Description**: Set user's `isVerified` status to true. Typically used by admins.

**Parameters**:
- `id` (path) - User UUID

**Response** (`UserResponseDto`): Updated user object

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

**Example**:
```bash
curl -X POST http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000/verify
```

---

### 8. Block User

**Endpoint**: `POST /users/:id/block`

**Description**: Block a user account. Blocked users cannot login.

**Parameters**:
- `id` (path) - User UUID

**Response** (`UserResponseDto`): Updated user object

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

**Example**:
```bash
curl -X POST http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000/block
```

---

### 9. Unblock User

**Endpoint**: `POST /users/:id/unblock`

**Description**: Unblock a previously blocked user.

**Parameters**:
- `id` (path) - User UUID

**Response** (`UserResponseDto`): Updated user object

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

**Example**:
```bash
curl -X POST http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000/unblock
```

---

### 10. Delete User

**Endpoint**: `DELETE /users/:id`

**Description**: Permanently delete a user account.

**Parameters**:
- `id` (path) - User UUID

**Response**:
```typescript
{
  message: "User deleted successfully"
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - User not found

**Example**:
```bash
curl -X DELETE http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000
```

---

## Service Methods

### `register(createUserDto: CreateUserDto): Promise<UserResponseDto>`

Registers a new user with the following steps:
1. Check if user with phone number already exists
2. Hash password using bcrypt (10 salt rounds)
3. Create user in database
4. Return user response DTO

**Throws**:
- `ConflictException` - If phone number is already registered

---

### `login(loginDto: LoginDto): Promise<UserResponseDto>`

Authenticates a user:
1. Find user by phone number
2. Verify password using bcrypt
3. Check if user is blocked
4. Return user response DTO (excludes password)

**Throws**:
- `UnauthorizedException` - Invalid credentials or blocked user

---

### `getUserById(userId: string): Promise<UserResponseDto>`

Retrieves a user by UUID.

**Throws**:
- `NotFoundException` - If user doesn't exist

---

### `getUserByPhone(phoneNumber: string): Promise<UserResponseDto>`

Retrieves a user by phone number.

**Throws**:
- `NotFoundException` - If user doesn't exist

---

### `getAllUsers(limit: number, offset: number): Promise<{ data: UserResponseDto[]; total: number }>`

Retrieves all users with pagination.

---

### `updateUser(userId: string, updateData: Partial<CreateUserDto>): Promise<UserResponseDto>`

Updates user profile fields.

**Throws**:
- `NotFoundException` - If user doesn't exist

---

### `verifyUser(userId: string): Promise<UserResponseDto>`

Sets `isVerified` to true.

---

### `toggleUserBlock(userId: string, isBlocked: boolean): Promise<UserResponseDto>`

Blocks or unblocks a user.

---

### `deleteUser(userId: string): Promise<void>`

Permanently deletes a user.

---

### `verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>`

Internal method to verify passwords using bcrypt.

---

## DTOs

### CreateUserDto

```typescript
import { IsPhoneNumber, IsString, IsNotEmpty, IsOptional, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
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

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.CUSTOMER;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}
```

**Validation Rules**:
- `phoneNumber`: Must be a valid Pakistani phone number
- `password`: Minimum 6 characters
- `fullName`: Required string
- `profilePicUrl`: Optional URL
- `role`: Must be valid UserRole enum (defaults to CUSTOMER)
- `fcmToken`: Optional string for push notifications

---

### LoginDto

```typescript
import { IsPhoneNumber, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('PK')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

---

### UserResponseDto

```typescript
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  id: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## User Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Books services from workers |
| `WORKER` | Provides services (requires WorkerProfile) |
| `ADMIN` | Platform management and dispute resolution |

---

## User Status Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isVerified` | boolean | false | Indicates if user identity is verified |
| `isBlocked` | boolean | false | Blocked users cannot login |

---

## Security

### Password Hashing

- Algorithm: bcrypt
- Salt rounds: 10
- Passwords are never returned in responses

### Phone Number Validation

- Format: Pakistani phone numbers only
- Accepts: `03XXXXXXXXX` or `+923XXXXXXXXX`
- Regex: `/^(\+92|0)?3[0-9]{9}$/`

---

## Error Handling

All errors are caught by the global exception filter (`AllExceptionsFilter`):

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "timestamp": "2026-04-23T12:00:00.000Z"
}
```

**Common Error Codes**:
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## Usage Examples

### Frontend Integration (TypeScript)

```typescript
// Register a new user
async function registerUser(userData: CreateUserDto) {
  const response = await fetch('http://localhost:4000/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Login
async function login(phoneNumber: string, password: string) {
  const response = await fetch('http://localhost:4000/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Get user profile
async function getUserProfile(userId: string) {
  const response = await fetch(`http://localhost:4000/users/${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

---

## Related Modules

- **Workers Module** - Extends user functionality for workers
- **Services Module** - Service categories that users can book

---

## Future Enhancements

Potential features to add:

1. JWT authentication tokens
2. Password reset via SMS
3. OTP verification for phone numbers
4. Profile picture upload endpoint
5. Email notifications
6. Two-factor authentication
7. Session management
8. Rate limiting for login attempts
