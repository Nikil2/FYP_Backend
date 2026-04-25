# Dispute Resolution UI Module

**Status:** Planned - To Be Implemented

## Purpose

The Dispute Resolution UI module provides an interface for customers and workers to file complaints about bookings and track dispute resolution progress. It also includes an admin interface for handling disputes.

## Expected Functionality

### Core Features (Customer/Worker)
- File complaint for a booking
- Upload evidence (images, documents)
- View complaint status
- Track resolution progress
- View resolved complaints history

### Core Features (Admin)
- View all complaints
- Assign complaints to admins
- Review evidence
- Resolve with actions (refund, penalty, warning)
- Add resolution notes

### Complaint Form
```
┌─────────────────────────────────────┐
│  File a Complaint                   │
├─────────────────────────────────────┤
│  Booking #123 - Muhammad Ali        │
│  Electrician Service | Rs. 1,500    │
├─────────────────────────────────────┤
│  What went wrong?                   │
│  ┌─────────────────────────────┐   │
│  │ Describe the issue in       │   │
│  │ detail. Be specific about   │   │
│  │ what happened.              │   │
│  │                             │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Add Evidence (optional)            │
│  [📎 Upload Images] [📎 Documents]  │
│                                     │
│  [Cancel]              [Submit]     │
└─────────────────────────────────────┘
```

## Planned Components

```
src/components/disputes/
├── ComplaintForm.tsx          # File new complaint
├── ComplaintStatus.tsx        # Status badge/timeline
├── ComplaintCard.tsx          # Complaint summary
├── ComplaintDetail.tsx        # Full complaint view
├── EvidenceUploader.tsx       # Evidence attachment
├── ComplaintsList.tsx         # User's complaints
├── AdminComplaintsTable.tsx   # Admin view
├── ResolveComplaintModal.tsx  # Admin resolution form
└── ComplaintTimeline.tsx      # History of actions
```

## Component Props

```typescript
// ComplaintFormProps
interface ComplaintFormProps {
  booking: Booking;
  onSubmit: (data: ComplaintFormData) => void;
  onCancel: () => void;
}

// ComplaintFormData
interface ComplaintFormData {
  bookingId: string;
  description: string;
  evidenceUrls: string[];
}

// ComplaintCardProps
interface ComplaintCardProps {
  complaint: Complaint;
  onViewDetail: (id: string) => void;
}

// Complaint type
interface Complaint {
  id: string;
  bookingId: string;
  filedBy: {
    id: string;
    fullName: string;
    role: UserRole;
  };
  assignedTo?: {
    id: string;
    fullName: string;
  };
  description: string;
  evidenceUrls: string[];
  isResolved: boolean;
  resolution?: {
    action: string;
    notes: string;
    resolvedAt: string;
  };
  createdAt: string;
}
```

## Complaint Status Flow

```typescript
// Status display component
const ComplaintStatus: React.FC<{ status: ComplaintStatus }> = ({ status }) => {
  const statusConfig = {
    FILED: { label: 'Filed', icon: '📝', color: 'yellow' },
    UNDER_REVIEW: { label: 'Under Review', icon: '👀', color: 'blue' },
    ESCALATED: { label: 'Escalated', icon: '⚠️', color: 'orange' },
    RESOLVED: { label: 'Resolved', icon: '✅', color: 'green' },
  };

  const config = statusConfig[status];

  return (
    <Badge color={config.color}>
      {config.icon} {config.label}
    </Badge>
  );
};
```

## Implementation Notes

### Phase 1 (Basic Complaints)
- [ ] Complaint form
- [ ] Evidence upload
- [ ] View complaint status
- [ ] Complaints list

### Phase 2 (Enhanced)
- [ ] Complaint timeline
- [ ] Resolution notifications
- [ ] Evidence gallery
- [ ] Admin assignment display

### Phase 3 (Advanced)
- [ ] Admin resolution interface
- [ ] Action tracking (refund, penalty)
- [ ] Complaint analytics
- [ ] Pattern detection UI

## Admin Resolution Interface

```typescript
// Admin resolve modal
const ResolveComplaintModal: React.FC<{
  complaint: Complaint;
  onResolve: (data: ResolveData) => void;
}> = ({ complaint, onResolve }) => {
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');

  const actions = [
    { value: 'REFUND', label: 'Full/Partial Refund' },
    { value: 'PENALTY', label: 'Penalty on Worker' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'NO_ACTION', label: 'No Action Required' },
  ];

  return (
    <Modal>
      <h2>Resolve Complaint</h2>
      <select value={action} onChange={(e) => setAction(e.target.value)}>
        <option value="">Select Action</option>
        {actions.map(a => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes..."
      />
      <Button onClick={() => onResolve({ action, notes })}>
        Resolve Complaint
      </Button>
    </Modal>
  );
};
```

## Dependencies

- **API Endpoints:** `/api/complaints`, `/api/uploads`, `/api/bookings`
- **UI Components:** Button, Modal, Card, Badge, Input, Textarea
- **Hooks:** useAuth

## Urdu Translation Support

- "File Complaint" / "شکایت درج کریں"
- "Dispute" / "تنازعہ"
- "What went wrong?" / "کیا غلط ہوا؟"
- "Add Evidence" / "ثبوت شامل کریں"
- "Under Review" / "جائزہ لیا جا رہا ہے"
- "Resolved" / "حل ہو گیا"
- "Refund" / "رقم واپسی"
- "Penalty" / "جرمانہ"
- "Warning" / "انتباہ"
