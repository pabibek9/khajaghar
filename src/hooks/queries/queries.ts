/**
 * React Query query hooks for data fetching operations
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchUserOrders, fetchOrderDetails } from '../../services/firebase/firestoreService';
import { Order, OrderDetails } from '../../types/order';

// Query keys factory
export const queryKeys = {
  all: ['data'] as const,
  orders: () => [...queryKeys.all, 'orders'] as const,
  orderList: (userId: string) => [...queryKeys.orders(), { userId }] as const,
  orderDetail: (orderId: string) => [...queryKeys.orders(), orderId] as const,
};

/**
 * Hook to fetch user orders
 */
export function useUserOrders(
  userId: string,
  options?: UseQueryOptions<Order[], Error>
) {
  return useQuery({
    queryKey: queryKeys.orderList(userId),
    queryFn: () => fetchUserOrders(userId),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Hook to fetch order details
 */
export function useOrderDetails(
  orderId: string,
  options?: UseQueryOptions<OrderDetails, Error>
) {
  return useQuery({
    queryKey: queryKeys.orderDetail(orderId),
    queryFn: () => fetchOrderDetails(orderId),
    enabled: !!orderId,
    ...options,
  });
}
