// src/components/OrderCard.tsx
//
// Memoized card for a single active order in the Orders tab.
// Shows item name, kitchen, total, status badge, and cancel/reassign buttons.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../services/firebase/firestoreService';

const C = {
  card: '#1C1C1E',
  text: '#F2F2F7',
  subtext: '#8E8E93',
  white: '#FFFFFF',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  gray: '#48484A',
  yellow: '#FFCC00',
  input: '#2C2C2E',
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'requested':
    case 'pending':
    case 'accepted':
    case 'kitchen_preparing':
    case 'waiting_rider':
      return C.blue;
    case 'rider_assigned':
    case 'assigned_to_rider':
    case 'picked_up':
    case 'on_the_way':
    case 'out_for_delivery':
      return C.green;
    case 'rider_cancel_requested':
    case 'rider_cancel_approved':
    case 'rider_reported_not_returned':
      return C.yellow;
    case 'delivered':
      return C.subtext;
    case 'canceled':
    case 'rejected':
      return C.red;
    case 'expired_reassign':
      return C.gray;
    default:
      return C.subtext;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'requested':
    case 'pending':
      return 'PENDING';
    case 'accepted':
      return 'ACCEPTED';
    case 'kitchen_preparing':
      return 'PREPARING FOOD';
    case 'waiting_rider':
      return 'WAITING FOR RIDER';
    case 'rider_assigned':
    case 'assigned_to_rider':
      return 'RIDER ASSIGNED';
    case 'rider_cancel_requested':
    case 'rider_cancel_approved':
    case 'rider_reported_not_returned':
      return 'RIDER DELAYED';
    case 'picked_up':
      return 'PICKED UP';
    case 'on_the_way':
      return 'RIDER IS ON THE WAY!';
    case 'out_for_delivery':
      return 'OUT FOR DELIVERY';
    default:
      return status.replace(/_/g, ' ').toUpperCase();
  }
}

interface OrderCardProps {
  order: Order;
  onCancel: (orderId: string, status: string) => Promise<void>;
  onReassign: (order: Order) => void;
}

const OrderCard = React.memo(function OrderCard({ order: o, onCancel, onReassign }: OrderCardProps) {
  const canCancel = o.status === 'requested' || o.status === 'expired_reassign';
  const canReassign = o.status === 'expired_reassign';
  const statusColor = getStatusColor(o.status);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>{o.itemName}</Text>
        <Text style={styles.price}>Rs. {o.total}</Text>
      </View>

      <Text style={styles.kitchen} numberOfLines={1}>{o.kitchenName}</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {getStatusText(o.status)}
        </Text>
      </View>

      {(canCancel || canReassign) && (
        <View style={styles.actions}>
          {canCancel && (
            <Pressable
              style={[styles.btn, { backgroundColor: C.red }]}
              onPress={() => onCancel(o.id, o.status)}
              android_ripple={{ color: 'rgba(0,0,0,0.2)' }}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>
          )}
          {canReassign && (
            <Pressable
              style={[styles.btn, { backgroundColor: C.gray }]}
              onPress={() => onReassign(o)}
              android_ripple={{ color: 'rgba(0,0,0,0.2)' }}
            >
              <Ionicons name="refresh" size={14} color={C.white} />
              <Text style={styles.btnText}>Reassign</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

export default OrderCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.white, fontWeight: '700', fontSize: 15, flex: 1, marginRight: 8 },
  price: { color: C.white, fontWeight: '700', fontSize: 14 },
  kitchen: { color: C.subtext, fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  btnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
