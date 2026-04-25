# Worker Schedule Module

**Status:** Planned - To Be Implemented

## Purpose

The Worker Schedule module manages worker availability by day of week and time slots. It helps customers know when workers are available and prevents booking conflicts.

## Expected Functionality

### Core Features
- Set availability by day of week
- Define start and end times for each day
- Update availability schedule
- Check worker availability for specific times
- Block out specific dates (holidays, personal time)

### Day Mapping
```
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

### Business Logic
- Each worker has one schedule entry per day
- Time format: 24-hour (HH:mm)
- Workers can set themselves as unavailable by not having entries
- Schedule is used to filter available workers during booking

## Planned API Endpoints

### Worker Schedule Controller (`/api/workers/:workerId/schedule`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get worker's full schedule |
| PUT | `/` | Update entire schedule |
| PUT | `/:dayId` | Update specific day |
| POST | `/` | Set availability for day |
| DELETE | `/:dayId` | Remove day availability |
| GET | `/available/:date` | Check availability for date |

## DTOs to Implement

```typescript
// CreateScheduleDto
{
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

// UpdateScheduleDto
{
  startTime?: string;
  endTime?: string;
}

// ScheduleResponseDto
{
  id: string;
  workerId: string;
  dayOfWeek: number;
  dayName: string; // "Monday", etc.
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// CheckAvailabilityDto
{
  workerId: string;
  date: string; // ISO date
  time?: string; // Optional specific time
}
```

## Database Relations

- `WorkerSchedule.worker` → WorkerProfile (schedule owner)

## Implementation Notes

### Phase 1 (Basic Schedule)
- [ ] CRUD operations for schedule
- [ ] Get full week schedule
- [ ] Update individual days

### Phase 2 (Availability Checking)
- [ ] Check if worker available on date
- [ ] Filter workers by availability
- [ ] Integration with booking flow

### Phase 3 (Advanced)
- [ ] Exception dates (holidays, time off)
- [ ] Recurring schedule patterns
- [ ] Buffer time between bookings
- [ ] Maximum bookings per day limits

## Dependencies

- **Required Modules:** Workers
- **Integrates With:** Bookings

## Security Considerations

- Workers can only manage their own schedule
- Time validation (startTime < endTime)
- Prevent overlapping time slots
- Consider timezone handling for future

## Example Schedule Response

```json
{
  "workerId": "abc123",
  "schedule": [
    {
      "id": "sched1",
      "dayOfWeek": 1,
      "dayName": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    },
    {
      "id": "sched2",
      "dayOfWeek": 2,
      "dayName": "Tuesday",
      "startTime": "10:00",
      "endTime": "18:00",
      "isAvailable": true
    }
    // ... other days
  ]
}
```

## Urdu Translation Support

- "Schedule" / "شیڈول"
- "Availability" / "دستیابی"
- "Working Hours" / "کام کے اوقات"
- "Sunday" to "Saturday" / "اتوار" to "ہفتہ"
