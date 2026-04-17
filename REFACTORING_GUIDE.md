# Khaja App - Refactoring & Cleanup Guide

## Overview
This guide documents the refactoring improvements made to the Khaja app codebase and provides recommendations for ongoing maintenance and future development.

## Completed Refactoring

### 1. **File Organization Structure**

#### Before
```
src/
  api/
  components/
  constants/
  hooks/
  screens/
  services/
  utils/
```

#### After (Proposed)
```
src/
  api/                    # External API clients
  components/             # React components
  constants/              # App constants & config
  hooks/                  # All custom React hooks
    ├── data/            # Data fetching hooks (real-time, subscriptions)
    └── queries/         # React Query hooks (queries & mutations)
  screens/               # Screen/page components
  services/              # Business logic services
    ├── firebase/        # Firebase-specific services
    └── auth/           # Authentication services
  types/                 # TypeScript interfaces & types
  utils/                 # Utility functions
```

### 2. **Created Custom Hooks**

#### `useUserProfile` (`src/hooks/data/useUserProfile.ts`)
- **Purpose**: Real-time user profile management with Firestore subscriptions
- **Features**:
  - Real-time profile updates via subscription
  - Automatic cleanup on unmount
  - Error handling & loading states
  - Profile update method
- **Usage**:
  ```tsx
  const { user, isLoading, error, updateProfile } = useUserProfile({ userId: 'user123' });
  ```

#### `useUserOrders` / `useOrderDetails` (`src/hooks/queries/queries.ts`)
- **Purpose**: React Query hooks for order data fetching
- **Features**:
  - Automatic caching & background refetching
  - Configurable enable/disable states
  - Query key management
- **Usage**:
  ```tsx
  const { data, isLoading, error } = useUserOrders(userId);
  ```

#### `useCreateOrder` / `useUpdateOrder` / `useCancelOrder` / `useDeleteOrder` (`src/hooks/queries/mutations.ts`)
- **Purpose**: React Query mutations for order management
- **Features**:
  - Automatic query invalidation
  - Optimistic updates support
  - Error handling
- **Usage**:
  ```tsx
  const createMutation = useCreateOrder({
    onSuccess: () => console.log('Created'),
    onError: (err) => console.error(err),
  });
  createMutation.mutate({ restaurantId: '123', items: [...] });
  ```

### 3. **Service Layer Improvements**

#### New Firebase Service Layer (`src/services/firebase/firestoreService.ts`)
- Centralized Firestore operations
- Consistent error handling
- Type-safe document operations
- Query builders for complex filters

#### Service Patterns Implemented
```typescript
// Subscription pattern
subscribeToUserProfile(userId, listener)

// Fetch pattern
fetchUserOrders(userId)

// Mutation pattern
createOrder(data)
updateOrder(orderId, data)
```

### 4. **Type Safety Enhancements**

#### Created Type Definitions (`src/types/`)
- `Order`: Order data model with metadata
- `OrderDetails`: Extended order information
- `UserProfile`: User information structure
- `Kitchen`: Kitchen/restaurant data model

**Benefit**: IDE autocomplete, compile-time error checking, better documentation

### 5. **State Management**

#### Recommended Patterns

**For Global State**:
- Use React Query for server state
- Use Context API for UI state (theme, auth state)
- Use Zustand/Redux for complex client state

**Example**:
```tsx
// Server state (React Query)
const { data: orders } = useUserOrders(userId);

// Auth context
const { user, logout } = useAuth();

// Mutation
const createOrder = useCreateOrder();
```

## Best Practices & Patterns

### 1. **Hook Composition**
Combine hooks for powerful data fetching:
```tsx
function OrderList({ userId }) {
  const { data: orders, isLoading } = useUserOrders(userId);
  const { user } = useUserProfile({ userId });
  
  if (isLoading) return <LoadingState />;
  return <OrderListView orders={orders} user={user} />;
}
```

### 2. **Error Handling**
Always provide error UI for failed operations:
```tsx
function MyComponent() {
  const { data, error } = useUserOrders(userId);
  
  if (error) return <ErrorBanner message={error.message} />;
  return <OrderList data={data} />;
}
```

### 3. **Loading States**
Use skeleton loaders instead of spinners:
```tsx
function Orders() {
  const { data, isLoading } = useUserOrders(userId);
  
  if (isLoading) return <SkeletonLoader count={3} />;
  return <OrderList data={data} />;
}
```

