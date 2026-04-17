/**
 * Filtering Examples & Usage Patterns
 * 
 * This file documents all the filtering utilities available in the Khaja app
 * and provides real-world usage examples.
 */

// ============================================================================
// 1. BUSINESS LOGIC FILTERING (src/utils/business/filtering.ts)
// ============================================================================

/**
 * Pure function approach - use in non-React contexts
 */
import {
  filterByDietary,
  filterBySearch,
  filterOutOfStock,
  filterByRating,
  sortItems,
  applyFilters,
  rankAndFilter,
  FilterOptions,
  SortOptions,
  MenuItem,
} from '@/src/utils/business/filtering';

// Example 1: Simple dietary filter
const vegItems = filterByDietary(allItems, 'veg');
const nonVegItems = filterByDietary(allItems, 'non-veg');
const veganItems = filterByDietary(allItems, 'vegan');

// Example 2: Search filter
const searchResults = filterBySearch(allItems, 'biryani');

// Example 3: Stock filter
const inStock = filterOutOfStock(allItems);

// Example 4: Rating filter
const topRated = filterByRating(allItems, 4.0); // 4 stars and above

// Example 5: Sort items
const sortedByPrice = sortItems(allItems, 'price', 'asc');
const sortedByRating = sortItems(allItems, 'rating', 'desc');
const sortedByName = sortItems(allItems, 'name', 'asc');

// Example 6: Combined filters
const filterOptions: FilterOptions = {
  dietary: 'veg',
  searchQuery: 'biryani',
  excludeOutOfStock: true,
  minRating: 3.5,
  maxItems: 20,
};

const filtered = applyFilters(allItems, filterOptions);

// Example 7: Ranking and filtering
const rankScores = new Map<string, number>();

// Custom ranking logic (higher score = more relevant)
allItems.forEach((item) => {
  let score = 0;
  
  // Higher score for popular items
  if (item.ratingCount && item.ratingCount > 100) score += 10;
  
  // Higher score for highly rated
  if (item.totalRating && item.ratingCount) {
    const avgRating = item.totalRating / item.ratingCount;
    score += avgRating * 2;
  }
  
  rankScores.set(item.id, score);
});

const sortOpts: SortOptions = {
  sortBy: 'relevance',
  sortOrder: 'desc',
};

const rankedResults = rankAndFilter(allItems, rankScores, filterOptions, sortOpts);

// ============================================================================
// 2. REACT HOOKS FOR FILTERING (src/hooks/filters/useFilters.ts)
// ============================================================================

/**
 * Declarative filtering with React hooks
 */
import {
  useItemFilter,
  useOrderFilter,
  useOrderLists,
  useListFilter,
} from '@/src/hooks';

// Example 1: Filter menu items with hooks
function MenuComponent({ items }: { items: MenuItem[] }) {
  const { filteredItems, activeCategory, setActiveCategory } = useItemFilter(
    items,
    'search query'
  );

  return (
    <>
      <CategorySelector value={activeCategory} onChange={setActiveCategory} />
      <ItemList items={filteredItems} />
    </>
  );
}

// Example 2: Filter orders
function OrderHistoryComponent({ orders }: { orders: Order[] }) {
  const { filteredOrders, dateFilter, statusFilter, setDateFilter, setStatusFilter } =
    useOrderFilter(orders, 'today');

  return (
    <>
      <DateFilter value={dateFilter} onChange={setDateFilter} />
      <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      <OrderList orders={filteredOrders} />
    </>
  );
}

// Example 3: Separate active and history orders
function OrderManagementComponent({ orders }: { orders: Order[] }) {
  const { activeOrders, historyOrders } = useOrderLists(orders);

  return (
    <>
      <Section title="Active Orders">
        <OrderList orders={activeOrders} />
      </Section>
      <Section title="Order History">
        <OrderList orders={historyOrders} />
      </Section>
    </>
  );
}

