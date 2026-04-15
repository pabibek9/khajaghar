// src/components/LoadingQuote.tsx
//
// Cycles through an array of Nepali-flavored loading quotes with
// a smooth fade in/out every 2.5 seconds.
// Zero extra dependencies — only React Native core.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextStyle, View } from 'react-native';

interface LoadingQuoteProps {
  quotes: string[];
  /** Interval in ms between quote changes. Default 2500 */
  interval?: number;
  style?: TextStyle;
  /** Pick a random starting quote instead of index 0 */
  randomStart?: boolean;
}

export default function LoadingQuote({
  quotes,
  interval = 2500,
  style,
  randomStart = true,
}: LoadingQuoteProps) {
  const [index, setIndex] = useState(() =>
    randomStart ? Math.floor(Math.random() * quotes.length) : 0
  );
  const opacity = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cycleQuote = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIndex((prev) => (prev + 1) % quotes.length);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  }, [opacity, quotes.length]);

  useEffect(() => {
    intervalRef.current = setInterval(cycleQuote, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cycleQuote, interval]);

  if (!quotes.length) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity }}>
        <Text style={[styles.quote, style]}>
          {quotes[index]}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  quote: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