### 4. **Real-time Updates**
For features needing real-time data, use `useUserProfile`:
```tsx
function ProfilePage() {
  const { user, updateProfile } = useUserProfile({ userId });
  
  const handleUpdate = async (updates) => {
    try {
      await updateProfile(updates);
      // UI updates automatically via subscription
    } catch (err) {
      console.error('Update failed:', err);
    }
  };
  
  return <ProfileForm user={user} onUpdate={handleUpdate} />;
}
```

## Migration Guide

### For Existing Components

#### Before (Direct Firestore):
```tsx
useEffect(() => {
  const unsub = onSnapshot(doc(db, 'orders', orderId), (doc) => {
    setOrder(doc.data());
  });
  return unsub;
}, [orderId]);
```

#### After (Using Custom Hooks):
```tsx
const { user: order } = useUserProfile({ userId: orderId });
// or if using React Query
const { data: order } = useOrderDetails(orderId);
```

### For Existing Services

1. Move Firestore logic to `src/services/firebase/firestoreService.ts`
2. Create hooks in `src/hooks/queries/` or `src/hooks/data/`
3. Update component imports to use hooks instead of direct Firestore calls

## Performance Optimization Tips

### 1. **Query Deduplication**
React Query automatically deduplicates identical requests:
```tsx
// Both components fetch the same data only once
<UserProfile userId="123" />
<UserStats userId="123" />
```

### 2. **Cache Management**
```tsx
const queryClient = useQueryClient();

// Invalidate cache after mutation
queryClient.invalidateQueries({ queryKey: queryKeys.orderList(userId) });

// Update cache optimistically
queryClient.setQueryData(queryKeys.orderDetail(orderId), updatedOrder);
```

### 3. **Lazy Query Loading**
```tsx
const { data } = useOrderDetails(orderId, {
  enabled: !!orderId,  // Disabled until orderId exists
});
```

## Common Patterns

### Infinite Queries (Pagination)
```tsx
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: queryKeys.orderList(userId),
  queryFn: ({ pageParam }) => fetchOrders(userId, pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Optimistic Updates
```tsx
const updateMutation = useUpdateOrder({
  onMutate: async (newOrder) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: queryKeys.orderDetail(newOrder.id) });
    
    // Snapshot old data
    const oldOrder = queryClient.getQueryData(queryKeys.orderDetail(newOrder.id));
    
    // Set optimistic data
    queryClient.setQueryData(queryKeys.orderDetail(newOrder.id), newOrder);
    
    return { oldOrder };
  },
  onError: (err, newOrder, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKeys.orderDetail(newOrder.id), context?.oldOrder);
  },
});
```

## Code Organization Rules

### ✅ DO

- Keep hooks focused and single-responsibility
- Use TypeScript interfaces for all data structures
- Organize services by domain (firebase, auth, payment)
- Co-locate related types with their hooks
- Export hooks from barrel files (index.ts)
- Add JSDoc comments to public API

### ❌ DON'T

- Put business logic in components
- Create circular imports between services
- Mix UI and data fetching concerns
- Leave untyped any's in code
- Create deeply nested folder structures
- Put all code in one giant hooks file

## Testing

### Unit Test Example (useUserProfile)
```typescript
describe('useUserProfile', () => {
  it('should load user profile', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useUserProfile({ userId: '123' })
    );
    
    expect(result.current.isLoading).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.user).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });
});
```

## Next Steps & Recommendations

### Immediate Priorities
1. [ ] Migrate existing components to use new hooks
2. [ ] Add React Query provider to app root
3. [ ] Type all API responses
4. [ ] Set up error boundary for error handling

### Short-term Improvements
1. [ ] Add query result caching strategies
2. [ ] Implement optimistic updates for mutations
3. [ ] Add loading skeleton states
4. [ ] Set up error logging service

### Long-term Refactoring
1. [ ] Extract reusable form hooks (useForm, useFormField)
2. [ ] Create custom validation hooks
3. [ ] Add analytics event hooks
4. [ ] Implement deep linking service
5. [ ] Add offline mode support

## Troubleshooting

### Issue: Queries invalidating too frequently
**Solution**: Use more specific query keys and only invalidate when necessary

### Issue: Stale data after mutations
**Solution**: Use `onSuccess` callback to invalidate related queries

### Issue: Infinite hooks re-renders
**Solution**: Check hook dependency arrays and use `useCallback` for stable functions

## References

- [React Query Documentation](https://tanstack.com/query/latest)
- [Firebase JavaScript SDK](https://firebase.google.com/docs/reference/js)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated**: 2024
**Maintained By**: Development Team
