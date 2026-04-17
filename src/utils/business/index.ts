/**
 * Barrel exports for business logic utilities
 */

export {
  filterByDietary,
  filterBySearch,
  filterOutOfStock,
  filterByRating,
  sortItems,
  applyFilters,
  rankAndFilter,
} from './filtering';

export type {
  DietaryType,
  SortBy,
  MenuItem,
  FilterOptions,
  SortOptions,
} from './filtering';
