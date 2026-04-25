# Price Proposals Module

**Status:** Planned - To Be Implemented

## Purpose

The Price Proposals module enables price negotiation between customers and workers. It allows both parties to send and counter price offers until an agreement is reached.

## Expected Functionality

### Core Features
- Create price proposals for a booking
- Send counter-offers to existing proposals
- Accept or reject proposals
- Track proposal history per booking
- Auto-update booking status on proposal acceptance

### Proposal Status Flow
```
PENDING → ACCEPTED
        → REJECTED
        → COUNTERED (creates child proposal)
```

### Business Logic
- Both customer and worker can initiate proposals
- Only the most recent PENDING proposal can be accepted
- Accepting a proposal sets the booking's finalPrice
- Accepting a proposal changes booking status to ACCEPTED
- Counter-offers link to parent proposal for history tracking

## Planned API Endpoints

### Price Proposals Controller (`/api/proposals`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new price proposal |
| GET | `/booking/:bookingId` | Get all proposals for a booking |
| POST | `/:id/accept` | Accept a proposal |
| POST | `/:id/reject` | Reject a proposal |
| POST | `/:id/counter` | Send counter-offer |
| GET | `/booking/:bookingId/latest` | Get latest pending proposal |

## DTOs to Implement

```typescript
// CreateProposalDto
{
  bookingId: string;
  amount: number;
  parentId?: string; // For counter-offers
}

// ProposalResponseDto
{
  id: string;
  bookingId: string;
  proposedBy: string; // userId
  proposedByRole: 'CUSTOMER' | 'WORKER';
  amount: number;
  status: ProposalStatus;
  createdAt: string;
  parent?: ProposalResponseDto;
  counters?: ProposalResponseDto[];
}

// CounterOfferDto
{
  amount: number;
}
```

## Database Relations

- `PriceProposal.booking` → Booking (the booking being negotiated)
- `PriceProposal.parent` → PriceProposal? (parent proposal if counter-offer)
- `PriceProposal.counters` → PriceProposal[] (counter-offers made)

## Implementation Notes

### Phase 1 (Basic Negotiation)
- [ ] Create proposals
- [ ] Accept/reject functionality
- [ ] Get proposal history

### Phase 2 (Counter-Offers)
- [ ] Counter-offer chain support
- [ ] Auto-status updates on booking
- [ ] Notification triggers

### Phase 3 (Advanced)
- [ ] Proposal expiration time
- [ ] Price suggestions based on service type
- [ ] Negotiation analytics

## Dependencies

- **Required Modules:** Bookings, Users
- **Integrates With:** Messages (proposal notifications), Notifications

## Security Considerations

- Only customer or assigned worker can create proposals for a booking
- Cannot create proposal for COMPLETED/CANCELLED bookings
- Proposal amounts should be validated (positive, within reasonable range)
- Audit trail of all proposals should be maintained

## Urdu Translation Support

UI labels for this module should support bilingual display:
- "Price Proposal" / "قیمت کی تجویز"
- "Counter Offer" / "کاؤنٹر آفر"
- "Accept" / "قبول کریں"
- "Reject" / "رد کریں"
