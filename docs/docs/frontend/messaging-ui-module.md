# Messaging UI Module

**Status:** Planned - To Be Implemented

## Purpose

The Messaging UI module provides a real-time chat interface for customers and workers to communicate about bookings, share images, and negotiate prices.

## Expected Functionality

### Core Features
- Send and receive text messages
- Share images in chat
- Price proposal messages (special rendering)
- Message history loading
- Typing indicators (future)
- Read receipts (future)
- Real-time updates via WebSocket

### Chat Interface
```
┌─────────────────────────────────────┐
│  Chat with [Worker/Customer Name]   │
│  ⭐ 4.9 | Electrician               │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ Message History              │   │
│  │                              │   │
│  │ [Customer]: Hi, are you      │   │
│  │             available?       │   │
│  │                              │   │
│  │           [Worker]: Yes,     │   │
│  │           I'm available      │   │
│  │           tomorrow.          │   │
│  │                              │   │
│  │ ┌──────────────────────┐    │   │
│  │ │ 💰 Price Proposal    │    │   │
│  │ │ Rs. 1,500            │    │   │
│  │ │ [Accept] [Counter]   │    │   │
│  │ └──────────────────────┘    │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  [📎] [Type a message...]    [📤]  │
└─────────────────────────────────────┘
```

## Planned Components

```
src/components/messaging/
├── ChatContainer.tsx          # Main chat wrapper
├── ChatHeader.tsx             # Participant info
├── MessageList.tsx            # Scrollable messages
├── MessageBubble.tsx          # Individual message
├── PriceProposalMessage.tsx   # Special proposal card
├── ImageMessage.tsx           # Image display
├── ChatInput.tsx              # Input + send button
├── ImageUploader.tsx          # Image attachment
├── TypingIndicator.tsx        # "typing..." indicator
└── MessageTimestamp.tsx       # Time display
```

## Component Props

```typescript
// ChatContainerProps
interface ChatContainerProps {
  bookingId: string;
  currentUserId: string;
  participant: {
    id: string;
    name: string;
    role: UserRole;
    profilePicUrl?: string;
  };
  onBack?: () => void;
}

// MessageBubbleProps
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onProposalAction?: (proposalId: string, action: 'accept' | 'counter') => void;
}

// ChatInputProps
interface ChatInputProps {
  onSend: (content: string) => void;
  onImageUpload?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

## Message Types Rendering

```typescript
// Message rendering based on type
const renderMessage = (message: Message) => {
  switch (message.type) {
    case 'TEXT':
      return <TextMessage content={message.content} />;

    case 'IMAGE':
      return <ImageMessage imageUrl={message.content} />;

    case 'PRICE_PROPOSAL':
      return (
        <PriceProposalMessage
          amount={message.proposal.amount}
          status={message.proposal.status}
          onAccept={() => handleAccept(message.proposal.id)}
          onCounter={() => handleCounter(message.proposal.id)}
        />
      );

    default:
      return null;
  }
};
```

## WebSocket Integration

```typescript
// Chat WebSocket hook
const useChatWebSocket = (bookingId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:4000/chat/${bookingId}`);

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data.message]);
    };

    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [bookingId]);

  const sendMessage = (content: string, type: MessageType = 'TEXT') => {
    ws.send(JSON.stringify({ bookingId, content, type }));
  };

  const sendTypingIndicator = () => {
    ws.send(JSON.stringify({ bookingId, type: 'TYPING' }));
  };

  return { messages, isConnected, sendMessage, sendTypingIndicator };
};
```

## Implementation Notes

### Phase 1 (Basic Chat)
- [ ] Message list display
- [ ] Send text messages
- [ ] Load message history
- [ ] Auto-scroll to bottom

### Phase 2 (Enhanced)
- [ ] Image sharing
- [ ] Price proposal rendering
- [ ] Message timestamps
- [ ] Connection status

### Phase 3 (Advanced)
- [ ] Real-time WebSocket
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message reactions
- [ ] Voice messages

## Dependencies

- **API Endpoints:** `/api/messages`, `/api/uploads`, `/api/proposals`
- **UI Components:** Button, Input, Avatar, Modal
- **WebSocket:** Socket.io or native WebSocket

## Urdu Translation Support

- "Chat" / "چیٹ"
- "Type a message..." / "پیغام لکھیں..."
- "Send" / "بھیجیں"
- "Image" / "تصویر"
- "Price Proposal" / "قیمت کی تجویز"
- "Accept" / "قبول کریں"
- "Counter" / "کاؤنٹر"
- "Online" / "آن لائن"
