/**
 * Business logic for ranking food items
 * Pure functions - no UI dependencies
 */

export interface RankingFactors {
  locationMatch?: number;
  distance?: number;
  rating?: number;
  ratingCount?: number;
}

/**
 * Haversine formula for calculating distance between two coordinates
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Calculate rank score for an item based on location, rating, and distance
 * Higher score = better ranking
 */
export function calculateRankScore(
  userAddress: string,
  userLat: number | null,
  userLng: number | null,
  kitchenAddress: string,
  kitchenLat: number | null,
  kitchenLng: number | null,
  totalRating: number,
  ratingCount: number
): number {
  let score = 0;

  // Location match bonus (1000 points)
  if (userAddress && kitchenAddress) {
    const userAddressLower = userAddress.toLowerCase();
    const kitchenAddressLower = kitchenAddress.toLowerCase();
    const locations = ['itahari', 'kathmandu', 'lalitpur', 'bhaktapur', 'biratnagar', 'pokhara'];
    
    if (locations.some((loc) => userAddressLower.includes(loc) && kitchenAddressLower.includes(loc))) {
      score += 1000;
    }
  }

  // Distance-based score (max 200 points)
  if (userLat !== null && userLng !== null && kitchenLat !== null && kitchenLng !== null) {
    const km = calculateDistance(userLat, userLng, kitchenLat, kitchenLng);
    score += Math.max(0, 200 - Math.min(200, Math.round(km * 20)));
  }

  // Rating-based score (max 500 points)
  if (ratingCount > 0) {
    const avgRating = totalRating / ratingCount;
    score += avgRating * 100; // Up to 500 for 5-star rating
  }

  return score;
}

/**
 * Sort items by rank score and name
 */
export function rankItems<T extends { name: string; score: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
