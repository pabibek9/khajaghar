// src/components/SkeletonLoader.tsx
//
// Reusable shimmer skeleton loaders for the Khaja food delivery app.
// Shimmer: warm saffron gold (#F4A62A) → light cream (#FFF8EE) — Nepali
// marigold + festival colors. Animates left-to-right, 1.2s loop.
//
// Uses react-native-reanimated v4 (already installed).
// Respects AccessibilityInfo.isReduceMotionEnabled().

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// ─── Shimmer hook ───────────────────────────────────────────────────────────

function useShimmer() {
  const progress = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduceMotion, progress]);

  const shimmerStyle = useAnimatedStyle(() => {
    // Translate the shimmer overlay from -100% to +100% of the element
    const translateX = interpolate(progress.value, [0, 1], [-300, 300]);
    return { transform: [{ translateX }] };
  });

  return shimmerStyle;
}

// ─── Single shimmer bar ──────────────────────────────────────────────────────

interface ShimmerBarProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function ShimmerBar({ width = '100%', height = 14, borderRadius = 7, style }: ShimmerBarProps) {
  const shimmerStyle = useShimmer();

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#2A2A2A',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          shimmerStyle,
          { width: '60%' },
        ]}
      >
        {/* Shimmer gradient simulation using a semi-transparent warm overlay */}
        <View
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            shadowColor: '#F4A62A',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            borderRightWidth: 60,
            borderRightColor: 'transparent',
          }}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: '#F4A62A',
              opacity: 0.18,
            },
          ]}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '20%',
            right: '20%',
            backgroundColor: '#FFF8EE',
            opacity: 0.25,
            borderRadius: 999,
          }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Skeleton Variants ───────────────────────────────────────────────────────

/**
 * Restaurant card skeleton:
 * [ Image placeholder ]
 * [ ████████████ ] (title)
 * [ ██████ ]       (meta)
 */
export function RestaurantCardSkeleton() {
  return (
    <View style={skeletonStyles.restaurantCard}>
      {/* Image placeholder */}
      <View style={skeletonStyles.restaurantImage}>
        {/* Use absoluteFill so shimmer fills 100% height */}
        <View style={StyleSheet.absoluteFillObject}>
          <ShimmerBar width="100%" height={140} borderRadius={0} />
        </View>
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <ShimmerBar width="75%" height={16} />
        <ShimmerBar width="45%" height={12} />
      </View>
    </View>
  );
}

/**
 * Menu item skeleton:
 * [ Sq. img ] [ ████████ ]
 *             [ ████ ]
 *             [ ██ ]
 */
export function MenuItemSkeleton() {
  return (
    <View style={skeletonStyles.menuItem}>
      <View style={skeletonStyles.menuItemImage}>
        {/* Use absoluteFill so shimmer fills 100% height */}
        <View style={StyleSheet.absoluteFillObject}>
          <ShimmerBar width="100%" height={90} borderRadius={0} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 8, justifyContent: 'center', paddingVertical: 4 }}>
        <ShimmerBar width="80%" height={15} />
        <ShimmerBar width="55%" height={12} />
        <ShimmerBar width="40%" height={12} />
      </View>
    </View>
  );
}

/**
 * Order card skeleton: full-width card with 4 line placeholders
 */
export function OrderCardSkeleton() {
  return (
    <View style={skeletonStyles.orderCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <ShimmerBar width="55%" height={16} />
        <ShimmerBar width="25%" height={16} />
      </View>
      <ShimmerBar width="35%" height={11} style={{ marginBottom: 8 }} />
      <ShimmerBar width="90%" height={12} style={{ marginBottom: 6 }} />
      <ShimmerBar width="70%" height={12} style={{ marginBottom: 6 }} />
      <ShimmerBar width="50%" height={12} />
    </View>
  );
}

/**
 * Rider status skeleton: circle avatar + two lines (for rider info)
 */
export function RiderStatusSkeleton() {
  return (
    <View style={skeletonStyles.riderStatus}>
      <View style={{ overflow: 'hidden', borderRadius: 28, width: 56, height: 56 }}>
        <ShimmerBar width="100%" height={56} borderRadius={28} />
      </View>
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <ShimmerBar width="60%" height={15} />
        <ShimmerBar width="40%" height={12} />
      </View>
    </View>
  );
}

// ─── Default export — multi-skeleton renderer ─────────────────────────────────

export type SkeletonVariant =
  | 'restaurant'
  | 'menuItem'
  | 'order'
  | 'riderStatus';

interface SkeletonLoaderProps {
  variant: SkeletonVariant;
  count?: number;
}

const VARIANT_MAP: Record<SkeletonVariant, React.FC> = {
  restaurant: RestaurantCardSkeleton,
  menuItem: MenuItemSkeleton,
  order: OrderCardSkeleton,
  riderStatus: RiderStatusSkeleton,
};

export default function SkeletonLoader({ variant, count = 3 }: SkeletonLoaderProps) {
  const Component = VARIANT_MAP[variant];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const skeletonStyles = StyleSheet.create({
  restaurantCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  restaurantImage: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    gap: 12,
    padding: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItemImage: {
    width: 90,
    height: 90,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  orderCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  riderStatus: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
