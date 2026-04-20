
export type DietaryType = 'veg' | 'non-veg' | 'vegan' | 'all';
export type SortBy = 'name' | 'price' | 'rating' | 'relevance';

export interface MenuItem {
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

export interface FilterOptions {
  dietary?: DietaryType;
  searchQuery?: string;
  maxItems?: number;
  excludeOutOfStock?: boolean;
  minRating?: number;
}

export interface SortOptions {
  sortBy?: SortBy;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter items by dietary preference
 */
export function filterByDietary(items: MenuItem[], dietary: DietaryType): MenuItem[] {
  if (dietary === 'all') return items;

  return items.filter((item) => {
    const itemDietary = item.dietary?.toLowerCase() || '';

    if (dietary === 'veg') {
      return itemDietary === 'veg' || itemDietary === 'vegan';
    } else if (dietary === 'non-veg') {
      return itemDietary === 'non-veg';
    } else if (dietary === 'vegan') {
      return itemDietary === 'vegan';
    }

    return true;
  });
}

/**
 * Filter items by search query (name or kitchen)
 */
export function filterBySearch(items: MenuItem[], query: string): MenuItem[] {
  if (!query.trim()) return items;

  const q = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.kitchenName.toLowerCase().includes(q)
  );
}

/**
 * Filter out of stock items
 */
export function filterOutOfStock(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => !item.outOfStock);
}

/**
 * Filter by minimum rating
 */
export function filterByRating(items: MenuItem[], minRating: number): MenuItem[] {
  return items.filter((item) => {
    const avgRating = item.totalRating && item.ratingCount 
      ? item.totalRating / item.ratingCount 
      : 0;
    return avgRating >= minRating;
  });
}

/**
 * Sort items by various criteria
 */
export function sortItems<T extends MenuItem>(
  items: T[],
  sortBy: SortBy = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'rating': {
        const ratingA = a.totalRating && a.ratingCount ? a.totalRating / a.ratingCount : 0;
        const ratingB = b.totalRating && b.ratingCount ? b.totalRating / b.ratingCount : 0;
        comparison = ratingA - ratingB;
        break;
      }
      case 'relevance':
      default:
        // Relevance is handled by ranking, default to name
        comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Chain multiple filters together
 */
export function applyFilters(
  items: MenuItem[],
  options: FilterOptions
): MenuItem[] {
  let filtered = items;

  if (options.dietary) {
    filtered = filterByDietary(filtered, options.dietary);
  }

  if (options.searchQuery) {
    filtered = filterBySearch(filtered, options.searchQuery);
  }

  if (options.excludeOutOfStock) {
    filtered = filterOutOfStock(filtered);
  }

  if (options.minRating !== undefined) {
    filtered = filterByRating(filtered, options.minRating);
  }

  if (options.maxItems) {
    filtered = filtered.slice(0, options.maxItems);
  }

  return filtered;
}

/**
 * Combine ranking and filtering
 */
export function rankAndFilter<T extends MenuItem>(
  items: T[],
  rankScores: Map<string, number>,
  filterOptions: FilterOptions,
  sortOptions?: SortOptions
): T[] {
  const filtered = applyFilters(items, filterOptions) as T[];

  let result = filtered
    .map((item) => ({
      item,
      score: rankScores.get(item.id) || 0,
    }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item);

  if (sortOptions?.sortBy && sortOptions.sortBy !== 'relevance') {
    result = sortItems(result, sortOptions.sortBy, sortOptions.sortOrder || 'asc');
  }

  return result;
}
