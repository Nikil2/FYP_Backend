# Booking Flow Module

**Status:** Planned - To Be Implemented

## Purpose

The Booking Flow module provides a step-by-step wizard for customers to browse services, select workers, provide job details, and create bookings. It's the core conversion funnel of the platform.

## Expected Functionality

### Core Features
- Browse service categories
- View workers by service type
- Compare workers (rating, price, distance)
- Enter job details and location
- Select saved locations
- Schedule booking (immediate or later)
- Review and confirm booking

### Booking Flow Steps
```
Step 1: Select Service Category
   ↓
Step 2: Choose Specific Service
   ↓
Step 3: Browse Available Workers
   ↓
Step 4: Enter Job Details
   ↓
Step 5: Select Location
   ↓
Step 6: Review & Confirm
   ↓
Step 7: Booking Created → Negotiation
```

## Planned Pages

```
src/app/customer/
├── page.tsx                 # Customer home (service categories)
├── category/[id]/
│   └── page.tsx            # Workers in category
├── services/[id]/
│   └── page.tsx            # Service detail
├── book/[serviceId]/
│   ├── page.tsx            # Step 1: Worker selection
│   └── form/
│       └── page.tsx        # Step 2: Job details form
├── booking-success/
│   └── page.tsx            # Confirmation page
└── orders/[id]/
    └── page.tsx            # Track booking
```

## Components

```
src/components/customer/
├── ServiceCategoryCard.tsx     # Category display
├── WorkerList.tsx              # Worker list with filters
├── WorkerCard.tsx              # Individual worker card
├── WorkerComparison.tsx        # Compare multiple workers
├── BookingForm.tsx             # Job details form
├── LocationSelector.tsx        # Saved locations + map
├── SchedulePicker.tsx          # Date/time selection
├── BookingSummary.tsx          # Review before confirm
├── BookingSuccess.tsx          # Success confirmation
└── BookingTracker.tsx          # Status timeline
```

## Component Props

```typescript
// ServiceCategoryCardProps
interface ServiceCategoryCardProps {
  category: ServiceCategory;
  onClick: (id: number) => void;
}

// WorkerCardProps
interface WorkerCardProps {
  worker: WorkerProfile;
  distance?: number;
  onSelect: (workerId: string) => void;
  onCompare: (workerId: string) => void;
}

// BookingFormProps
interface BookingFormProps {
  serviceId: number;
  selectedWorker?: WorkerProfile;
  onSubmit: (data: BookingFormData) => void;
}

// BookingFormData
interface BookingFormData {
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  scheduledAt?: string;
  images?: string[];
}
```

## Booking Wizard State

```typescript
// Booking wizard state management
const [bookingStep, setBookingStep] = useState(1);
const [bookingData, setBookingData] = useState({
  serviceId: null,
  workerId: null,
  description: '',
  location: null,
  scheduledAt: null,
});

// Step navigation
const nextStep = () => {
  if (validateStep(bookingStep)) {
    setBookingStep(prev => prev + 1);
  }
};

const prevStep = () => {
  setBookingStep(prev => prev - 1);
};
```

## Implementation Notes

### Phase 1 (Basic Flow)
- [ ] Service category grid
- [ ] Worker list by category
- [ ] Basic booking form
- [ ] Success page

### Phase 2 (Enhanced)
- [ ] Worker filtering (rating, distance)
- [ ] Saved locations integration
- [ ] Schedule for later
- [ ] Image upload for job

### Phase 3 (Advanced)
- [ ] Worker comparison tool
- [ ] Price estimates
- [ ] Map-based worker selection
- [ ] Instant booking (auto-assign)

## Validation Rules

```typescript
const bookingValidation = {
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000,
  },
  location: {
    required: true,
    validate: (lat, lng) => isValidCoordinates(lat, lng),
  },
  scheduledAt: {
    required: false,
    validate: (date) => {
      if (date) {
        return new Date(date) > new Date();
      }
      return true;
    },
  },
};
```

## Dependencies

- **API Endpoints:** `/api/services`, `/api/workers`, `/api/bookings`, `/api/locations`
- **UI Components:** Button, Card, Input, Select, Modal
- **Hooks:** useServices, useWorkerRegistration
- **Libraries:** Google Maps API (optional)

## Urdu Translation Support

- "Book Now" / "ابھی بک کریں"
- "Select Service" / "سروس منتخب کریں"
- "Choose Worker" / "کارکن منتخب کریں"
- "Job Details" / "کام کی تفصیلات"
- "Location" / "مقام"
- "Schedule" / "شیڈول"
- "Confirm Booking" / "بکنگ کی تصدیق"
- "Booking Successful" / "بکنگ کامیاب ہوئی"
