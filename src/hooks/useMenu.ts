// src/hooks/useMenu.ts
//
// Manages all VIP kitchen + menu item subscriptions.
//
// Architecture:
//   1. subscribeToAllKitchens — keeps a live kitchensMap used for ranking/delivery-fee
//   2. subscribeToVIPKitchens — watches open VIP kitchens
//   3. Per-kitchen subscribeToKitchenItems — watches each kitchen's item list
//
// Refresh support:
//   Calling refresh() increments a refreshKey which tears down and recreates
//   all item subscriptions, causing Firestore to re-deliver the latest data.
//   isRefreshing is true until at least one kitchen's items arrive.
//
// Usage:
//   const { items, kitchensMap, isLoading, isRefreshing, refresh } = useMenu(uid);

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  subscribeToAllKitchens,
  subscribeToVIPKitchens,
  subscribeToKitchenItems,
  KitchenProfile,
  MenuItem,
} from '../services/firebase/firestoreService';

export interface UseMenuResult {
  items: MenuItem[];
  /** All kitchens map (id → profile) — used for ranking & delivery fee calc */
  kitchensMap: Map<string, KitchenProfile>;
  /** True on first data load before any items arrive */
  isLoading: boolean;
  /** True while a pull-to-refresh re-subscription is in flight */
  isRefreshing: boolean;
  /** Trigger a full data refresh (tears down + recreates subscriptions) */
  refresh: () => void;
}

export function useMenu(uid: string | null): UseMenuResult {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [kitchensMap, setKitchensMap] = useState<Map<string, KitchenProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const itemUnsubsRef = useRef<(() => void)[]>([]);

  // ── All-kitchens map (for ranking + fee calculation) ───────────────────────
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToAllKitchens((kitchens) => {
      const m = new Map<string, KitchenProfile>();
      kitchens.forEach((k) => m.set(k.id, k));
      setKitchensMap(m);
    });
    return () => unsub();
  }, [uid]);

  // ── VIP kitchen items (refreshKey forces full re-subscription) ─────────────
  useEffect(() => {
    if (!uid) return;

    let firstLoad = true;

    // Tear down previous item listeners before starting fresh
    itemUnsubsRef.current.forEach((fn) => fn());
    itemUnsubsRef.current = [];
    setItems([]);

    const kitchenUnsub = subscribeToVIPKitchens((kitchens) => {
      // Tear down stale per-kitchen listeners
      itemUnsubsRef.current.forEach((fn) => fn());
      itemUnsubsRef.current = [];

      // Remove items belonging to kitchens that are no longer active
      setItems((prev) => prev.filter((it) => kitchens.some((k) => k.id === it.kitchenId)));

      if (kitchens.length === 0 && firstLoad) {
        firstLoad = false;
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      kitchens.forEach((kitchen) => {
        const itemUnsub = subscribeToKitchenItems(kitchen.id, (rawItems) => {
          // Enrich with kitchenName (not stored on item docs in Firestore)
          const enriched: MenuItem[] = rawItems.map((item) => ({
            ...item,
            kitchenName: kitchen.preferredName || 'Kitchen',
          }));

          setItems((prev) => {
            const others = prev.filter((x) => x.kitchenId !== kitchen.id);
            return [...others, ...enriched];
          });

          // Mark loading done after first batch of items arrives
          if (firstLoad) {
            firstLoad = false;
            setIsLoading(false);
            setIsRefreshing(false);
          }
        });
        itemUnsubsRef.current.push(itemUnsub);
      });
    });

    return () => {
      kitchenUnsub();
      itemUnsubsRef.current.forEach((fn) => fn());
      itemUnsubsRef.current = [];
    };
  }, [uid, refreshKey]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return { items, kitchensMap, isLoading, isRefreshing, refresh };
}
