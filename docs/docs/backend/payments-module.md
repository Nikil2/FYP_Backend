# Payments Module

**Status:** Planned - To Be Implemented

## Purpose

The Payments module handles all financial transactions on the platform. It manages payments from customers to workers, platform commissions, and wallet functionality.

## Expected Functionality

### Core Features
- Payment method management
- Process payments for completed bookings
- Platform commission calculation
- Worker wallet/payout system
- Payment history
- Refund processing
- Transaction records

### Payment Flow
```
Booking Completed → Calculate Final Price → Deduct Commission → Credit Worker Wallet → Request Payout
```

### Business Logic
- Platform takes percentage commission (configurable, e.g., 10-20%)
- Payments held in escrow until job completion
- Workers can request payouts from wallet
- Refunds processed through admin approval

## Planned API Endpoints

### Payments Controller (`/api/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create payment for booking |
| GET | `/booking/:bookingId` | Get payment for booking |
| GET | `/history` | User's payment history |
| POST | `/refund` | Request refund (admin) |

### Wallet Controller (`/api/wallet`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/balance` | Get wallet balance |
| GET | `/transactions` | Wallet transaction history |
| POST | `/payout` | Request payout |
| POST | `/add-funds` | Add funds to wallet (customer) |

## DTOs to Implement

```typescript
// CreatePaymentDto
{
  bookingId: string;
  paymentMethod: string; // 'CARD', 'JAZZ_CASH', 'EASY_PAISA', etc.
}

// PaymentResponseDto
{
  id: string;
  bookingId: string;
  amount: number;
  platformFee: number;
  workerEarnings: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
}

// WalletResponseDto
{
  userId: string;
  balance: number;
  pendingPayouts: number;
  availableForWithdrawal: number;
}

// PayoutRequestDto
{
  amount: number;
  bankAccount?: {
    accountTitle: string;
    accountNumber: string;
    bankName: string;
    ifscCode?: string;
  };
  mobileWallet?: {
    provider: 'JAZZ_CASH' | 'EASY_PAISA';
    phoneNumber: string;
  };
}
```

## Database Models (To Add)

```prisma
model Payment {
  id              String        @id @default(uuid())
  bookingId       String        @unique
  amount          Decimal       @db.Decimal(10, 2)
  platformFee     Decimal       @db.Decimal(10, 2)
  workerEarnings  Decimal       @db.Decimal(10, 2)
  status          PaymentStatus
  paymentMethod   String
  transactionId   String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  booking         Booking       @relation(fields: [bookingId], references: [id])
}

model WalletTransaction {
  id          String   @id @default(uuid())
  userId      String
  amount      Decimal  @db.Decimal(10, 2)
  type        TransactionType // CREDIT, DEBIT, PAYOUT, REFUND
  description String
  balanceAfter Decimal @db.Decimal(10, 2)
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

model PayoutRequest {
  id          String        @id @default(uuid())
  workerId    String
  amount      Decimal       @db.Decimal(10, 2)
  status      PayoutStatus  @default(PENDING)
  paymentDetails Json
  processedAt DateTime?
  createdAt   DateTime      @default(now())
  worker      WorkerProfile @relation(fields: [workerId], references: [id])
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum TransactionType {
  CREDIT
  DEBIT
  PAYOUT
  REFUND
  COMMISSION
}

enum PayoutStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
}
```

## Implementation Notes

### Phase 1 (Basic Payments)
- [ ] Payment record creation
- [ ] Cash payment tracking
- [ ] Basic wallet balance

### Phase 2 (Payment Gateway)
- [ ] Stripe/JazzCash/EasyPaisa integration
- [ ] Card payment processing
- [ ] Mobile wallet integration
- [ ] Automatic commission calculation

### Phase 3 (Advanced)
- [ ] Escrow system
- [ ] Automatic payouts
- [ ] Payment plans/installments
- [ ] Invoice generation
- [ ] Tax reporting

## Dependencies

- **Required Modules:** Bookings, Users, Workers
- **Integrates With:** Notifications, Admin

## Security Considerations

- PCI-DSS compliance for card payments
- Payment data encryption
- Fraud detection mechanisms
- Transaction audit logs
- Rate limiting on payment endpoints

## Pakistan Payment Methods

Recommended integrations for Pakistan market:
- **JazzCash** - Mobile wallet
- **EasyPaisa** - Mobile wallet
- **Stripe** - International cards (if available)
- **PayPal** - Not available in Pakistan
- **Bank Transfer** - Direct bank transfers
- **Cash on Completion** - Traditional cash payment

## Commission Structure

Example configuration:
```typescript
const COMMISSION_RATES = {
  STANDARD: 0.15, // 15% platform fee
  PREMIUM: 0.10,  // 10% for premium workers
  PROMOTIONAL: 0.05, // 5% for new workers
};
```

## Urdu Translation Support

- "Payment" / "ادائیگی"
- "Wallet" / "والیٹ"
- "Balance" / "بیلنس"
- "Payout" / "ادائیگی"
- "Commission" / "کمیشن"
- "Transaction" / "لین دین"
