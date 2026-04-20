// src/hooks/useOrders.ts
//
// Manages the user's order subscription, derived order lists, and all
// order-related actions (cancel, reassign, deliver, report, review).
//
// Notification modals (rejection, delivery, report-warning) are derived
// from the live orders stream and exposed as state that user.tsx can bind
// Modal visibility directly to.
//
// Usage:
//   const ordersHook = useOrders(uid);

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../constants/firebase';
import { subscribeToUserOrders, Order } from '../services/firebase/firestoreService';
import { submitOrderReview } from '../services/orderService';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set([
  'requested', 'pending', 'accepted', 'kitchen_preparing', 'waiting_rider',
  'rider_assigned', 'assigned_to_rider', 'rider_cancel_requested',
  'rider_cancel_approved', 'rider_reported_not_returned',
  'picked_up', 'on_the_way', 'out_for_delivery', 'expired_reassign',
]);

const FIFTEEN_MINS = 15 * 60 * 1000;
const TEN_MINS = 10 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseOrdersResult {
  orders: Order[];
  activeOrders: Order[];
  historyOrders: Order[];
  // Notification modal state
  activeRejection: Order | null;
  setActiveRejection: (o: Order | null) => void;
  activeDelivery: Order | null;
  setActiveDelivery: (o: Order | null) => void;
  activeReportWarning: Order | null;
  setActiveReportWarning: (o: Order | null) => void;
  deliveryFeedback: 'prompt' | 'yes' | 'no';
  setDeliveryFeedback: (f: 'prompt' | 'yes' | 'no') => void;
  // Actions
  cancelOrder: (orderId: string, status: string) => Promise<void>;
  reassignOrder: (order: Order, onNavigate: (itemName: string) => void) => Promise<void>;
  dismissRejection: () => Promise<void>;
  dismissReportWarning: () => Promise<void>;
  deliverYes: () => Promise<void>;
  deliverNo: (userName: string, userEmail: string, userId: string) => Promise<void>;
  submitReview: (
    orderId: string, kitchenId: string, itemDocId: string,
    rating: number, comment: string,
  ) => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOrders(uid: string | null): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeRejection, setActiveRejection] = useState<Order | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Order | null>(null);
  const [activeReportWarning, setActiveReportWarning] = useState<Order | null>(null);
  const [deliveryFeedback, setDeliveryFeedback] = useState<'prompt' | 'yes' | 'no'>('prompt');

  // Refs keep modal state readable inside Firestore callbacks without stale closures
  const activeRejectionRef = useRef<Order | null>(null);
  const activeDeliveryRef = useRef<Order | null>(null);
  const activeReportWarningRef = useRef<Order | null>(null);
  activeRejectionRef.current = activeRejection;
  activeDeliveryRef.current = activeDelivery;
  activeReportWarningRef.current = activeReportWarning;

  // ── Orders subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUserOrders(uid, (list) => {
      setOrders(list);
      const now = Date.now();

      // Rejection modal
      const newReject = list.find(
        (o) =>
          o.status === 'rejected' &&
          !o.userDismissedRejection &&
          o.updatedAt?.toMillis?.() &&
          now - o.updatedAt.toMillis() < FIFTEEN_MINS,
      );
      if (newReject && !activeRejectionRef.current) setActiveRejection(newReject);

      // Delivery confirmation modal
      const newDelivery = list.find(
        (o) =>
          o.status === 'delivered' &&
          !o.userConfirmedReceived &&
          !o.userDidNotReceiveReported &&
          o.updatedAt?.toMillis?.() &&
          now - o.updatedAt.toMillis() < FIFTEEN_MINS,
      );
      if (newDelivery && !activeDeliveryRef.current) {
        setActiveDelivery(newDelivery);
        setDeliveryFeedback('prompt');
      }

      // Report warning modal
      const newReport = list.find(
        (o) =>
          o.status === 'canceled' &&
          o.cancellationReason &&
          o.userNotifiedOfReport === false,
      );
      if (newReport && !activeReportWarningRef.current) setActiveReportWarning(newReport);
    });
    return () => unsub();
  }, [uid]);

  // ── Auto-cancel requests after 10 minutes ─────────────────────────────────
  useEffect(() => {
    if (!uid || orders.length === 0) return;
    const interval = setInterval(() => {
      orders.forEach((o) => {
        const createdMs = o.createdAt?.toMillis?.() ?? 0;
        if (o.status === 'requested' && Date.now() - createdMs > TEN_MINS) {
          updateDoc(doc(db, 'orders', o.id), {
            status: 'canceled',
            updatedAt: serverTimestamp(),
            autoCanceled: true,
            autoCanceledReason: 'Kitchen did not accept within 10 minutes',
          }).catch(console.error);
        }
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [orders, uid]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const historyOrders = orders.filter((o) =>
    ['delivered', 'canceled', 'rejected'].includes(o.status),
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const cancelOrder = useCallback(async (orderId: string, status: string) => {
    if (status !== 'requested' && status !== 'expired_reassign') {
      Alert.alert('Cannot cancel', 'Only pending or expired requests can be canceled.');
      return;
    }
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'canceled',
      updatedAt: serverTimestamp(),
    });
  }, []);

  const reassignOrder = useCallback(
    async (order: Order, onNavigate: (itemName: string) => void) => {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'canceled',
        updatedAt: serverTimestamp(),
      });
      onNavigate(order.itemName);
      Alert.alert(
        'Find a new kitchen',
        `Searching for "${order.itemName}". Pick a kitchen from the list.`,
      );
    },
    [],
  );

  const dismissRejection = useCallback(async () => {
    if (!activeRejection) return;
    await updateDoc(doc(db, 'orders', activeRejection.id), { userDismissedRejection: true });
    setActiveRejection(null);
  }, [activeRejection]);

  const dismissReportWarning = useCallback(async () => {
    if (!activeReportWarning) return;
    await updateDoc(doc(db, 'orders', activeReportWarning.id), { userNotifiedOfReport: true });
    setActiveReportWarning(null);
  }, [activeReportWarning]);

  const deliverYes = useCallback(async () => {
    if (!activeDelivery) return;
    await updateDoc(doc(db, 'orders', activeDelivery.id), { userConfirmedReceived: true });
    setDeliveryFeedback('yes');
    setTimeout(() => setActiveDelivery(null), 3000);
  }, [activeDelivery]);

  const deliverNo = useCallback(
    async (userName: string, userEmail: string, userId: string) => {
      if (!activeDelivery) return;
      await updateDoc(doc(db, 'orders', activeDelivery.id), {
        userDidNotReceiveReported: true,
        kitchenNotifiedOfReport: false,
      });
      setDeliveryFeedback('no');

      try {
        const kref = doc(db, 'kitchens', activeDelivery.kitchenId);
        const kSnap = await getDoc(kref);
        const kData = kSnap.data();
        let kEmail = 'pabibha@gmail.com';

        if (kSnap.exists() && kData) {
          kEmail = kData.email || kEmail;
          const newCount = (kData.missing_food_reports || 0) + 1;
          await updateDoc(kref, {
            missing_food_reports: newCount,
            banned: newCount >= 5 ? true : (kData.banned || false),
            isOpen: newCount >= 5 ? false : (kData.isOpen || false),
          });
          if (newCount >= 5) {
            await updateDoc(doc(db, 'users', activeDelivery.kitchenId), {
              banned: true,
              isOpen: false,
            });
          }
        }

        // Email to user
        await addDoc(collection(db, 'mail'), {
          to: userEmail,
          message: {
            subject: 'We are so sorry!',
            text: `Hi ${userName},\n\nWe apologize that you did not receive your order (${activeDelivery.itemName}) from ${activeDelivery.kitchenName}.\n\nWe are investigating this immediately.\n\nThank you,\nThe Khajaghar Team`,
          },
        });

        // Warning email to kitchen
        await addDoc(collection(db, 'mail'), {
          to: kEmail,
          message: {
            subject: 'WARNING: Missing Food Report',
            text: `URGENT: ${userName} reported they did NOT receive order (${activeDelivery.itemName}). Order ID: ${activeDelivery.id}. Investigate immediately.`,
          },
        });

        // Audit report doc
        await addDoc(collection(db, 'reports'), {
          type: 'missing_food',
          orderId: activeDelivery.id,
          userId,
          userEmail,
          kitchenId: activeDelivery.kitchenId,
          kitchenName: activeDelivery.kitchenName,
          itemName: activeDelivery.itemName,
          total: activeDelivery.total,
          createdAt: serverTimestamp(),
          status: 'pending_investigation',
        });
      } catch (err) {
        console.error('[useOrders] Failed to submit delivery report:', err);
      }
    },
    [activeDelivery],
  );

  const handleSubmitReview = useCallback(
    async (
      orderId: string, kitchenId: string, itemDocId: string,
      rating: number, comment: string,
    ) => {
      await submitOrderReview({ orderId, kitchenId, itemDocId, rating, comment });
    },
    [],
  );

  return {
    orders,
    activeOrders,
    historyOrders,
    activeRejection,
    setActiveRejection,
    activeDelivery,
    setActiveDelivery,
    activeReportWarning,
    setActiveReportWarning,
    deliveryFeedback,
    setDeliveryFeedback,
    cancelOrder,
    reassignOrder,
    dismissRejection,
    dismissReportWarning,
    deliverYes,
    deliverNo,
    submitReview: handleSubmitReview,
  };
}
