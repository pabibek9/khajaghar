/**
 * Firebase/Firestore service layer
 * Centralized place for all Firestore operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../constants/firebase';

export interface KitchenProfile {
  id: string;
  preferredName?: string;
  address?: string;
  vip?: boolean;
  isOpen?: boolean;
  location?: { lat: number; lng: number };
  email?: string;
  missing_food_reports?: number;
  banned?: boolean;
}

export interface MenuItem {
  id: string;
  kitchenId: string;
  kitchenName: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  dietary?: string;
  outOfStock?: boolean;
  totalRating?: number;
  ratingCount?: number;
  createdAt?: any;
}

export interface Order {
  id: string;
  status: string;
  itemId?: string;
  itemName: string;
  total: number;
  kitchenId: string;
  kitchenName: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  preferredName?: string;
  address?: string;
  email?: string;
  phone?: string;
  location?: { lat: number; lng: number };
  [key: string]: any;
}

/**
 * Subscribe to VIP kitchens (open + approved)
 */
export function subscribeToVIPKitchens(callback: (kitchens: KitchenProfile[]) => void): () => void {
  const q = query(
    collection(db, 'kitchens'),
    where('vip', '==', true),
    where('isOpen', '==', true)
  );

  return onSnapshot(q, (snap) => {
    const kitchens: KitchenProfile[] = [];
    snap.forEach((doc) => {
      kitchens.push({ id: doc.id, ...(doc.data() as any) });
    });
    callback(kitchens);
  });
}

/**
 * Subscribe to ALL kitchens (used for the ranking kitchensMap in useMenu)
 */
export function subscribeToAllKitchens(callback: (kitchens: KitchenProfile[]) => void): () => void {
  return onSnapshot(collection(db, 'kitchens'), (snap) => {
    const kitchens: KitchenProfile[] = [];
    snap.forEach((doc) => {
      kitchens.push({ id: doc.id, ...(doc.data() as any) });
    });
    callback(kitchens);
  });
}

/**
 * Subscribe to items for a specific kitchen
 */
export function subscribeToKitchenItems(
  kitchenId: string,
  callback: (items: MenuItem[]) => void
): () => void {
  const q = query(
    collection(db, 'kitchens', kitchenId, 'items'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const items: MenuItem[] = [];
    snap.forEach((doc) => {
      items.push({
        id: `${kitchenId}_${doc.id}`,
        kitchenId,
        ...(doc.data() as any),
      });
    });
    callback(items);
  });
}

/**
 * Subscribe to user profile
 */
export function subscribeToUserProfile(userId: string, callback: (user: UserProfile | null) => void): () => void {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to user orders
 */
export function subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void): () => void {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const orders: Order[] = [];
    snap.forEach((doc) => {
      orders.push({ id: doc.id, ...(doc.data() as any) } as Order);
    });
    callback(orders);
  });
}

/**
 * Get all kitchens (one-time fetch)
 */
export async function fetchAllKitchens(): Promise<KitchenProfile[]> {
  const q = query(collection(db, 'kitchens'));
  const snap = await getDocs(q);
  const kitchens: KitchenProfile[] = [];
  snap.forEach((doc) => {
    kitchens.push({ id: doc.id, ...(doc.data() as any) });
  });
  return kitchens;
}

/**
 * Get single kitchen
 */
export async function fetchKitchen(kitchenId: string): Promise<KitchenProfile | null> {
  const snap = await getDoc(doc(db, 'kitchens', kitchenId));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as KitchenProfile;
  }
  return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: string, extraFields?: Record<string, any>): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: serverTimestamp(),
    ...extraFields,
  });
}

/**
 * Create feedback/report
 */
export async function createReport(reportData: Record<string, any>): Promise<string> {
  const docRef = await addDoc(collection(db, 'reports'), {
    ...reportData,
    createdAt: serverTimestamp(),
    status: 'pending_investigation',
  });
  return docRef.id;
}

/**
 * Update item rating
 */
export async function updateItemRating(
  kitchenId: string,
  itemId: string,
  newRating: number
): Promise<void> {
  const itemRef = doc(db, 'kitchens', kitchenId, 'items', itemId);
  const itemSnap = await getDoc(itemRef);

  if (itemSnap.exists()) {
    const itemData = itemSnap.data();
    await updateDoc(itemRef, {
      totalRating: (itemData.totalRating || 0) + newRating,
      ratingCount: (itemData.ratingCount || 0) + 1,
    });
  }
}

/**
 * Fetch user orders (one-time fetch)
 */
export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(q);
  const orders: Order[] = [];
  snap.forEach((doc) => {
    orders.push({ id: doc.id, ...(doc.data() as any) } as Order);
  });
  return orders;
}

/**
 * Fetch order details
 */
export async function fetchOrderDetails(orderId: string): Promise<Order> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as any) } as Order;
  }
  throw new Error(`Order ${orderId} not found`);
}

/**
 * Create a new order
 */
export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const docRef = await addDoc(collection(db, 'orders'), {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'pending',
  });

  const snap = await getDoc(docRef);
  return { id: snap.id, ...(snap.data() as any) } as Order;
}

/**
 * Update an existing order
 */
export async function updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
  await updateDoc(doc(db, 'orders', orderId), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(doc(db, 'orders', orderId));
  return { id: snap.id, ...(snap.data() as any) } as Order;
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an order
 */
export async function deleteOrder(orderId: string): Promise<void> {
  // Note: In production, you might want to use soft delete (update status to 'deleted')
  // instead of hard delete for audit trail purposes
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'deleted',
    updatedAt: serverTimestamp(),
  });
}
