# User Registration Feature Documentation

## Overview
Complete user registration and management feature for FYP Backend using NestJS, Prisma, and PostgreSQL.

## Database Schema Requirements (From Prisma)

The **User** model includes the following fields:

```prisma
model User {
  id            String    @id @default(uuid())          // Unique identifier
  phoneNumber   String    @unique                        // Unique phone number (Pakistan format)
  fullName      String                                   // User's full name
  profilePicUrl String?                                  // Optional profile picture URL
  role          UserRole  @default(CUSTOMER)            // User role (ADMIN, CUSTOMER, WORKER)
  isVerified    Boolean   @default(false)               // Verification status
  isBlocked     Boolean   @default(false)               // Block status
  fcmToken      String?                                  // Firebase Cloud Messaging token (push notifications)
  createdAt     DateTime  @default(now())               // Account creation timestamp
  updatedAt     DateTime  @updatedAt                    // Last update timestamp
}
```

### User Roles
- **CUSTOMER**: Regular user booking services
- **WORKER**: Service provider offering services
- **ADMIN**: System administrator

## API Endpoints

### 1. Register New User
**POST** `/users/register`

**Request Body:**
```json
{
  "phoneNumber": "+923001234567",
  "fullName": "John Doe",
  "profilePicUrl": "https://example.com/pic.jpg",
  "fcmToken": "optional-fcm-token",
  "role": "CUSTOMER"
}
```

**Request Validation:**
- `phoneNumber`: Required, must be valid Pakistan phone number format
- `fullName`: Required, must be a string
- `profilePicUrl`: Optional
- `fcmToken`: Optional (for push notifications)
- `role`: Optional, defaults to "CUSTOMER"

**Response (201 Created):**
```json
{
  "id": "uuid-string",
  "phoneNumber": "+923001234567",
  "fullName": "John Doe",
  "profilePicUrl": "https://example.com/pic.jpg",
  "role": "CUSTOMER",
  "isVerified": false,
  "isBlocked": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `409 Conflict`: User with phone number already exists
- `400 Bad Request`: Invalid validation (invalid phone format, missing required fields)

---

### 2. Get User by ID
**GET** `/users/:id`

**Response (200 OK):**
```json
{
  "id": "uuid-string",
  "phoneNumber": "+923001234567",
  "fullName": "John Doe",
  "profilePicUrl": "https://example.com/pic.jpg",
  "role": "CUSTOMER",
  "isVerified": true,
  "isBlocked": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: User with given ID doesn't exist

---

### 3. Get All Users (Paginated)
**GET** `/users?limit=10&offset=0`

**Query Parameters:**
- `limit`: Number of users per page (default: 10)
- `offset`: Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "phoneNumber": "+923001234567",
      "fullName": "John Doe",
      "profilePicUrl": "https://example.com/pic.jpg",
      "role": "CUSTOMER",
      "isVerified": true,
      "isBlocked": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### 4. Update User Profile
**PUT** `/users/:id`

**Request Body (all fields optional):**
```json
{
  "fullName": "Jane Doe",
  "profilePicUrl": "https://example.com/new-pic.jpg",
  "fcmToken": "new-fcm-token"
}
```

**Response (200 OK):** Updated user object

---

### 5. Verify User
**POST** `/users/:id/verify`

Sets `isVerified` to `true`

**Response (200 OK):** Updated user object with `isVerified: true`

---

### 6. Block User
**POST** `/users/:id/block`

Sets `isBlocked` to `true`

**Response (200 OK):** Updated user object with `isBlocked: true`

---

### 7. Unblock User
**POST** `/users/:id/unblock`

Sets `isBlocked` to `false`

**Response (200 OK):** Updated user object with `isBlocked: false`

---

### 8. Delete User
**DELETE** `/users/:id`

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: User not found

---

## File Structure

```
src/modules/users/
├── users.module.ts              # Module definition
├── users.controller.ts          # API endpoints
├── users.service.ts             # Business logic
├── index.ts                      # Barrel exports
└── dto/
    ├── create-user.dto.ts       # Registration DTO with validation
    └── user-response.dto.ts     # Response DTO
```

---

## Usage Example (cURL)

### Register a new user:
```bash
curl -X POST http://localhost:4000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+923001234567",
    "fullName": "Ahmed Khan",
    "role": "CUSTOMER"
  }'
```

### Get user by ID:
```bash
curl http://localhost:4000/users/uuid-string
```

### Get all users:
```bash
curl http://localhost:4000/users?limit=10&offset=0
```

### Verify a user:
```bash
curl -X POST http://localhost:4000/users/uuid-string/verify
```

### Block a user:
```bash
curl -X POST http://localhost:4000/users/uuid-string/block
```

---

## Features Implemented

✅ **User Registration** - Phone number validation, duplicate check
✅ **User Retrieval** - Get by ID, get all (paginated)
✅ **User Updates** - Update profile information
✅ **User Verification** - Verify user account
✅ **User Management** - Block/Unblock users
✅ **User Deletion** - Soft/Hard delete
✅ **Input Validation** - Class-validator DTOs
✅ **Error Handling** - Proper HTTP exceptions
✅ **Response Mapping** - DTO transformation

---

## Technology Stack

- **Framework**: NestJS 10.0.0
- **Database ORM**: Prisma 5.8.0
- **Database**: PostgreSQL (Supabase)
- **Validation**: class-validator
- **Language**: TypeScript

---

## Next Steps

1. **Run migrations**: `npm run prisma:migrate`
2. **Start server**: `npm run start:dev`
3. **Test endpoints**: Use the cURL examples above
4. **Add authentication**: Consider implementing JWT for protected endpoints
5. **Add more features**: Worker profile, bookings, etc.
