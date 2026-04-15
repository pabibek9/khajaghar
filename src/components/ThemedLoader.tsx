// src/components/ThemedLoader.tsx
//
// Per-screen Nepali-themed animated loading components.
// Each variant uses react-native-reanimated v4 for fluid animations.
// Pairs with LoadingQuote for culturally alive loading experiences.
//
// Variants:
//   momo     — spinning 🥟 for home screen
//   selroti  — spinning 🍩 for menu screen
//   coins    — bouncing 🪙 for cart/checkout
//   flame    — pulsing 🔥 for order placed
//   scooter  — driving 🛵 left→right for order tracking
//   bell     — swinging 🔔 for kitchen incoming orders
//   steam    — rising steam for kitchen refreshing
//   gps      — dropping 📍 for rider finding order
//   bag      — pulsing 🎒 for rider pickup
//   checkmark — scaling ✅ for delivery confirmation
//
// Respects AccessibilityInfo.isReduceMotionEnabled().

import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LoadingQuote from './LoadingQuote';

// ─── Quote Banks ─────────────────────────────────────────────────────────────

export const QUOTES = {
  home: [
    'भोक लाग्यो? (Bhok lagyo?) — Hungry already? 🌶️',
    'Ek second... chef le pakaudai xa 🍳',
    'Waiting is the hardest part... especially when it smells this good 🌶️',
    'Nate ramro chaina... but your food is coming! 🛵',
    'तपाईंको खाना आउँदैछ! (Your food is coming!)',
    'Spinning like a sel roti on festival day 🍩',
  ],
  menu: [
    "Freshly made, just like aama ko haath ko khana 🤲",
    'Dal bhat power, 24 hour! 🍛',
    'Menu load hudai xa... patience is a virtue 🙏',
  ],
  cart: [
    'Counting your paisa... almost there 💰',
    'Calculating total... jaldi aaucha! ⚡',
    'Almost ready to checkout! 🛒',
  ],
  orderPlaced: [
    'Order pugyo! Chef le sun-e! 🔥',
    'Kitchen ma gaako signal! 📡',
    'Afulai khana banaudai xa! 👨‍🍳',
  ],
  tracking: [
    'Rider aaudai xa... traffic maxa hola 😅',
    'Faster than Kathmandu traffic. Probably. 🛵',
    'Your rider knows every shortcut in tole 🗺️',
  ],
  kitchenOrders: [
    'Naya order! Bistaarai... (New order! Carefully...) 🔔',
    'Order check gardai xa... ⚡',
    'Incoming! Ready your spatula! 🍳',
  ],
  kitchenRefresh: [
    'Orders pakaudai xa... 🍲',
    'Kitchen sync hudai xa... 🔄',
    'Checking orders... ek chin! ⏳',
  ],
  riderFinding: [
    'Location khoji raxa... 📍',
    'Shortcut thaha xa hami lai 😎',
    'GPS sync hudai xa... 🗺️',
  ],
  riderPickup: [
    'Order ready huna lagyo! 🛵 Ready?',
    'Pickup spot ma pugdai xa! 📦',
    'Food smells amazing! Let\'s go 🛵',
  ],
  riderDelivered: [
    'Deliver bhayo! Customer khushi xa! ✅',
    'Ek aur delivery complete! You\'re a legend 🏆',
    'Legend! Another one done 🌟',
  ],
};

// ─── Reduce-motion hook ───────────────────────────────────────────────────────

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);
  return reduceMotion;
}

// ─── Individual animated emoji variants ──────────────────────────────────────

function SpinningEmoji({ emoji }: { emoji: string }) {
  const rotation = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    rotation.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduceMotion, rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.emojiWrap, animStyle]}>
      <Text style={styles.bigEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

function PulsingEmoji({ emoji }: { emoji: string }) {
  const scale = useSharedValue(1);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(0.9, { duration: 400, easing: Easing.in(Easing.quad) }),
        withTiming(1.0, { duration: 300 }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.emojiWrap, animStyle]}>
      <Text style={styles.bigEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

function SwingingEmoji({ emoji }: { emoji: string }) {
  const rotation = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    rotation.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 350, easing: Easing.out(Easing.sin) }),
        withTiming(18, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 350, easing: Easing.in(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [reduceMotion, rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.emojiWrap, animStyle]}>
      <Text style={styles.bigEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

function ScooterEmoji() {
  const translateX = useSharedValue(-60);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    translateX.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-60, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ width: 140, alignItems: 'center', overflow: 'hidden' }}>
      <Animated.View style={animStyle}>
        <Text style={styles.bigEmoji}>🛵</Text>
      </Animated.View>
    </View>
  );
}

