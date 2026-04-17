/**
 * Advanced filtering utilities combining business logic and hooks
 */

import { useCallback, useMemo, useState } from 'react';
import {
  applyFilters,
  rankAndFilter,
  sortItems,
  FilterOptions,
  SortOptions,
  MenuItem,
} from './business/filtering';

/**
 * Hook for advanced item filtering with all options
 * Combines dietary, search, rating, and sorting
 */
export function useAdvancedItemFilter(
  items: MenuItem[],
  initialSearchQuery: string = ''
) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [dietary, setDietary] = useState<'veg' | 'non-veg' | 'vegan' | 'all'>('all');
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(true);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating' | 'relevance'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredItems = useMemo(() => {
    const filterOpts: FilterOptions = {
      dietary: dietary === 'all' ? 'all' : dietary,
      searchQuery,
      excludeOutOfStock,
      minRating,
    };

    const sortOpts: SortOptions = {
      sortBy,
      sortOrder,
    };

    // Use dummy rank scores if you want to apply custom ranking
    const rankScores = new Map<string, number>();
    
    return rankAndFilter(items, rankScores, filterOpts, sortOpts);
  }, [items, searchQuery, dietary, excludeOutOfStock, minRating, sortBy, sortOrder]);

  return {
    filteredItems,
    filters: {
      searchQuery,
      dietary,
      excludeOutOfStock,
      minRating,
      sortBy,
      sortOrder,
    },
    setters: {
      setSearchQuery,
      setDietary,
      setExcludeOutOfStock,
      setMinRating,
      setSortBy,
      setSortOrder,
    },
    resetFilters: useCallback(() => {
      setSearchQuery('');
      setDietary('all');
      setExcludeOutOfStock(true);
      setMinRating(undefined);
      setSortBy('relevance');
      setSortOrder('asc');
    }, []),
  };
}

/**
 * Hook for simple search and dietary filter
 * Lighter weight than useAdvancedItemFilter
 */
export function useSimpleItemFilter(
  items: MenuItem[],
  initialDietary: 'veg' | 'non-veg' | 'vegan' | 'all' = 'all'
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dietary, setDietary] = useState(initialDietary);

  const filteredItems = useMemo(() => {
    const filterOpts: FilterOptions = {
      dietary: dietary === 'all' ? 'all' : dietary,
      searchQuery,
    };

    const rankScores = new Map<string, number>();
    return rankAndFilter(items, rankScores, filterOpts);
  }, [items, searchQuery, dietary]);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    dietary,
    setDietary,
  };
}

/**
 * Hook to apply custom ranking to items
 * Useful for sorting by relevance with custom scores
 */
export function useRankedItems(
  items: MenuItem[],
  rankingFn: (item: MenuItem) => number,
  filterOptions?: FilterOptions,
  sortOptions?: SortOptions
) {
  return useMemo(() => {
    const rankScores = new Map<string, number>();
    
    items.forEach(item => {
      rankScores.set(item.id, rankingFn(item));
    });

    return rankAndFilter(
      items,
      rankScores,
      filterOptions || {},
      sortOptions
    );
  }, [items, rankingFn, filterOptions, sortOptions]);
}
