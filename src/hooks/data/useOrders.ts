/**
 * Custom hook for order management
 * Handles fetching and filtering orders
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { subscribeToUserOrders, Order } from '../../services/firebase/firestoreService';

export interface UseOrdersOptions {
  userId: string;
}

export interface UseOrdersResult {
  orders: Order[];
  activeOrders: Order[];
  historyOrders: Order[];
  isLoading: boolean;
  error: string | null;
}

export function useOrders(options: UseOrdersOptions): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to orders
  useEffect(() => {
    if (!options.userId) {
      setIsLoading(false);
      return;
    }

    try {
      unsubscribeRef.current = subscribeToUserOrders(options.userId, (fetchedOrders) => {
        setOrders(fetchedOrders);
        setIsLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [options.userId]);

  // Filter active orders
  const activeOrders = useMemo(() => {
    return orders.filter((o) =>
      [
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
      ].includes(o.status)
    );
  }, [orders]);

  // Filter history orders
  const historyOrders = useMemo(() => {
    return orders.filter((o) => ['delivered', 'canceled', 'rejected'].includes(o.status));
  }, [orders]);

  return {
    orders,
    activeOrders,
    historyOrders,
    isLoading,
    error,
  };
}
