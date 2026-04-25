# Worker Portfolio Module

**Status:** Planned - To Be Implemented

## Purpose

The Worker Portfolio module allows workers to showcase their past work through photos and descriptions. This helps build trust with potential customers and demonstrates the worker's skills and experience.

## Expected Functionality

### Core Features
- Upload portfolio images with descriptions
- Manage portfolio (add, update, delete)
- Public portfolio viewing
- Portfolio ordering/sorting
- Worker name association for display

### Business Logic
- Only verified workers can have portfolio items
- Workers can only manage their own portfolio
- Portfolio items are public (no authentication required to view)
- Image moderation may be required before display

## Planned API Endpoints

### Worker Portfolio Controller (`/api/workers/:workerId/portfolio`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all portfolio items for worker |
| POST | `/` | Add portfolio item |
| PUT | `/:id` | Update portfolio item |
| DELETE | `/:id` | Delete portfolio item |
| GET | `/public/:workerName` | Get portfolio by worker name (public) |

## DTOs to Implement

```typescript
// CreatePortfolioDto
{
  imageUrl: string;
  description?: string;
}

// UpdatePortfolioDto
{
  imageUrl?: string;
  description?: string;
}

// PortfolioResponseDto
{
  id: string;
  workerId: string;
  imageUrl: string;
  description?: string;
  workerName?: string;
  createdAt: string;
}
```

## Database Relations

- `WorkerPortfolio.worker` → WorkerProfile (portfolio owner)

## Implementation Notes

### Phase 1 (Basic Portfolio)
- [ ] Upload portfolio images
- [ ] View worker portfolio
- [ ] Delete portfolio items

### Phase 2 (Enhanced)
- [ ] Image upload with storage integration
- [ ] Automatic thumbnail generation
- [ ] Portfolio item reordering
- [ ] Category tagging (type of work)

### Phase 3 (Advanced)
- [ ] Video portfolio support
- [ ] Before/after comparisons
- [ ] Customer testimonials in portfolio
- [ ] Portfolio analytics (views, clicks)

## Dependencies

- **Required Modules:** Workers, Users
- **Integrates With:** File Uploads

## Security Considerations

- Workers can only manage their own portfolio
- Image URLs must be validated
- Consider content moderation before public display
- Rate limiting on uploads to prevent abuse

## Storage Integration

Recommended approach:
1. Use Cloudinary or AWS S3 for image storage
2. Generate thumbnails for faster loading
3. Store only URLs in database
4. Implement CDN for image delivery

## Urdu Translation Support

- "Portfolio" / "پورٹ فولیو"
- "My Work" / "میرا کام"
- "View Portfolio" / "پورٹ فولیو دیکھیں"
- "Add Work Photo" / "کام کی تصویر شامل کریں"
