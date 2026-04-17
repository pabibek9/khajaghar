# Complete Filtering Architecture Guide

## 📋 Overview

The Khaja app now has a comprehensive, layered filtering system with three tiers:

1. **Business Logic Layer** - Pure functions for filtering
2. **React Hooks Layer** - Component-scoped filtering hooks
3. **Advanced Hooks Layer** - Complex filtering with state management

---

## 🏗️ Architecture Layers

### Layer 1: Business Logic (`src/utils/business/filtering.ts`)

**Pure Functions** - No dependencies, no side effects, highly reusable.

**Core Functions:**
- `filterByDietary(items, 'veg' | 'non-veg' | 'vegan' | 'all')` - Filter by dietary preference
- `filterBySearch(items, query)` - Search by name or kitchen
- `filterOutOfStock(items)` - Exclude out-of-stock items
- `filterByRating(items, minRating)` - Filter by minimum rating
- `sortItems(items, 'name' | 'price' | 'rating' | 'relevance', 'asc' | 'desc')` - Sort items
- `applyFilters(items, FilterOptions)` - Chain multiple filters
- `rankAndFilter(items, rankScores, FilterOptions, SortOptions)` - Apply ranking + filters

**Use Cases:**
- Backend services
- Web workers
- Utilities files
- Redux/Zustand reducers
- Algorithm logic

**Example:**
```typescript
import { 
  applyFilters, 
  FilterOptions 
} from '@/src/utils/business/filtering';

const filterOpts: FilterOptions = {
  dietary: 'veg',
  searchQuery: 'biryani',
  excludeOutOfStock: true,
  minRating: 3.5,
  maxItems: 50,
};

const results = applyFilters(allItems, filterOpts);
```

### Layer 2: React Hooks (`src/hooks/filters/useFilters.ts`)

**Simple, declarative hooks** for common filtering patterns in components.

**Hooks:**
- `useOrderFilter(orders, initialDateFilter)` - Filter orders by status & date
- `useItemFilter(items, searchQuery)` - Filter items by category & search
- `useOrderLists(orders)` - Separate active vs. history orders
- `useListFilter(items, searchQuery, options)` - Generic list filtering

**Features:**
- Automatic memoization
- Built-in state management
- Optimized re-renders

**Example:**
```typescript
import { useItemFilter } from '@/src/hooks';

function MenuComponent({ items }) {
  const { 
    filteredItems, 
    activeCategory, 
    setActiveCategory 
  } = useItemFilter(items, 'search query');

  return (
    <>
      <CategoryButtons value={activeCategory} onChange={setActiveCategory} />
      <ItemList items={filteredItems} />
    </>
  );
}
```

### Layer 3: Advanced Hooks (`src/utils/filteringHooks.ts`)

**Complex filtering with full state management** for advanced UIs.

**Hooks:**
- `useAdvancedItemFilter(items, initialQuery)` - All filter options + sorting
- `useSimpleItemFilter(items, initialDietary)` - Lightweight version
- `useRankedItems(items, rankingFn, filterOptions, sortOptions)` - Custom ranking

**Features:**
- Multiple filter states
- Setter functions
- Reset functionality
- Custom ranking support

**Example:**
```typescript
import { useAdvancedItemFilter } from '@/src/utils/filteringHooks';

function BrowserComponent({ items }) {
  const { 
    filteredItems, 
    filters, 
    setters, 
    resetFilters 
  } = useAdvancedItemFilter(items, '');

  return (
    <Container>
      <SearchInput 
        value={filters.searchQuery}
        onChange={setters.setSearchQuery}
      />
      <DietaryChips 
        value={filters.dietary}
        onChange={setters.setDietary}
      />
      <SortOptions 
        value={filters.sortBy}
        onChange={setters.setSortBy}
      />
      <RatingFilter 
        value={filters.minRating}
        onChange={setters.setMinRating}
      />
      <Button onPress={resetFilters}>Reset</Button>
      <ItemList items={filteredItems} />
    </Container>
  );
}
```