// Example 4: Generic list filter
function SearchableList<T>({ items }: { items: T[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useListFilter(items, searchQuery, {
    searchFields: ['name', 'description'],
  });

  return (
    <>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <List items={filtered} />
    </>
  );
}

// ============================================================================
// 3. ADVANCED FILTERING HOOKS (src/utils/filteringHooks.ts)
// ============================================================================

/**
 * Comprehensive filtering with multiple options
 */
import {
  useAdvancedItemFilter,
  useSimpleItemFilter,
  useRankedItems,
} from '@/src/utils/filteringHooks';

// Example 1: Advanced item filtering UI
function AdvancedItemBrowser({ items }: { items: MenuItem[] }) {
  const {
    filteredItems,
    filters,
    setters,
    resetFilters,
  } = useAdvancedItemFilter(items);

  return (
    <div>
      <SearchInput
        value={filters.searchQuery}
        onChange={setters.setSearchQuery}
        placeholder="Search items..."
      />

      <FilterChips>
        {['veg', 'non-veg', 'vegan', 'all'].map((diet) => (
          <Chip
            key={diet}
            active={filters.dietary === diet}
            onPress={() => setters.setDietary(diet as any)}
          >
            {diet}
          </Chip>
        ))}
      </FilterChips>

      <SortSelector
        value={filters.sortBy}
        onChange={setters.setSortBy}
        options={[
          { label: 'Relevance', value: 'relevance' },
          { label: 'Price (Low to High)', value: 'price' },
          { label: 'Rating', value: 'rating' },
          { label: 'Name', value: 'name' },
        ]}
      />

      <RatingFilter
        value={filters.minRating}
        onChange={setters.setMinRating}
        min={0}
        max={5}
      />

      <Checkbox
        label="Exclude Out of Stock"
        value={filters.excludeOutOfStock}
        onChange={setters.setExcludeOutOfStock}
      />

      <Button onPress={resetFilters}>Reset Filters</Button>

      <ItemList items={filteredItems} />
    </div>
  );
}

// Example 2: Simple search and dietary filter
function SimpleMenuBrowser({ items }: { items: MenuItem[] }) {
  const { filteredItems, searchQuery, setSearchQuery, dietary, setDietary } =
    useSimpleItemFilter(items, 'veg');

  return (
    <>
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search..."
      />

      <DietaryChips
        value={dietary}
        onChange={setDietary}
      />

      <ItemList items={filteredItems} />
    </>
  );
}

// Example 3: Custom ranking
function PersonalizedItemList({ items, userId }: { items: MenuItem[]; userId: string }) {
  // Ranking function: prefer items from user's favorite kitchens, higher rated items
  const rankingFn = (item: MenuItem) => {
    let score = 0;

    // Prefer specific kitchens (you'd have this data from user profile)
    if (favoriteKitchens.includes(item.kitchenId)) {
      score += 20;
    }

    // Prefer highly rated
    if (item.totalRating && item.ratingCount) {
      const avgRating = item.totalRating / item.ratingCount;
      score += avgRating * 5;
    }

    // Prefer frequently ordered
    if (item.ratingCount && item.ratingCount > 50) {
      score += 10;
    }

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

// ============================================================================
// 4. COMPLETE REAL-WORLD EXAMPLE
// ============================================================================

/**
 * Full Featured Menu Browser Component
 */
function FullMenuBrowser() {
  // Fetch items using React Query
  const { data: items = [] } = useUserOrders(userId);

  // Apply advanced filtering
  const {
    filteredItems,
    filters,
    setters,
    resetFilters,
  } = useAdvancedItemFilter(items);

  // Track active filters for UI indicators
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.dietary !== 'all') count++;
    if (filters.excludeOutOfStock !== true) count++;
    if (filters.minRating !== undefined) count++;
    return count;
  }, [filters]);

  return (
    <SafeAreaView>
      {/* Search Bar */}
      <SearchBar
        value={filters.searchQuery}
        onChange={setters.setSearchQuery}
        placeholder="Search items or kitchens..."
      />

      {/* Dietary Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['all', 'veg', 'non-veg', 'vegan'].map((diet) => (
          <DietaryChip
            key={diet}
            label={diet.charAt(0).toUpperCase() + diet.slice(1)}
            active={filters.dietary === diet}
            onPress={() => setters.setDietary(diet as any)}
          />
        ))}
      </ScrollView>

      {/* Advanced Filters Section */}
      <Collapsible title={`More Filters (${activeFilterCount})`}>
        {/* Stock Filter */}
        <FilterRow>
          <Label>Exclude Out of Stock</Label>
          <Toggle
            value={filters.excludeOutOfStock}
            onChange={setters.setExcludeOutOfStock}
          />
        </FilterRow>

        {/* Rating Filter */}
        <FilterRow>
          <Label>Minimum Rating</Label>
          <RatingSlider
            value={filters.minRating}
            onChange={setters.setMinRating}
            min={0}
            max={5}
            step={0.5}
          />
        </FilterRow>

        {/* Sort Option */}
        <FilterRow>
          <Label>Sort By</Label>
          <Picker
            value={filters.sortBy}
            onChange={setters.setSortBy}
            options={[
              { label: 'Relevance', value: 'relevance' },
              { label: 'Price (Low to High)', value: 'price' },
              { label: 'Rating (High to Low)', value: 'rating' },
              { label: 'Name (A-Z)', value: 'name' },
            ]}
          />
        </FilterRow>

        {/* Reset Button */}
        <Button
          onPress={resetFilters}
          variant="secondary"
          fullWidth
        >
          Reset All Filters
        </Button>
      </Collapsible>

      {/* Results */}
      <ResultsHeader>
        Showing {filteredItems.length} items
      </ResultsHeader>

      {filteredItems.length > 0 ? (
        <ItemList items={filteredItems} />
      ) : (
        <EmptyState
          title="No items found"
          description="Try adjusting your filters"
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// 5. BEST PRACTICES
// ============================================================================

/**
 * ✅ DO
 * - Use business logic functions for non-React contexts
 * - Use React hooks in components for reactive filtering
 * - Combine multiple filters for better UX
 * - Memoize filter results to avoid unnecessary re-renders
 * - Show active filter counts to guide users
 * - Provide a "Reset" button for complex filters
 * - Debounce search queries
 * - Cache filter results if data is large
 */

/**
 * ❌ DON'T
 * - Filter on every keystroke without debouncing
 * - Create deeply nested ternaries for complex filtering
 * - Forget to handle empty states
 * - Apply filters without showing the user what's active
 * - Filter server-side without pagination
 * - Create performance issues with O(n²) filtering
 */
