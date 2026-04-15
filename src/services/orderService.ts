// src/services/orderService.ts
//
// All Firestore write operations that affect orders are centralised here and
// guarded with safeApiCall() so they silently fail (with a toast) when the
// device is offline.
//
// Import these helpers and call them from user.tsx, kitchen.tsx, rider/index.tsx
// instead of calling Firestore directly.

import { Alert } from 'react-native';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../constants/firebase';
import { safeApiCall } from '../utils/safeApiCall';

// ─── Default toast helper ─────────────────────────────────────────────────────
// Components can pass their own showToast; this is just a fallback.
function defaultToast(msg: string) {
  Alert.alert('Offline', msg);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  remarks: string | null;
  kitchenId: string;
  kitchenName: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  paymentMethod: string;
  userAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  kitchenAddress: string | null;
  kitchenLat: number | null;
  kitchenLng: number | null;
  deliveryFee: number;
  total: number;
}

/**
 * Creates a new order document in Firestore.
 * Returns the document reference, or null if offline.
 */
export async function placeOrder(
  payload: PlaceOrderPayload,
  showToast: (msg: string) => void = defaultToast,
) {
  return safeApiCall(
    () =>
      addDoc(collection(db, 'orders'), {
        ...payload,
        status: 'requested',
        userConfirmedReceived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    showToast,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATUS UPDATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the status of an order.
 * Wraps updateDoc so writes are blocked when the device is offline.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  extraFields: Record<string, unknown> = {},
  showToast: (msg: string) => void = defaultToast,
) {
  return safeApiCall(
    () =>
      updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
        ...extraFields,
      }),
    showToast,
  );
}

/**
 * Cancels a pending order.
 */
export async function cancelOrder(
  orderId: string,
  showToast: (msg: string) => void = defaultToast,
) {
  return updateOrderStatus(orderId, 'canceled', {}, showToast);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT (placeholder – extend with real payment gateway integration)
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentPayload {
  orderId: string;
  amount: number;
  method: 'cod' | 'card' | 'esewa' | 'khalti';
  userId: string;
}

/**
 * Processes payment for an order.
 * Currently records a COD confirmation; extend for real gateway calls.
 */
export async function processPayment(
  payload: PaymentPayload,
  showToast: (msg: string) => void = defaultToast,
) {
  return safeApiCall(
    () =>
      updateDoc(doc(db, 'orders', payload.orderId), {
        paymentStatus: 'paid',
        paymentMethod: payload.method,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    showToast,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW / RATING
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitReviewPayload {
  orderId: string;
  kitchenId: string;
  /** The RN subcollection item id, e.g. itemId stored on the order doc */
  itemDocId: string;
  rating: number;
  comment: string;
}

/**
 * Submits a user rating for a delivered order.
 * Updates both the order doc and the kitchen item's aggregate rating.
 */
export async function submitOrderReview(
  payload: SubmitReviewPayload,
  showToast: (msg: string) => void = defaultToast,
) {
  return safeApiCall(async () => {
    const orderRef = doc(db, 'orders', payload.orderId);
    await updateDoc(orderRef, {
      rating: payload.rating,
      ratingComment: payload.comment,
      updatedAt: serverTimestamp(),
    });

    const itemRef = doc(db, 'kitchens', payload.kitchenId, 'items', payload.itemDocId);
    const itemSnap = await getDoc(itemRef);
    if (itemSnap.exists()) {
      const d = itemSnap.data();
      await updateDoc(itemRef, {
        totalRating: (d.totalRating || 0) + payload.rating,
        ratingCount: (d.ratingCount || 0) + 1,
      });
    }
  }, showToast);
}

// ─────────────────────────────────────────────────────────────────────────────
// CART WRITES (if cart is Firestore-backed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes a cart item to Firestore (if the cart is server-persisted).
 * If the cart is local-only (AsyncStorage/state), this function is not needed.
 */
export async function addToCart(
  userId: string,
  item: Record<string, unknown>,
  showToast: (msg: string) => void = defaultToast,
) {
  return safeApiCall(
    () => addDoc(collection(db, 'users', userId, 'cart'), item),
    showToast,
  );
}
