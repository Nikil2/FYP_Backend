# Frontend Project Structure

**Status:** Partially Implemented - Reference Document

## Directory Structure

```
FYP-frontend 2/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── auth/                 # Authentication pages
│   │   │   ├── login/
│   │   │   └── signup/
│   │   │       ├── customer/
│   │   │       └── worker/
│   │   ├── customer/             # Customer pages
│   │   │   ├── page.tsx          # Customer home/dashboard
│   │   │   ├── book/             # Booking flow
│   │   │   ├── category/         # Category pages
│   │   │   ├── orders/           # Order history
│   │   │   ├── profile/          # Profile settings
│   │   │   └── notifications/    # Notifications center
│   │   ├── worker/               # Worker pages
│   │   │   └── dashboard/        # Worker dashboard
│   │   │       ├── page.tsx      # Dashboard home
│   │   │       ├── orders/       # Worker orders
│   │   │       ├── profile/      # Profile management
│   │   │       ├── wallet/       # Earnings
│   │   │       └── settings/     # Settings
│   │   ├── admin/                # Admin panel (planned)
│   │   ├── worker/[id]/          # Worker public profile
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Landing page
│   │
│   ├── components/
│   │   ├── auth/                 # Auth components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupWizard.tsx
│   │   │   └── worker-signup/
│   │   ├── customer/             # Customer components
│   │   │   ├── BookingCard.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   └── OrderHistory.tsx
│   │   ├── worker-dashboard/     # Worker components
│   │   │   ├── PendingRequests.tsx
│   │   │   ├── EarningsCard.tsx
│   │   │   └── AvailabilityToggle.tsx
│   │   ├── landing/              # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── ServicesGrid.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   └── FinalCTA.tsx
│   │   ├── layouts/              # Layout components
│   │   │   ├── LayoutShell.tsx   # Conditional navbar/footer
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── modals/               # Reusable modals
│   │   ├── search/               # Search components
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   └── worker-detail/        # Worker detail page
│   │       ├── WorkerProfile.tsx
│   │       └── ReviewsList.tsx
│   │
│   ├── api/
│   │   ├── client.ts             # ApiClient singleton
│   │   ├── config.ts             # API configuration
│   │   ├── types.ts              # API types
│   │   └── services/
│   │       ├── users.ts          # User API calls
│   │       ├── workers.ts        # Worker API calls
│   │       ├── services.ts       # Services API calls
│   │       ├── bookings.ts       # Bookings API (planned)
│   │       ├── messages.ts       # Messages API (planned)
│   │       └── uploads.ts        # File upload API
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth state management
│   │   ├── useServices.ts        # Services data fetching
│   │   └── useWorkerRegistration.ts
│   │
│   ├── interfaces/
│   │   ├── auth-interfaces.ts    # Auth interfaces
│   │   └── landing-interfaces.ts
│   │
│   ├── lib/
│   │   ├── auth.ts               # Auth helpers
│   │   ├── services-data.ts      # Service categories
│   │   ├── constants.ts          # App constants
│   │   ├── utils.ts              # Utility functions
│   │   ├── cloudinary.ts         # Cloud upload config
│   │   └── mock-*.ts             # Mock data
│   │
│   ├── types/
│   │   ├── customer.ts           # Customer types
│   │   ├── worker.ts             # Worker types
│   │   ├── booking.ts            # Booking types
│   │   └── provider.ts           # Provider dashboard types
│   │
│   └── content/
│       └── landing/
│           └── landing-page-content.ts
│
├── public/
│   ├── icons/
│   └── images/
│
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Key Components

### LayoutShell

Conditionally renders Navbar and Footer based on route.

```typescript
// src/components/layouts/LayoutShell.tsx
const HIDDEN_ROUTES = [
  '/worker/dashboard',
  '/customer',
  '/customer/',
  '/dummy',
];

export function LayoutShell({ children }) {
  const pathname = usePathname();
  const showChrome = !HIDDEN_ROUTES.some(r => pathname.startsWith(r));

  return (
    <>
      {showChrome && <Navbar />}
      <main>{children}</main>
      {showChrome && <Footer />}
    </>
  );
}
```

### API Client

Singleton API client with consistent configuration.

```typescript
// src/api/client.ts
class ApiClient {
  private baseURL: string;
  private timeout: number = 30000;

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T>
  async post<T>(endpoint: string, data?: any): Promise<T>
  async put<T>(endpoint: string, data?: any): Promise<T>
  async delete<T>(endpoint: string): Promise<T>
  async upload<T>(endpoint: string, formData: FormData): Promise<T>
}

export const apiClient = new ApiClient();
```

## Authentication Flow

```typescript
// src/lib/auth.ts
export function getToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setToken(token: string): void {
  localStorage.setItem('authToken', token);
}

export function getUserRole(): UserRole | null {
  return localStorage.getItem('userRole') as UserRole;
}

export function logout(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
}
```

## Phone Validation (Pakistan)

```typescript
const PHONE_REGEX = /^(\+92|0)?3[0-9]{9}$/;
const CNIC_REGEX = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;

export function validatePhoneNumber(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}
```

## Service Categories

```typescript
// src/lib/services-data.ts
export const SERVICE_CATEGORIES = [
  {
    id: 1,
    name: 'Electrician',
    nameUrdu: 'الیکٹریشن',
    icon: '⚡',
    subServices: ['Wiring', 'Repairs', 'Installation'],
  },
  {
    id: 2,
    name: 'Plumber',
    nameUrdu: 'پلمر',
    icon: '🔧',
    subServices: ['Pipe Repair', 'Drain Cleaning', 'Installation'],
  },
  // ... 8 categories total
];
```

## Routing Configuration

| Route | Layout | Navbar | Footer | Auth Required |
|-------|--------|--------|--------|---------------|
| `/` | Root | Yes | Yes | No |
| `/auth/*` | Auth | No | No | No |
| `/customer/*` | Customer | Yes | No | Customer |
| `/worker/dashboard/*` | Worker | No | No | Worker |
| `/worker/[id]` | Root | Yes | Yes | No |
| `/admin/*` | Admin | Sidebar | No | Admin |

## State Management

- Local state with React hooks
- API state with custom hooks
- Auth state in localStorage
- No global state management (Redux/Zustand) - keep it simple

## Styling

- Tailwind CSS for all styling
- shadcn/ui for reusable components
- Custom components extend shadcn patterns
