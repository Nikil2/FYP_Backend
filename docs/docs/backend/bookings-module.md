# Bookings Module

**Status:** Planned - To Be Implemented

## Purpose

The Bookings module is the core of the Mehnati Marketplace platform. It manages the complete lifecycle of service bookings between customers and workers, from initial request to job completion.

## Expected Functionality

### Core Features
- Create new booking requests with service details, location, and description
- Update booking status through the workflow (PENDING → NEGOTIATION → ACCEPTED → IN_PROGRESS → COMPLETED)
- Retrieve bookings by customer or worker
- Cancel bookings (with business logic validation)
- Get booking details with related proposals, messages, and feedback

### Booking Status Flow
```
PENDING → NEGOTIATION → ACCEPTED → IN_PROGRESS → COMPLETED
                               ↓
                          CANCELLED
                               ↓
                          DISPUTED
```

### Business Logic
- Customers can cancel before ACCEPTED status
- Workers can only accept/reject bookings in NEGOTIATION status
- Dispute can be raised by either party after ACCEPTED
- Automatic status updates based on proposal acceptance

## Planned API Endpoints

### Booking Controller (`/api/bookings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new booking |
| GET | `/` | Get all bookings (admin) |
| GET | `/:id` | Get booking by ID |
| GET | `/customer/my` | Get customer's bookings |
| GET | `/worker/my` | Get worker's bookings |
| PUT | `/:id/status` | Update booking status |
| DELETE | `/:id` | Cancel booking |
| GET | `/:id/proposals` | Get price proposals for booking |
| GET | `/:id/messages` | Get messages for booking |

## DTOs to Implement

```typescript
// CreateBookingDto
{
  serviceId: number;
  description: string;
  jobAddress: string;
  jobLat: number;
  jobLng: number;
  scheduledAt?: string;
}

// UpdateBookingStatusDto
{
  status: BookingStatus;
}

// BookingResponseDto
{
  id: string;
  customer: UserResponseDto;
  worker: WorkerResponseDto;
  service: ServiceResponseDto;
  description: string;
  jobAddress: string;
  status: BookingStatus;
  finalPrice?: number;
  scheduledAt?: string;
  createdAt: string;
}
```

## Database Relations

- `Booking.customer` → User (customer who created booking)
- `Booking.worker` → WorkerProfile (assigned worker)
- `Booking.service` → Service (type of service)
- `Booking.proposals` → PriceProposal[] (negotiation history)
- `Booking.messages` → Message[] (chat history)
- `Booking.feedback` → Feedback (rating after completion)
- `Booking.complaints` → Complaint[] (disputes if any)

## Implementation Notes

### Phase 1 (MVP)
- [ ] Basic CRUD operations
- [ ] Status management
- [ ] Customer/Worker booking lists

### Phase 2 (Negotiation)
- [ ] Price proposal integration
- [ ] Messaging integration
- [ ] Real-time status updates

### Phase 3 (Advanced)
- [ ] Scheduled bookings
- [ ] Recurring bookings
- [ ] Booking analytics
- [ ] Automatic worker assignment (future enhancement)

## Dependencies

- **Required Modules:** Users, Workers, Services
- **Integrates With:** Price Proposals, Messages, Feedback, Complaints

## Security Considerations

- Customers can only view/modify their own bookings
- Workers can only view bookings assigned to them
- Admin can view all bookings
- Status transitions must be validated (e.g., cannot go from COMPLETED to PENDING)
- Audit log for status changes recommended
