/**
 * React Query mutation hooks for data modification operations
 */

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import {
  createOrder,
  updateOrder,
  cancelOrder,
  deleteOrder,
  Order,
} from '../../services/firebase/firestoreService';
import { queryKeys } from './queries';

/**
 * Hook to create a new order
 */
export function useCreateOrder(
  options?: UseMutationOptions<Order, Error, Partial<Order>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: Partial<Order>) => createOrder(orderData),
    onSuccess: (newOrder: Order) => {
      // Invalidate orders list to refetch
      if (newOrder.userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.orderList(newOrder.userId),
        });
      }
    },
    ...options,
  });
}

/**
 * Hook to update an existing order
 */
export function useUpdateOrder(
  options?: UseMutationOptions<Order, Error, { orderId: string; data: Partial<Order> }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: Partial<Order> }) =>
      updateOrder(orderId, data),
    onSuccess: (updatedOrder: Order) => {
      // Invalidate specific order detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.orderDetail(updatedOrder.id),
      });
      // Invalidate orders list
      if (updatedOrder.userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.orderList(updatedOrder.userId),
        });
      }
    },
    ...options,
  });
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: () => {
      // Invalidate all orders queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders(),
      });
    },
    ...options,
  });
}

/**
 * Hook to delete an order
 */
export function useDeleteOrder(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: () => {
      // Invalidate all orders queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders(),
      });
    },
    ...options,
  });
}
}
