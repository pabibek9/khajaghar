// src/components/EmptyState.tsx
//
// Empty state illustrations for each screen in the Khajaghar app.
// Nepali-flavored text with emoji illustrations.
// Consistent with the dark theme palette across the app.

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

export type EmptyStateVariant =
  | 'no-restaurants'
  | 'empty-cart'
  | 'no-orders-rider'
  | 'kitchen-clear'
  | 'no-history'
  | 'no-available-orders';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  style?: ViewStyle;
}

const EMPTY_STATE_DATA: Record<
  EmptyStateVariant,
  { emoji: string; title: string; subtitle: string }
> = {
  'no-restaurants': {
    emoji: '😴',
    title: 'Restaurants suteka xa...',
    subtitle: 'Restaurants are sleeping.\nTry again later or check your location 📍',
  },
  'empty-cart': {
    emoji: '🧺',
    title: 'Doko khali xa!',
    subtitle: 'Your basket is empty.\nAdd something delicious 🍛',
  },
  'no-orders-rider': {
    emoji: '🛵',
    title: 'Orders chaina abhi...',
    subtitle: 'No deliveries right now.\nEnjoy your break! ☕',
  },
  'kitchen-clear': {
    emoji: '✨',
    title: 'Sab orders complete!',
    subtitle: 'Kitchen safa xa 🧹\nAll caught up — great work!',
  },
  'no-history': {
    emoji: '📋',
    title: 'No orders yet',
    subtitle: 'Your order history will appear here.\nTime to order something! 🍜',
  },
  'no-available-orders': {
    emoji: '⏳',
    title: 'Waiting for orders...',
    subtitle: 'New delivery requests will\nappear here instantly. Stay ready! 🛵',
  },
};

export default function EmptyState({ variant, style }: EmptyStateProps) {
  const data = EMPTY_STATE_DATA[variant];

  return (
    <View style={[styles.container, style]}>
      {/* Illustrated emoji in a glowing circle */}
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{data.emoji}</Text>
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 20,
  },
  emojiCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#F4A62A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  emoji: {
    fontSize: 44,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#F2F2F7',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
