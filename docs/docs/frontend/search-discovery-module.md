# Search & Discovery Module

**Status:** Planned - To Be Implemented

## Purpose

The Search & Discovery module helps customers find the right workers for their needs through search, filtering, sorting, and intelligent recommendations.

## Expected Functionality

### Core Features
- Search workers by name, skill, location
- Filter by rating, price, distance, availability
- Sort by relevance, rating, price, distance
- Service-based discovery
- Recommended workers
- Nearby workers
- Recently viewed workers

### Search Interface
```
┌─────────────────────────────────────┐
│  🔍 Search workers, services...     │
├─────────────────────────────────────┤
│  Filters:                           │
│  [Rating ▼] [Price ▼] [Distance ▼] │
│  [Available Now] [Verified]         │
├─────────────────────────────────────┤
│  Sort: [Relevance] [Rating] [Price] │
├─────────────────────────────────────┤
│  Results (24 workers)               │
│  ┌─────────────────────────────┐   │
│  │ Worker Card                  │   │
│  │ ⭐ 4.9 | 2.3 km | Rs. 500   │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Planned Components

```
src/components/search/
├── SearchBar.tsx              # Search input with autocomplete
├── SearchResults.tsx          # Results container
├── FilterPanel.tsx            # Filter controls
├── SortDropdown.tsx           # Sort options
├── WorkerResultsList.tsx      # Results grid/list
├── SearchEmptyState.tsx       # No results state
├── RecentSearches.tsx         # Search history
├── RecommendedWorkers.tsx     # Recommendation carousel
└── NearbyWorkers.tsx          # Location-based results
```

## Component Props

```typescript
// SearchBarProps
interface SearchBarProps {
  onSearch: (query: string) => void;
  onLocationChange?: (location: Location) => void;
  placeholder?: string;
  showLocationInput?: boolean;
}

// FilterPanelProps
interface FilterPanelProps {
  filters: WorkerFilters;
  onFilterChange: (filters: WorkerFilters) => void;
  availableFilters: {
    minRating: number;
    maxPrice: number;
    maxDistance: number;
    services: Service[];
  };
}

// WorkerFilters
interface WorkerFilters {
  minRating?: number;
  maxPrice?: number;
  maxDistance?: number;
  serviceIds?: number[];
  isVerified?: boolean;
  isAvailableNow?: boolean;
  sortBy?: 'relevance' | 'rating' | 'price' | 'distance';
}
```

## Search API Integration

```typescript
// Search workers
const searchWorkers = async (params: SearchParams) => {
  const response = await apiClient.get('/api/workers/search', {
    query: params.q,
    lat: params.location?.lat,
    lng: params.location?.lng,
    serviceId: params.serviceId,
    minRating: params.minRating,
    maxPrice: params.maxPrice,
    maxDistance: params.maxDistance,
    sortBy: params.sortBy,
    page: params.page,
    limit: params.limit,
  });
  return response.data;
};

// Debounced search
const useDebounceSearch = (query: string, delay: number = 300) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), delay);
    return () => clearTimeout(timer);
  }, [query]);

  return debouncedQuery;
};
```

## Implementation Notes

### Phase 1 (Basic Search)
- [ ] Text search by name/service
- [ ] Basic filtering (rating, verified)
- [ ] Simple sorting

### Phase 2 (Enhanced)
- [ ] Location-based search
- [ ] Distance filtering
- [ ] Price range filtering
- [ ] Availability filtering

### Phase 3 (Advanced)
- [ ] Autocomplete suggestions
- [ ] Search history
- [ ] Recommended workers
- [ ] Recently viewed
- [ ] AI-powered matching

## Empty States

```typescript
// Empty state messages
const emptyStateMessages = {
  noResults: 'No workers found matching your criteria',
  noResultsUrdu: 'آپ کے معیار کے مطابق کوئی کارکن نہیں ملا',
  tryDifferent: 'Try adjusting your filters or search terms',
  clearFilters: 'Clear all filters',
};
```

## Dependencies

- **API Endpoints:** `/api/workers/search`, `/api/services`, `/api/workers/recommended`
- **UI Components:** Card, Button, Badge, Avatar, Input
- **Libraries:** Google Maps API (for location)

## Performance Considerations

- Debounce search input (300ms)
- Infinite scroll or pagination for results
- Cache recent searches
- Lazy load worker images
- Virtual scrolling for large result sets

## Urdu Translation Support

- "Search" / "تلاش کریں"
- "Filters" / "فلٹرز"
- "Sort by" / "ترتیب دیں"
- "Results" / "نتائج"
- "No results found" / "کوئی نتیجہ نہیں ملا"
- "Clear filters" / "فلٹرز صاف کریں"
- "Nearby" / "قریب"
- "Recommended" / "تجویز کردہ"