---

## 🔄 Data Flow

```
User Input (Search, Filter Chip)
    ↓
Hook State Update (setSearchQuery, setDietary)
    ↓
useEffect/useMemo Triggered
    ↓
Business Logic Functions Called
    ↓
Filtered Results Returned
    ↓
Component Re-renders with New Results
```

---

## 📦 Type System

### Core Types

```typescript
// Dietary preferences
type DietaryType = 'veg' | 'non-veg' | 'vegan' | 'all';

// Sort options
type SortBy = 'name' | 'price' | 'rating' | 'relevance';

// Menu item
interface MenuItem {
  id: string;
  kitchenId: string;
  kitchenName: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  dietary?: string;
  outOfStock?: boolean;
  totalRating?: number;
  ratingCount?: number;
}

// Filter configuration
interface FilterOptions {
  dietary?: DietaryType;
  searchQuery?: string;
  maxItems?: number;
  excludeOutOfStock?: boolean;
  minRating?: number;
}

// Sort configuration
interface SortOptions {
  sortBy?: SortBy;
  sortOrder?: 'asc' | 'desc';
}
```

---

## 💡 Usage Patterns

### Pattern 1: Simple Search & Filter

```typescript
function SimpleSearch({ items }) {
  const { filteredItems, searchQuery, setSearchQuery, dietary, setDietary } =
    useSimpleItemFilter(items, 'veg');

  return (
    <>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <DietaryChips value={dietary} onChange={setDietary} />
      <ItemList items={filteredItems} />
    </>
  );
}
```

### Pattern 2: Advanced Filters with UI Controls

```typescript
function AdvancedBrowser({ items }) {
  const { filteredItems, filters, setters, resetFilters } = 
    useAdvancedItemFilter(items);

  return (
    <>
      <SearchInput value={filters.searchQuery} onChange={setters.setSearchQuery} />
      
      <FilterSection>
        <Label>Dietary</Label>
        <DietaryChips value={filters.dietary} onChange={setters.setDietary} />
        
        <Label>Price Range</Label>
        <PriceSlider />
        
        <Label>Rating</Label>
        <RatingSlider value={filters.minRating} onChange={setters.setMinRating} />
        
        <Label>Availability</Label>
        <Toggle 
          label="In Stock Only"
          value={filters.excludeOutOfStock}
          onChange={setters.setExcludeOutOfStock}
        />
        
        <Label>Sort By</Label>
        <Picker value={filters.sortBy} onChange={setters.setSortBy} />
      </FilterSection>

      <Button onPress={resetFilters}>Reset All</Button>
      
      <ItemList items={filteredItems} />
    </>
  );
}
```

### Pattern 3: Custom Ranking

```typescript
function PersonalizedList({ items, userId }) {
  const rankingFn = (item: MenuItem) => {
    let score = 0;

    // Favorite kitchens
    if (favoriteKitchens.has(item.kitchenId)) score += 20;

    // High ratings
    if (item.totalRating && item.ratingCount) {
      score += (item.totalRating / item.ratingCount) * 5;
    }

    // Popular items
    if (item.ratingCount && item.ratingCount > 50) score += 10;

    return score;
  };

  const rankedItems = useRankedItems(
    items,
    rankingFn,
    { dietary: 'all', excludeOutOfStock: true },
    { sortBy: 'relevance', sortOrder: 'desc' }
  );

  return <ItemList items={rankedItems} />;
}
```

### Pattern 4: Order Filtering

```typescript
function OrderHistory({ orders }) {
  const { filteredOrders, dateFilter, statusFilter, setDateFilter, setStatusFilter } =
    useOrderFilter(orders, 'all');

  return (
    <>
      <DateFilterChips value={dateFilter} onChange={setDateFilter} />
      <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
      <OrderList orders={filteredOrders} />
    </>
  );
}
```

---

## 📊 Performance Considerations

### Memoization

All hooks use `useMemo` to prevent unnecessary re-filtering:

