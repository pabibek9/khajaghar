// src/components/FoodCard.tsx
//
// Performant memoized food card for the horizontal menu list.
// Optimizations vs the old StaggeredPickCard:
//   - expo-image for disk-cached images (no re-download on scroll)
//   - Reduced card size (200×110 vs 240×140) for better density on small screens
//   - elevation: 2 instead of 4 — cheaper shadow on Android
//   - Stagger animation skipped for items beyond index 6 on Android
//   - android_ripple instead of opacity feedback

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem } from '../services/firebase/firestoreService';

// ─── Theme (local – avoids importing the monolith theme from user.tsx) ────────
const C = {
  card: '#1C1C1E',
  text: '#F2F2F7',
  subtext: '#8E8E93',
  primary: '#FF5C2A',
  white: '#FFFFFF',
  green: '#34C759',
  teal: '#00C9A7',
  red: '#FF3B30',
  dark: '#000000',
  gray: '#48484A',
  yellow: '#FFCC00',
  input: '#2C2C2E',
};

// ─── Stagger fade-in (skipped on Android for long lists) ─────────────────────
function useStaggerFadeIn(index: number) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Skip animation for off-screen cards on Android to save GPU
    if (Platform.OS === 'android' && index > 5) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index * 55, 280),
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FoodCardProps {
  item: MenuItem;
  index: number;
  onPress: (item: MenuItem) => void;
}

const FoodCard = React.memo(function FoodCard({ item, index, onPress }: FoodCardProps) {
  const staggerStyle = useStaggerFadeIn(index);

  const avgRating =
    item.ratingCount && item.ratingCount > 0
      ? ((item.totalRating || 0) / item.ratingCount).toFixed(1)
      : null;

  const dietaryColor =
    item.dietary === 'Veg'
      ? C.green
      : item.dietary === 'Vegan'
      ? C.teal
      : C.red;

  const dietaryEmoji =
    item.dietary === 'Veg' ? '🟢' : item.dietary === 'Vegan' ? '🌱' : '🔴';

  return (
    <Animated.View style={staggerStyle}>
      <Pressable
        onPress={() => onPress(item)}
        style={styles.card}
        android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} from ${item.kitchenName}, Rs. ${item.price}`}
      >
        {/* ── Image ── */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.imageUrl || 'https://via.placeholder.com/200x110' }}
            style={[styles.image, item.outOfStock && styles.imageDimmed]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />

          {item.outOfStock && (
            <View style={styles.stockOverlay}>
              <Text style={styles.stockText}>OUT OF STOCK</Text>
            </View>
          )}

          {item.dietary ? (
            <View style={[styles.dietaryDot, { backgroundColor: dietaryColor }]}>
              <Text style={{ fontSize: 9 }}>{dietaryEmoji}</Text>
            </View>
          ) : null}

          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={10} color={C.white} />
            <Text style={styles.timeText}>~30 min</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>

          <View style={styles.kitchenRow}>
            <Ionicons name="storefront" size={11} color={C.primary} />
            <Text style={styles.kitchenName} numberOfLines={1}>{item.kitchenName}</Text>
          </View>

          {avgRating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={10} color={C.yellow} />
              <Text style={styles.ratingText}>{avgRating}</Text>
              <Text style={styles.reviewCount}>({item.ratingCount}+)</Text>
            </View>
          ) : (
            <Text style={styles.newTag}>✨ New</Text>
          )}

          <View style={styles.footer}>
            <Text style={styles.freeDelivery} numberOfLines={1}>Free delivery</Text>
            <View style={styles.priceTag}>
              <Text style={styles.price}>Rs. {item.price}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default FoodCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    // Intentionally low elevation for Android perf
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  imageWrap: {
    height: 110,
    width: '100%',
    backgroundColor: C.gray,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageDimmed: { opacity: 0.45 },
  stockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    transform: [{ rotate: '-12deg' }],
  },
  dietaryDot: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  body: { padding: 10, gap: 4 },
  title: { color: C.text, fontSize: 14, fontWeight: '800', lineHeight: 18 },
  kitchenRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kitchenName: { color: C.subtext, fontSize: 12, fontWeight: '500', flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: C.text, fontSize: 12, fontWeight: '700' },
  reviewCount: { color: C.subtext, fontSize: 11 },
  newTag: { color: C.subtext, fontSize: 11 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  freeDelivery: { color: C.primary, fontSize: 11, fontWeight: '600', flex: 1 },
  priceTag: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  price: { color: C.white, fontSize: 13, fontWeight: '700' },
});
