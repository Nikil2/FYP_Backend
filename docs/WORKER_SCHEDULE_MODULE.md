# Worker Schedule Module Documentation

## Overview

The Worker Schedule module allows workers to define their availability by day of week and time slots. This helps customers book workers only during their available hours and enables the platform to show accurate availability.

**Location**: `src/modules/worker-schedules/`

**Priority**: MEDIUM

---

## Files Structure

```
worker-schedules/
├── worker-schedules.module.ts      # Module configuration
├── worker-schedules.controller.ts  # HTTP endpoints (8 endpoints)
├── worker-schedules.service.ts     # Business logic
├── index.ts                        # Barrel exports
├── dto/
│   ├── create-schedule.dto.ts      # Add availability validation
│   ├── update-schedule.dto.ts      # Update schedule
│   └── schedule-response.dto.ts    # Schedule response format
└── utils/
    └── schedule-utils.ts           # Availability calculation helpers
```

---

## Database Schema Reference

```prisma
model WorkerSchedule {
  id        String        @id @default(uuid())
  workerId  String
  dayOfWeek Int           // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime String        // Format: "HH:mm" (24-hour)
  endTime   String        // Format: "HH:mm" (24-hour)
  worker    WorkerProfile @relation(fields: [workerId], onDelete: Cascade)

  @@unique([workerId, dayOfWeek])
}
```

**Note**: Unique constraint means one schedule entry per day per worker.
Workers can have multiple time slots per day by creating multiple entries (if schema is updated).

---

## Day of Week Mapping

| Value | Day |
|-------|-----|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

---

## Time Format

- **Format**: 24-hour `HH:mm`
- **Examples**:
  - `"09:00"` = 9:00 AM
  - `"14:30"` = 2:30 PM
  - `"18:00"` = 6:00 PM

---

## Endpoints

### Worker Schedule Endpoints

#### 1. Get My Schedule

**Endpoint**: `GET /schedules/my-schedule`

**Description**: Get the authenticated worker's complete weekly schedule.

**Response**:
```typescript
{
  workerId: string;
  schedules: Array<{
    id: string;
    dayOfWeek: number;
    dayName: string;     // e.g., "Monday"
    startTime: string;
    endTime: string;
    isAvailable: boolean; // false if no schedule for this day
  }>;
  totalHoursPerWeek: number;
}
```

**Example**:
```bash
curl http://localhost:4000/schedules/my-schedule \
  -H "Authorization: Bearer <worker_token>"
```

**Sample Response**:
```json
{
  "workerId": "550e8400-e29b-41d4-a716-446655440000",
  "schedules": [
    {
      "id": "sch_001",
      "dayOfWeek": 1,
      "dayName": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    },
    {
      "id": "sch_002",
      "dayOfWeek": 2,
      "dayName": "Tuesday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    },
    {
      "id": null,
      "dayOfWeek": 3,
      "dayName": "Wednesday",
      "startTime": null,
      "endTime": null,
      "isAvailable": false
    }
  ],
  "totalHoursPerWeek": 48
}
```

---

#### 2. Set/Update Schedule for Day

**Endpoint**: `POST /schedules/day/:dayOfWeek`

**Description**: Set or update availability for a specific day.

**Path Parameters**:
- `dayOfWeek` (0-6) - Day to set

**Request Body** (`CreateScheduleDto`):
```typescript
{
  startTime: string;    // "HH:mm" format
  endTime: string;      // "HH:mm" format
}
```

**Response**:
```typescript
{
  id: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  isAvailable: true;
}
```

**Status Codes**:
- `200 OK` - Schedule updated (was already set)
- `201 Created` - New schedule created
- `400 Bad Request` - Invalid time format, end before start
- `403 Forbidden` - Not the worker owner

**Validation**:
- `startTime` must be before `endTime`
- Times must be valid (00:00 - 23:59)
- Cannot schedule more than 24 hours

**Example**:
```bash
curl -X POST http://localhost:4000/schedules/day/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <worker_token>" \
  -d '{
    "startTime": "09:00",
    "endTime": "18:00"
  }'
```

---

#### 3. Remove Schedule for Day

**Endpoint**: `DELETE /schedules/day/:dayOfWeek`

**Description**: Remove availability for a specific day (mark as unavailable).

**Status Codes**:
- `200 OK` - Schedule removed
- `404 Not Found` - No schedule for this day
- `403 Forbidden` - Not the worker owner

**Example**:
```bash
curl -X DELETE http://localhost:4000/schedules/day/3 \
  -H "Authorization: Bearer <worker_token>"
```

---

#### 4. Set Weekly Schedule (Bulk)

**Endpoint**: `POST /schedules/weekly`

