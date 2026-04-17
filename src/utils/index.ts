/**
 * Barrel exports for all utility functions
 */

// API utilities
export { api, handleApiError } from './api';
export { safeApiCall } from './safeApiCall';

// Business logic utilities
export {
  filterByDietary,
  filterBySearch,
  filterOutOfStock,
  filterByRating,
  sortItems,
  applyFilters,
  rankAndFilter,
} from './business';

export type {
  DietaryType,
  SortBy,
  MenuItem,
  FilterOptions,
  SortOptions,
} from './business';

// Filtering hooks (React)
export {
  useAdvancedItemFilter,
  useSimpleItemFilter,
  useRankedItems,
} from './filteringHooks';
