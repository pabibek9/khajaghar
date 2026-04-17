// src/components/BuyModal.tsx
//
// Modal for placing an order.
// Extracted from user.tsx to isolated state updates and clean up the monolithic screen.

import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem } from '../services/firebase/firestoreService';

const C = {
  card: '#1C1C1E',
  text: '#F2F2F7',
  subtext: '#8E8E93',
  primary: '#FF5C2A',
  white: '#FFFFFF',
  green: '#34C759',
  gray: '#48484A',
  input: '#2C2C2E',
};

interface BuyModalProps {
  item: MenuItem | null;
  visible: boolean;
  onClose: () => void;
  onPlaceOrder: (qty: number, remarks: string) => Promise<void>;
  isSubmitting: boolean;
}

const BuyModal = React.memo(function BuyModal({
  item,
  visible,
  onClose,
  onPlaceOrder,
  isSubmitting,
}: BuyModalProps) {
  const [qty, setQty] = useState(1);
  const [remarks, setRemarks] = useState('');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setQty(1);
      setRemarks('');
    }
  }, [visible]);

  if (!item) return null;

  const handlePlaceOrder = () => {
    onPlaceOrder(qty, remarks);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={C.subtext} />
            </Pressable>
          </View>

          <Text style={styles.meta}>
            {item.kitchenName} • Rs. {item.price}
          </Text>

          {/* Quantity */}
          <View style={styles.qtyRow}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.qtyCont}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQty(Math.max(1, qty - 1))}
              >
                <Text style={styles.qtyText}>-</Text>
              </Pressable>
              <Text style={styles.qtyNum}>{qty}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQty(Math.min(20, qty + 1))}
              >
                <Text style={styles.qtyText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Remarks */}
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Special Instructions (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Less spicy, extra sauce..."
              placeholderTextColor={C.subtext}
              value={remarks}
              onChangeText={setRemarks}
              multiline
              maxLength={150}
              autoCapitalize="sentences"
            />
          </View>

          {/* Total & Submit */}
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subtext}>Total Amount</Text>
              <Text style={styles.totalText}>Rs. {item.price * qty}</Text>
            </View>
            <Pressable
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handlePlaceOrder}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? 'Placing...' : 'Place Order'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default BuyModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
    flex: 1,
  },
  meta: { color: C.subtext, fontSize: 14, marginTop: -10 },
  label: { color: C.white, fontWeight: '700', fontSize: 14 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
  },
  qtyCont: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: {
    backgroundColor: C.input,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: C.white, fontSize: 20, fontWeight: '600', marginTop: Platform.OS === 'ios' ? -2 : -4 },
  qtyNum: { color: C.white, fontSize: 18, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  input: {
    backgroundColor: C.input,
    color: C.white,
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  subtext: { color: C.subtext, fontSize: 12, fontWeight: '500' },
  totalText: { color: C.white, fontSize: 22, fontWeight: '800' },
  submitBtn: {
    backgroundColor: C.green,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: C.white, fontWeight: '800', fontSize: 16 },
});