**Description**: Set complete weekly schedule in one request.

**Request Body**:
```typescript
{
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}
```

**Response**:
```typescript
{
  success: boolean;
  schedules: Array<{
    id: string;
    dayOfWeek: number;
    dayName: string;
    startTime: string;
    endTime: string;
  }>;
  totalHoursPerWeek: number;
}
```

**Business Logic**:
1. Validate all days (0-6) are unique
2. Validate all time formats
3. Create/update in transaction
4. Remove days not in request (optional, or keep existing)

**Example**:
```bash
curl -X POST http://localhost:4000/schedules/weekly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <worker_token>" \
  -d '{
    "schedules": [
      { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" },
      { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00" },
      { "dayOfWeek": 3, "startTime": "09:00", "endTime": "17:00" },
      { "dayOfWeek": 4, "startTime": "09:00", "endTime": "17:00" },
      { "dayOfWeek": 5, "startTime": "09:00", "endTime": "12:00" },
      { "dayOfWeek": 6, "startTime": "10:00", "endTime": "15:00" }
    ]
  }'
```

---

#### 5. Check Worker Availability

**Endpoint**: `GET /schedules/worker/:workerId/availability`

**Description**: Check if worker is available at specific date/time.

**Query Parameters**:
- `date` (optional) - Specific date (ISO 8601). If not provided, uses today.
- `time` (optional) - Specific time (HH:mm). If not provided, checks current time.

**Response**:
```typescript
{
  workerId: string;
  workerName: string;
  isAvailable: boolean;
  isOnline: boolean;
  currentDaySchedule: {
    dayOfWeek: number;
    dayName: string;
    startTime: string;
    endTime: string;
  } | null;
  nextAvailableSlot: {
    date: string;
    dayName: string;
    startTime: string;
    endTime: string;
  } | null;
}
```

**Business Logic**:
1. Get worker's schedule for the day
2. Check if requested time falls within schedule
3. Consider worker's `isOnline` status
4. Consider verification status
5. Find next available slot if currently unavailable

**Example**:
```bash
curl "http://localhost:4000/schedules/worker/550e8400-e29b-41d4-a716-446655440000/availability?date=2026-04-25&time=14:00"
```

---

#### 6. Get Available Time Slots

**Endpoint**: `GET /schedules/worker/:workerId/slots`

**Description**: Get available booking time slots for a worker.

**Query Parameters**:
- `date` (required) - Date to check (ISO 8601)
- `duration` (optional, default: 60) - Required slot duration in minutes

**Response**:
```typescript
{
  date: string;
  workerId: string;
  availableSlots: Array<{
    startTime: string;
    endTime: string;
    duration: number;  // minutes
  }>;
  unavailableReason?: string;  // If no slots available
}
```

**Business Logic**:
1. Get worker's schedule for the day
2. Get existing bookings for that day
3. Subtract booked slots from schedule
4. Return remaining available slots
5. Filter by minimum duration

**Example**:
```bash
curl "http://localhost:4000/schedules/worker/550e8400-e29b-41d4-a716-446655440000/slots?date=2026-04-25&duration=120"
```

**Sample Response**:
```json
{
  "date": "2026-04-25",
  "workerId": "550e8400-e29b-41d4-a716-446655440000",
  "availableSlots": [
    {
      "startTime": "09:00",
      "endTime": "11:00",
      "duration": 120
    },
    {
      "startTime": "14:00",
      "endTime": "17:00",
      "duration": 180
    }
  ]
}
```

---

### Customer/Booking Integration Endpoints

#### 7. Check Availability for Booking

**Endpoint**: `GET /schedules/check-availability`

**Description**: Check if requested booking time works with worker's schedule.

**Query Parameters**:
- `workerId` (required)
- `scheduledAt` (required) - Proposed booking datetime
- `duration` (optional, default: 60) - Expected job duration

**Response**:
```typescript
{
  isAvailable: boolean;
  workerId: string;
  requestedTime: DateTime;
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  } | null;
  conflictsWith?: {
    bookingId: string;
    service: { name: string };
    scheduledAt: DateTime;
  };
  suggestedSlots?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}
```

---

#### 8. Get Worker's Weekly Overview (Public)

**Endpoint**: `GET /workers/:workerId/schedule`

**Description**: Public view of worker's weekly availability (for customer viewing).

**Response**:
```typescript
{
  workerId: string;
  workerName: string;
  verificationStatus: VerificationStatus;
  weeklySchedule: Array<{
    dayOfWeek: number;
    dayName: string;
    isAvailable: boolean;
    startTime?: string;
    endTime?: string;
  }>;
  acceptsUrgentBookings: boolean;  // Based on isOnline
}
```

