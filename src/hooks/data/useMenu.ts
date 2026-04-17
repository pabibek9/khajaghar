/**
 * Custom hook for menu data management
 * Handles fetching, filtering, and ranking of menu items
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  subscribeToVIPKitchens,
  subscribeToKitchenItems,
  KitchenProfile,
  MenuItem as FSMenuItem,
} from '../../services/firebase/firestoreService';
import {
  calculateRankScore,
  rankItems,
} from '../../utils/business/ranking';
import { rankAndFilter, DietaryType, MenuItem } from '../../utils/business/filtering';

export interface UseMenuOptions {
  userAddress: string;
  userLat: number | null;
  userLng: number | null;
}

export interface UseMenuResult {
  items: MenuItem[];
  isLoading: boolean;
  error: string | null;
  visibleItems: MenuItem[];
  filters: {
    search: string;
    dietary: DietaryType;
  };
  setSearch: (search: string) => void;
  setDietary: (dietary: DietaryType) => void;
  refresh: () => Promise<void>;
}

// Cache for rank scores to avoid recalculation
const rankScoreCache = new Map<string, number>();

export function useMenu(options: UseMenuOptions): UseMenuResult {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dietary, setDietary] = useState<DietaryType>('all');

  const unsubscribersRef = useRef<Array<() => void>>([]);
  const kitchensRef = useRef<Map<string, KitchenProfile>>(new Map());

  // Subscribe to VIP kitchens
  useEffect(() => {
    setIsLoading(true);
    try {
      const unsubKitchens = subscribeToVIPKitchens((kitchens) => {
        // Clear previous item subscriptions
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];
        rankScoreCache.clear();

        // Update kitchen cache
        kitchensRef.current.clear();
        kitchens.forEach((k) => kitchensRef.current.set(k.id, k));

        // Subscribe to items for each kitchen
        let loadedKitchens = 0;
        const newItems: MenuItem[] = [];

        if (kitchens.length === 0) {
          setIsLoading(false);
          setItems([]);
          return;
        }

        kitchens.forEach((kitchen) => {
          const unsubItems = subscribeToKitchenItems(kitchen.id, (kitchenItems) => {
            // Add items with kitchen info
            const fullItems = kitchenItems.map((item) => ({
              ...item,
              kitchenId: kitchen.id,
              kitchenName: kitchen.preferredName || 'Kitchen',
            }));

            // Remove old items from this kitchen
            const indexesToRemove = newItems
              .map((item, idx) => (item.kitchenId === kitchen.id ? idx : -1))
              .filter((idx) => idx !== -1)
              .reverse();

            indexesToRemove.forEach((idx) => newItems.splice(idx, 1));

            // Add new items
            newItems.push(...fullItems);

            // Calculate rank scores
            fullItems.forEach((item) => {
              const k = kitchensRef.current.get(item.kitchenId);
              if (k) {
                const score = calculateRankScore(
                  options.userAddress,
                  options.userLat,
                  options.userLng,
                  k.address || '',
                  k.location?.lat || null,
                  k.location?.lng || null,
                  item.totalRating || 0,
                  item.ratingCount || 0
                );
                rankScoreCache.set(item.id, score);
              }
            });

            setItems([...newItems]);

            // Mark as loaded after first kitchen loads
            loadedKitchens++;
            if (loadedKitchens === kitchens.length) {
              setIsLoading(false);
            }
          });

          unsubscribersRef.current.push(unsubItems);
        });
      });

      unsubscribersRef.current.push(unsubKitchens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
      setIsLoading(false);
    }

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [options.userAddress, options.userLat, options.userLng]);

  // Calculate visible items based on filters
  const visibleItems = useMemo(() => {
    const rankScores = rankScoreCache;
    return rankAndFilter(items, rankScores, {
      dietary,
      searchQuery: search,
      maxItems: 60,
    });
  }, [items, search, dietary]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear cache to force re-fetch
      rankScoreCache.clear();
      // The subscriptions will automatically re-fetch
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    items,
    isLoading,
    error,
    visibleItems,
    filters: { search, dietary },
    setSearch,
    setDietary,
    refresh,
  };
}
