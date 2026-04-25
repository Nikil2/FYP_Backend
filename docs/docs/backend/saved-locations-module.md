# Saved Locations Module

**Status:** Planned - To Be Implemented

## Purpose

The Saved Locations module allows customers to save frequently used addresses for faster booking. This improves user experience by eliminating the need to re-enter addresses repeatedly.

## Expected Functionality

### Core Features
- Save addresses with coordinates
- Label locations (Home, Work, etc.)
- Retrieve customer's saved locations
- Update location details
- Delete saved locations
- Use saved location during booking

### Business Logic
- Locations are customer-specific
- Default labels: Home, Work, Other
- Maximum 10 saved locations per customer (configurable)
- Coordinates used for distance calculations

## Planned API Endpoints

### Saved Locations Controller (`/api/locations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's saved locations |
| POST | `/` | Save new location |
| PUT | `/:id` | Update location |
| DELETE | `/:id` | Delete location |
| GET | `/:id` | Get specific location |

## DTOs to Implement

```typescript
// CreateLocationDto
{
  address: string;
  lat: number;
  lng: number;
  label?: string; // "Home", "Work", etc.
}

// UpdateLocationDto
{
  address?: string;
  lat?: number;
  lng?: number;
  label?: string;
}

// LocationResponseDto
{
  id: string;
  userId: string;
  address: string;
  lat: number;
  lng: number;
  label?: string;
  createdAt: string;
}
```

## Database Relations

- `SavedLocation.user` → User (location owner)

## Implementation Notes

### Phase 1 (Basic Locations)
- [ ] Save location with coordinates
- [ ] List saved locations
- [ ] Delete location

### Phase 2 (Enhanced)
- [ ] Location labels
- [ ] Default location setting
- [ ] Geocoding integration (address → coordinates)

### Phase 3 (Advanced)
- [ ] Recently used addresses
- [ ] Address autocomplete
- [ ] Distance calculation from worker
- [ ] Service area validation

## Dependencies

- **Required Modules:** Users
- **Integrates With:** Bookings, Google Maps API (optional)

## Security Considerations

- Users can only access their own locations
- Address input should be sanitized
- Rate limiting to prevent abuse
- Consider address validation via external API

## Integration with Booking Flow

When creating a booking:
1. User can select from saved locations
2. Coordinates are auto-populated
3. Address can still be edited if needed
4. Option to "Save this location" after booking

## Urdu Translation Support

- "Saved Locations" / "محفوظ شدہ مقامات"
- "Home" / "گھر"
- "Work" / "کام"
- "Add Location" / "مقام شامل کریں"
- "Address" / "پتہ"
