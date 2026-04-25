# API Endpoints Reference

**Status:** Planned - Reference Document

## Base URL

```
Development: http://localhost:4000/api
Production: https://api.mehnati.marketplace/api
```

## Authentication

All authenticated endpoints require JWT token in header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Auth Endpoints

### POST `/auth/register`
Register new user (customer or worker)

**Body:**
```json
{
  "phoneNumber": "+923001234567",
  "password": "securepassword",
  "fullName": "Ali Khan",
  "role": "CUSTOMER"
}
```

### POST `/auth/login`
Login user

**Body:**
```json
{
  "phoneNumber": "+923001234567",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "phoneNumber": "+923001234567",
    "fullName": "Ali Khan",
    "role": "CUSTOMER"
  }
}
```

### POST `/auth/verify-otp`
Verify phone number with OTP

### POST `/auth/refresh`
Refresh JWT token

---

## Users Endpoints

### GET `/users/me`
Get current user profile

### PUT `/users/me`
Update current user profile

### PUT `/users/me/password`
Change password

### GET `/users/me/notifications`
Get user notifications

---

## Workers Endpoints

### GET `/workers`
Get all workers (with filters)

**Query Params:**
- `serviceId` - Filter by service
- `lat`, `lng` - Location for distance
- `maxDistance` - Max distance in km
- `minRating` - Minimum rating
- `isVerified` - Filter verified only
- `sortBy` - relevance, rating, price, distance

### GET `/workers/:id`
Get worker by ID

**Response:**
```json
{
  "id": "uuid",
  "user": {
    "fullName": "Muhammad Ali",
    "profilePicUrl": "url"
  },
  "experienceYears": 5,
  "visitingCharges": 500,
  "averageRating": 4.8,
  "totalJobsCompleted": 124,
  "services": [...],
  "portfolio": [...],
  "reviews": [...]
}
```

### GET `/workers/me`
Get current worker's profile

### PUT `/workers/me`
Update worker profile

### POST `/workers/me/portfolio`
Add portfolio item

### DELETE `/workers/me/portfolio/:id`
Delete portfolio item

### GET `/workers/me/schedule`
Get worker schedule

### PUT `/workers/me/schedule`
Update worker schedule

### PUT `/workers/me/status`
Toggle online status

---

## Services Endpoints

### GET `/services`
Get all service categories

**Response:**
```json
{
  "services": [
    {
      "id": 1,
      "name": "Electrician",
      "nameUrdu": "الیکٹریشن",
      "iconUrl": "url",
      "isActive": true
    }
  ]
}
```

### GET `/services/:id`
Get service by ID

### GET `/services/:id/workers`
Get workers for service

---

## Bookings Endpoints

### POST `/bookings`
Create new booking

**Body:**
```json
{
  "workerId": "uuid",
  "serviceId": 1,
  "description": "Fix electrical fault in kitchen",
  "jobAddress": "House 123, Street 45",
  "jobLat": 24.8607,
  "jobLng": 67.0011,
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

### GET `/bookings/:id`
Get booking by ID

### GET `/bookings/customer/my`
Get customer's bookings

### GET `/bookings/worker/my`
Get worker's bookings

### PUT `/bookings/:id/status`
Update booking status

**Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

### DELETE `/bookings/:id`
Cancel booking

---

## Price Proposals Endpoints

### POST `/proposals`
Create price proposal

**Body:**
```json
{
  "bookingId": "uuid",
  "amount": 1500,
  "parentId": "uuid" // optional for counter-offers
}
```

### GET `/proposals/booking/:bookingId`
Get all proposals for booking

### POST `/proposals/:id/accept`
Accept proposal

### POST `/proposals/:id/reject`
Reject proposal

### POST `/proposals/:id/counter`
Send counter-offer

---

## Messages Endpoints

### POST `/messages`
Send message

**Body:**
```json
{
  "bookingId": "uuid",
  "content": "When can you arrive?",
  "type": "TEXT"
}
```

### GET `/messages/booking/:bookingId`
Get messages for booking

### POST `/messages/upload`
Upload image for message

---

## Feedback Endpoints

### POST `/feedback`
Submit review

**Body:**
```json
{
  "bookingId": "uuid",
  "rating": 5,
  "comment": "Excellent work!"
}
```

### GET `/feedback/worker/:workerId`
Get worker reviews

### GET `/feedback/worker/:workerId/stats`
Get worker rating stats

---

## Complaints Endpoints

### POST `/complaints`
File complaint

**Body:**
```json
{
  "bookingId": "uuid",
  "description": "Worker did not complete the job",
  "evidenceUrls": ["url1", "url2"]
}
```

### GET `/complaints/booking/:bookingId`
Get complaint for booking

### PUT `/complaints/:id/resolve` (Admin)
Resolve complaint

---

## Notifications Endpoints

### GET `/notifications`
Get user notifications

### GET `/notifications/unread`
Get unread count

### PUT `/notifications/:id/read`
Mark as read

### PUT `/notifications/read-all`
Mark all as read

### POST `/notifications/fcm-token`
Register FCM token

---

## Locations Endpoints

### GET `/locations`
Get saved locations

### POST `/locations`
Save new location

**Body:**
```json
{
  "address": "House 123, Street 45",
  "lat": 24.8607,
  "lng": 67.0011,
  "label": "Home"
}
```

### PUT `/locations/:id`
Update location

### DELETE `/locations/:id`
Delete location

---

## Admin Endpoints

### GET `/admin/dashboard`
Get dashboard statistics

### GET `/admin/users`
List all users

### PUT `/admin/users/:id/block`
Block/unblock user

### GET `/admin/workers/pending`
Pending verifications

### PUT `/admin/workers/:id/verify`
Verify worker

### GET `/admin/complaints`
All complaints

### PUT `/admin/complaints/:id/resolve`
Resolve complaint

### POST `/admin/services`
Create service category

### PUT `/admin/services/:id`
Update service

---

## Upload Endpoints

### POST `/uploads/profile-picture`
Upload profile picture

### POST `/uploads/cnic`
Upload CNIC images

### POST `/uploads/portfolio`
Upload portfolio image

### POST `/uploads/evidence`
Upload evidence files

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Auth | 10 requests/minute |
| Bookings | 30 requests/minute |
| Messages | 60 requests/minute |
| General | 100 requests/minute |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_001` | 401 | Invalid credentials |
| `AUTH_002` | 401 | Token expired |
| `AUTH_003` | 403 | Insufficient permissions |
| `VAL_001` | 400 | Validation error |
| `NOT_001` | 404 | Resource not found |
| `DUP_001` | 409 | Duplicate resource |
| `SRV_001` | 500 | Internal server error |