```typescript
const filteredItems = useMemo(() => {
  return applyFilters(items, filterOptions);
}, [items, filterOptions.dietary, filterOptions.searchQuery]);
```

### Debouncing Search

For large lists, debounce search input:

```typescript
import { useDebouncedValue } from '@react-hookz/web';

const debouncedQuery = useDebouncedValue(searchQuery, 300);

const filtered = useListFilter(items, debouncedQuery);
```

### Lazy Filtering

For very large datasets, consider pagination:

```typescript
const { data: page } = useQuery({
  queryKey: ['items', page, filters],
  queryFn: () => fetchFiltered(page, filters),
});
```

---

## 🎯 Best Practices

### ✅ DO

1. **Use appropriate layer for context:**
   - React components → React hooks
   - Utilities → Business logic functions
   - Custom hooks → Advanced hooks

2. **Memoize expensive operations:**
   ```typescript
   const filtered = useMemo(() => applyFilters(...), [deps]);
   ```

3. **Show active filter state:**
   ```typescript
   const activeCount = [filters.dietary !== 'all', filters.searchQuery].filter(Boolean).length;
   <Badge>{activeCount} Filters Active</Badge>
   ```

4. **Provide reset functionality:**
   ```typescript
   <Button onPress={resetFilters}>Clear All Filters</Button>
   ```

5. **Handle empty states:**
   ```typescript
   {filteredItems.length === 0 ? <EmptyState /> : <ItemList />}
   ```

### ❌ DON'T

1. **Don't filter on every keystroke without debouncing:**
   ```typescript
   // ❌ Bad
   onChange={setQuery}  // Filters on every char
   
   // ✅ Good
   onChange={setDebouncedQuery}  // Debounced
   ```

2. **Don't forget dependency arrays:**
   ```typescript
   // ❌ Bad
   useMemo(() => applyFilters(...), [])
   
   // ✅ Good
   useMemo(() => applyFilters(...), [items, filters])
   ```

3. **Don't create new objects/arrays in render:**
   ```typescript
   // ❌ Bad
   const opts = { dietary: 'veg' };
   
   // ✅ Good
   const opts = useMemo(() => ({ dietary: 'veg' }), []);
   ```

4. **Don't ignore TypeScript types:**
   ```typescript
   // ❌ Bad
   const filter: any = { ... };
   
   // ✅ Good
   const filter: FilterOptions = { ... };
   ```

---

## 📚 Complete File Structure

```
src/
├── utils/
│   ├── index.ts                    # Main exports
│   ├── api.ts
│   ├── safeApiCall.ts
│   ├── filteringHooks.ts           # Advanced filtering hooks
│   └── business/
│       ├── index.ts                # Business logic exports
│       └── filtering.ts            # Core filtering functions
├── hooks/
│   ├── index.ts                    # All hook exports
│   ├── filters/
│   │   └── useFilters.ts           # React hooks for filtering
│   ├── queries/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   └── ... (other hooks)
└── types/
    ├── index.ts
    └── order.ts
```

---

## 🚀 Quick Start

### For Components:

```typescript
// Simple case
import { useItemFilter } from '@/src/hooks';

const { filteredItems, setActiveCategory } = useItemFilter(items, '');

// Advanced case
import { useAdvancedItemFilter } from '@/src/utils/filteringHooks';

const { filteredItems, filters, setters } = useAdvancedItemFilter(items);
```

### For Utilities:

```typescript
// Import business functions
import { 
  applyFilters, 
  FilterOptions 
} from '@/src/utils/business';

// Use them
const results = applyFilters(items, filterOptions);
```

---

## 🔗 Related Files

- **FILTERING_EXAMPLES.md** - Real-world usage examples
- **REFACTORING_GUIDE.md** - Overall architecture guide
- **src/utils/business/filtering.ts** - Implementation
- **src/hooks/filters/useFilters.ts** - Hook implementation
- **src/utils/filteringHooks.ts** - Advanced hooks

---

**Last Updated:** 2024  
**Status:** ✅ Complete & Production Ready