function BouncingCoins() {
  const reduceMotion = useReduceMotion();
  const delays = [0, 150, 300];
  const scales = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];

  useEffect(() => {
    if (reduceMotion) return;
    scales.forEach((sv, i) => {
      sv.value = withDelay(
        delays[i],
        withRepeat(
          withSequence(
            withSpring(1.4, { damping: 4, stiffness: 200 }),
            withSpring(1.0, { damping: 8, stiffness: 160 }),
          ),
          -1,
          false,
        ),
      );
    });
  }, [reduceMotion]);

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
      {scales.map((sv, i) => {
        const animStyle = useAnimatedStyle(() => ({
          transform: [{ scale: sv.value }],
        }));
        return (
          <Animated.View key={i} style={animStyle}>
            <Text style={{ fontSize: 28 }}>🪙</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

function RisingSteam() {
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);
  const translateY1 = useSharedValue(0);
  const translateY2 = useSharedValue(0);
  const translateY3 = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const animate = (op: typeof opacity1, ty: typeof translateY1, delay: number) => {
      op.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 600 }),
            withTiming(0, { duration: 800 }),
          ),
          -1,
          false,
        ),
      );
      ty.value = withDelay(
        delay,
        withRepeat(
          withTiming(-30, { duration: 1400, easing: Easing.linear }),
          -1,
          false,
        ),
      );
    };

    animate(opacity1, translateY1, 0);
    animate(opacity2, translateY2, 450);
    animate(opacity3, translateY3, 900);
  }, [reduceMotion]);

  const makeStyle = (op: typeof opacity1, ty: typeof translateY1) =>
    useAnimatedStyle(() => ({
      opacity: op.value,
      transform: [{ translateY: ty.value }],
    }));

  const s1 = makeStyle(opacity1, translateY1);
  const s2 = makeStyle(opacity2, translateY2);
  const s3 = makeStyle(opacity3, translateY3);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 6, height: 50, alignItems: 'flex-end' }}>
        {([s1, s2, s3] as const).map((s, i) => (
          <Animated.View key={i} style={s}>
            <Text style={{ fontSize: 22 }}>〰️</Text>
          </Animated.View>
        ))}
      </View>
      <Text style={styles.bigEmoji}>🍲</Text>
    </View>
  );
}

function DroppingPin() {
  const translateY = useSharedValue(-40);
  const scale = useSharedValue(0.5);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    translateY.value = withRepeat(
      withSequence(
        withSpring(0, { damping: 5, stiffness: 120 }),
        withDelay(600, withTiming(-40, { duration: 300 })),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withSpring(1, { damping: 5, stiffness: 120 }),
        withDelay(600, withTiming(0.5, { duration: 300 })),
      ),
      -1,
      false,
    );
  }, [reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.emojiWrap, animStyle]}>
      <Text style={styles.bigEmoji}>📍</Text>
    </Animated.View>
  );
}

function CheckmarkAnimation() {
  const scale = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(1, { damping: 8, stiffness: 180 });

    const timer = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1.0, { duration: 600 }),
        ),
        -1,
        true,
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.emojiWrap, animStyle]}>
      <Text style={styles.bigEmoji}>✅</Text>
    </Animated.View>
  );
}

// ─── ThemedLoader variants map ────────────────────────────────────────────────

export type ThemedLoaderVariant =
  | 'momo'
  | 'selroti'
  | 'coins'
  | 'flame'
  | 'scooter'
  | 'bell'
  | 'steam'
  | 'gps'
  | 'bag'
  | 'checkmark';

interface ThemedLoaderProps {
  variant?: ThemedLoaderVariant;
  quotes?: string[];
  style?: ViewStyle;
  /** If true, fills the full screen with centered content */
  fullScreen?: boolean;
}

export default function ThemedLoader({
  variant = 'momo',
  quotes,
  style,
  fullScreen = false,
}: ThemedLoaderProps) {
  const resolvedQuotes = quotes ?? QUOTES[
    ({
      momo: 'home',
      selroti: 'menu',
      coins: 'cart',
      flame: 'orderPlaced',
      scooter: 'tracking',
      bell: 'kitchenOrders',
      steam: 'kitchenRefresh',
      gps: 'riderFinding',
      bag: 'riderPickup',
      checkmark: 'riderDelivered',
    } as const)[variant]
  ];

  const Animation = () => {
    switch (variant) {
      case 'momo': return <SpinningEmoji emoji="🥟" />;
      case 'selroti': return <SpinningEmoji emoji="🍩" />;
      case 'coins': return <BouncingCoins />;
      case 'flame': return <PulsingEmoji emoji="🔥" />;
      case 'scooter': return <ScooterEmoji />;
      case 'bell': return <SwingingEmoji emoji="🔔" />;
      case 'steam': return <RisingSteam />;
      case 'gps': return <DroppingPin />;
      case 'bag': return <PulsingEmoji emoji="🎒" />;
      case 'checkmark': return <CheckmarkAnimation />;
      default: return <SpinningEmoji emoji="🥟" />;
    }
  };

  return (
    <View style={[fullScreen ? styles.fullScreen : styles.container, style]}>
      <Animation />
      <LoadingQuote
        quotes={resolvedQuotes}
        style={{ marginTop: 16, color: '#8E8E93', fontSize: 13 }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    gap: 8,
  },
  emojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 52,
  },
});