**Privacy Notes**:
- Shows availability only, not detailed schedule
- Does not show slots already booked
- Shows verification status

---

## DTOs

### CreateScheduleDto

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid time format. Use HH:mm (24-hour format)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid time format. Use HH:mm (24-hour format)',
  })
  endTime: string;
}
```

---

### WeeklyScheduleDto

```typescript
import { IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduleDto } from './create-schedule.dto';

class DayScheduleDto extends CreateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;
}

export class WeeklyScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  schedules: DayScheduleDto[];
}
```

---

### ScheduleResponseDto

```typescript
export class ScheduleResponseDto {
  id: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  totalHours: number;
}
```

---

## Service Methods

### `setSchedule(workerId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<ScheduleResponseDto>`

```typescript
async setSchedule(workerId: string, dayOfWeek: number, startTime: string, endTime: string) {
  // Validate time format
  this.validateTimeFormat(startTime);
  this.validateTimeFormat(endTime);

  // Validate end time is after start time
  if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
    throw new BadRequestException('End time must be after start time');
  }

  // Upsert schedule
  const schedule = await this.prisma.workerSchedule.upsert({
    where: {
      workerId_dayOfWeek: {
        workerId,
        dayOfWeek,
      },
    },
    update: {
      startTime,
      endTime,
    },
    create: {
      workerId,
      dayOfWeek,
      startTime,
      endTime,
    },
  });

  return this.mapToResponse(schedule);
}
```

---

### `isWorkerAvailable(workerId: string, dateTime: DateTime, durationMinutes: number): Promise<boolean>`

```typescript
async isWorkerAvailable(
  workerId: string,
  dateTime: DateTime,
  durationMinutes: number,
): Promise<boolean> {
  const dayOfWeek = dateTime.getDay();
  const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();

  // Get schedule for this day
  const schedule = await this.prisma.workerSchedule.findUnique({
    where: {
      workerId_dayOfWeek: {
        workerId,
        dayOfWeek,
      },
    },
  });

  if (!schedule) return false;  // Not available this day

  const startMinutes = this.timeToMinutes(schedule.startTime);
  const endMinutes = this.timeToMinutes(schedule.endTime);

  // Check if time falls within schedule
  if (timeMinutes < startMinutes || timeMinutes + durationMinutes > endMinutes) {
    return false;
  }

  // Check for existing bookings
  const conflictingBooking = await this.prisma.booking.findFirst({
    where: {
      workerId,
      scheduledAt: {
        gte: dateTime,
        lt: new Date(dateTime.getTime() + durationMinutes * 60000),
      },
      status: {
        in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'],
      },
    },
  });

  if (conflictingBooking) return false;

  return true;
}
```

---

### `getAvailableSlots(workerId: string, date: string, durationMinutes: number): Promise<AvailableSlot[]>`

Returns all available time slots for a given day.

---

## Schedule Utilities

### Time Conversion Helpers

```typescript
// Convert "HH:mm" to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to "HH:mm"
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate duration between two times
function calculateDuration(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

// Get day name from day number
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}
```

---

## Error Handling

| Error | Status Code | When |
|-------|-------------|------|
| `BadRequestException` | 400 | Invalid time format, end before start |
| `NotFoundException` | 404 | Worker not found |
| `ForbiddenException` | 403 | Not the worker owner |

---

## Integration with Bookings

When customer creates a booking:

```typescript
// In BookingsService.createBooking()
async createBooking(dto: CreateBookingDto, customerId: string) {
  // ... existing validation

  // Check worker availability if scheduledAt provided
  if (dto.scheduledAt) {
    const isAvailable = await this.scheduleService.isWorkerAvailable(
      dto.workerId,
      new Date(dto.scheduledAt),
      60,  // Default 1 hour duration
    );

    if (!isAvailable) {
      throw new BadRequestException('Worker is not available at the requested time');
    }
  }

  // ... create booking
}
```

---

## Future Enhancements

1. **Multiple slots per day** - Support split shifts (e.g., 9-12 and 14-18)
2. **Break times** - Define lunch breaks within schedule
3. **Holiday schedule** - Special hours for holidays
4. **Vacation mode** - Temporarily mark as unavailable
5. **Recurring exceptions** - "Every first Saturday off"
6. **Buffer time** - Gap between bookings for travel
7. **Max bookings per day** - Limit daily workload
8. **Advance notice** - Minimum hours before booking
9. **Timezone support** - For workers traveling between cities
10. **Auto-schedule suggestions** - AI-based optimal hours

---

## Related Modules

- **Workers Module** - Worker profile integration
- **Bookings Module** - Availability checking for bookings
- **Admin Module** - Admin override of schedules
