# Complaints (Disputes) Module

**Status:** Planned - To Be Implemented

## Purpose

The Complaints module provides a dispute resolution mechanism for bookings that encounter issues. It allows customers or workers to file complaints that are reviewed and resolved by platform administrators.

## Expected Functionality

### Core Features
- File complaints for active/completed bookings
- Attach evidence (images, documents)
- Admin review and assignment
- Resolution tracking
- Complaint history

### Complaint Lifecycle
```
FILED → UNDER_REVIEW → RESOLVED
              ↓
         ESCALATED (to senior admin)
```

### Business Logic
- Complaints can only be filed for ACCEPTED, IN_PROGRESS, or COMPLETED bookings
- Either party (customer or worker) can file a complaint
- Filing a complaint automatically sets booking status to DISPUTED
- Admin resolution can result in: refund, penalty, or no action
- Evidence must be provided with complaint

## Planned API Endpoints

### Complaints Controller (`/api/complaints`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | File new complaint |
| GET | `/` | Get all complaints (admin) |
| GET | `/booking/:bookingId` | Get complaint for booking |
| GET | `/:id` | Get complaint details |
| PUT | `/:id/assign` | Assign complaint to admin |
| PUT | `/:id/resolve` | Resolve complaint |
| PUT | `/:id/status` | Update complaint status |

## DTOs to Implement

```typescript
// CreateComplaintDto
{
  bookingId: string;
  description: string;
  evidenceUrls: string[];
}

// AssignComplaintDto
{
  adminId: string;
}

// ResolveComplaintDto
{
  resolution: string;
  actionTaken: 'REFUND' | 'PENALTY' | 'WARNING' | 'NO_ACTION';
}

// ComplaintResponseDto
{
  id: string;
  booking: BookingSummaryDto;
  filedBy: {
    id: string;
    fullName: string;
    role: UserRole;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    adminLevel: string;
  };
  description: string;
  evidenceUrls: string[];
  isResolved: boolean;
  resolution?: string;
  actionTaken?: string;
  createdAt: string;
  resolvedAt?: string;
}
```

## Database Relations

- `Complaint.booking` → Booking (disputed booking)
- `Complaint.admin` → AdminProfile? (assigned admin)

## Implementation Notes

### Phase 1 (Basic Complaints)
- [ ] File complaint with evidence
- [ ] Admin complaint list
- [ ] Basic resolution workflow

### Phase 2 (Admin Tools)
- [ ] Admin assignment system
- [ ] Complaint priority levels
- [ ] SLA tracking (response time)

### Phase 3 (Advanced)
- [ ] Automated evidence analysis
- [ ] Pattern detection (repeat offenders)
- [ ] Appeal mechanism
- [ ] Penalty point system for workers

## Dependencies

- **Required Modules:** Bookings, Users, Admin
- **Integrates With:** Notifications, Feedback

## Security Considerations

- Only booking participants can file complaints
- Admin-level restrictions for viewing/assigning complaints
- Evidence URLs must be validated and sanitized
- Complaint data is sensitive - access logging recommended

## Admin Levels

```
MODERATOR - Can view and resolve basic complaints
SENIOR_MODERATOR - Can handle escalated complaints
SUPER_ADMIN - Can override decisions, manage policies
```

## Urdu Translation Support

- "File Complaint" / "شکایت درج کریں"
- "Dispute Resolution" / "تنازعہ حل"
- "Under Review" / "جائزہ لیا جا رہا ہے"
- "Resolved" / "حل ہو گیا"
- "Evidence" / "ثبوت"
