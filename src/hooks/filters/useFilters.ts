/**
 * Custom hooks for filtering and searching
 */

import { useMemo, useCallback, useState } from 'react';
import { Order, MenuItem } from '../../services/firebase/firestoreService';

/**
 * Hook for filtering orders by status and date
 */
export function useOrderFilter(orders: Order[], initialDateFilter: 'all' | 'today' | 'month' = 'all') {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>(initialDateFilter);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      result = result.filter(o => {
        const orderDate = o.createdAt instanceof Date 
          ? o.createdAt 
          : new Date(o.createdAt);
        
        if (dateFilter === 'today') {
          const orderDateOnly = new Date(
            orderDate.getFullYear(),
            orderDate.getMonth(),
            orderDate.getDate()
          );
          return orderDateOnly.getTime() === today.getTime();
        }

        if (dateFilter === 'month') {
          return orderDate >= monthStart;
        }

        return true;
      });
    }

    return result;
  }, [orders, statusFilter, dateFilter]);

  const setStatus = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const setDate = useCallback((date: 'all' | 'today' | 'month') => {
    setDateFilter(date);
  }, []);

  return {
    filteredOrders,
    dateFilter,
    statusFilter,
    setDateFilter: setDate,
    setStatusFilter: setStatus,
  };
}

/**
 * Hook for filtering items by category, dietary, and search query
 */
export function useItemFilter(items: MenuItem[], searchQuery: string = '') {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activedietary, setActivedietary] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result = items;

    // Category filter
    if (activeCategory) {
      result = result.filter(item => item.dietary === activeCategory);
    }

    // Dietary filter
    if (activedietary) {
      result = result.filter(item => item.dietary?.includes(activedietary));
    }

    // Search query filter (case-insensitive, searches name and kitchen)
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.kitchenName.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }, [items, activeCategory, activedietary, searchQuery]);

  return {
    filteredItems,
    activeCategory,
    activedietary,
    setActiveCategory,
    setActivedietary,
  };
}

/**
 * Hook for filtering orders into active and history lists
 */
export function useOrderLists(orders: Order[]) {
  const activeStatuses = [
    'pending',
    'accepted',
    'waiting_rider',
    'assigned_to_rider',
    'rider_assigned',
    'rider_cancel_requested',
    'rider_cancel_approved',
    'rider_reported_not_returned',
    'kitchen_preparing',
    'picked_up',
    'on_the_way',
    'requested',
    'out_for_delivery',
    'expired_reassign',
  ];

  const historyStatuses = ['delivered', 'canceled', 'rejected'];

  const activeOrders = useMemo(() => {
    return orders.filter(o => activeStatuses.includes(o.status));
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter(o => historyStatuses.includes(o.status));
  }, [orders]);

  return {
    activeOrders,
    historyOrders,
    allOrders: orders,
  };
}

/**
 * Hook for generic list filtering with search
 */
export interface FilterOptions<T> {
  searchFields?: (keyof T)[];
  stringifyFn?: (item: T) => string;
}

export function useListFilter<T>(
  items: T[],
  searchQuery: string,
  options?: FilterOptions<T>
): T[] {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const lowerQuery = searchQuery.toLowerCase();

    if (options?.stringifyFn) {
      return items.filter(item =>
        options.stringifyFn!(item).toLowerCase().includes(lowerQuery)
      );
    }

    if (options?.searchFields) {
      return items.filter(item =>
        options.searchFields!.some(field => {
          const value = item[field];
          return String(value).toLowerCase().includes(lowerQuery);
        })
      );
    }

    return items;
  }, [items, searchQuery, options]);
}
