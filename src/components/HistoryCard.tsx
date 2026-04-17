// src/components/HistoryCard.tsx
//
// Receipt-style card for a single completed/canceled/rejected order
// in the Order History tab.

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../services/firebase/firestoreService';

const C = {
  text: '#000',
  subtext: '#555',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  yellow: '#FFCC00',
  gray: '#48484A',
  subStatus: '#8E8E93',
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'delivered': return C.green;
    case 'canceled': return C.gray;
    case 'rejected': return C.red;
    default: return C.subStatus;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'delivered': return 'DELIVERED';
    case 'canceled': return 'CANCELED';
    case 'rejected': return 'REJECTED';
    default: return status.replace(/_/g, ' ').toUpperCase();
  }
}

interface HistoryCardProps {
  order: Order;
  onRate: (order: Order) => void;
}

const HistoryCard = React.memo(function HistoryCard({ order: o, onRate }: HistoryCardProps) {
  const dateStr = o.createdAt
    ? new Date(o.createdAt?.toMillis?.() ?? 0).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <View style={styles.card}>
      <Text style={styles.header}>RECEIPT</Text>

      <Text style={styles.text}>Order #{o.id.slice(-6).toUpperCase()}</Text>
      <Text style={styles.text}>{dateStr}</Text>
      <Text style={styles.text}>{o.kitchenName}</Text>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={[styles.text, { flex: 1 }]}>1× {o.itemName}</Text>
        <Text style={styles.text}>Rs. {o.total}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={[styles.text, styles.total]}>TOTAL</Text>
        <Text style={[styles.text, styles.total]}>Rs. {o.total}</Text>
      </View>

      {/* Status badge */}
      <View style={[styles.row, styles.statusRow]}>
        <View style={[styles.dot, { backgroundColor: getStatusColor(o.status) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(o.status) }]}>
          {getStatusText(o.status)}
        </Text>
      </View>

      {/* Rating button */}
      {o.status === 'delivered' && !o.rating && (
        <Pressable style={styles.rateBtn} onPress={() => onRate(o)}>
          <Ionicons name="star-outline" size={14} color="#fff" />
          <Text style={styles.rateBtnText}>Rate this Meal</Text>
        </Pressable>
      )}

      {/* Existing rating */}
      {o.rating ? (
        <View style={[styles.row, { justifyContent: 'center', marginTop: 6 }]}>
          <Ionicons name="star" size={14} color={C.yellow} />
          <Text style={{ color: C.yellow, fontWeight: 'bold', marginLeft: 4 }}>
            {o.rating} / 5
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default HistoryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    gap: 4,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  text: {
    color: C.text,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  total: { fontSize: 15, fontWeight: 'bold' },
  divider: {
    height: 1,
    borderTopWidth: 1,
    borderColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  statusRow: { alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontWeight: '700', fontSize: 12 },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: C.blue,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
