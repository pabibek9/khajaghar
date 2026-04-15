// src/hooks/usePullToRefresh.ts
//
// Scroll-position-aware pull-to-refresh hook.
//
// Behaviour (matches Facebook / Instagram / Zomato):
//  - RefreshControl is only active when the user is scrolled to the VERY TOP
//    (contentOffset.y === 0). While mid-scroll, pulling down just scrolls.
//  - onRefresh fires the caller-supplied callback and holds the spinner visible
//    for a MINIMUM of 800 ms so the animation never flashes and disappears.
//  - Picks a new quote from the supplied bank each refresh, guaranteeing a
//    different quote than the previous one (when the bank has ≥ 2 quotes).
//  - Guards against double-trigger: a second pull while already refreshing is
//    ignored completely.
//
// Usage:
//   const ptr = usePullToRefresh({ quotes: QUOTES.home, onRefresh: myRefreshFn });
//
//   <ScrollView
//     onScroll={ptr.handleScroll}
//     scrollEventThrottle={16}
//     refreshControl={ptr.refreshControl}
//   />

import { useCallback, useRef, useState } from 'react';
import { RefreshControl, Platform } from 'react-native';
import React from 'react';

const MIN_REFRESH_MS = 800;

interface UsePullToRefreshOptions {
  /** Array of Nepali-flavored quotes shown under the spinner */
  quotes: string[];
  /**
   * Async function called to perform the actual data refresh.
   * The hook waits for it to resolve before hiding the spinner
   * (subject to the MIN_REFRESH_MS floor).
   */
  onRefresh: () => Promise<void> | void;
  /** Spinner / tint colour. Default: Khaja red */
  color?: string;
}

interface UsePullToRefreshResult {
  /** Pass to ScrollView / FlatList `refreshControl` prop */
  refreshControl: React.ReactElement<any, any> | undefined;
  /** Pass to ScrollView / FlatList `onScroll` prop */
  handleScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  /** Pass scrollEventThrottle={16} to the list component */
  scrollEventThrottle: 16;
  /** True while the refresh spinner is visible */
  isRefreshing: boolean;
  /** The quote currently shown under the spinner */
  currentQuote: string;
}

function pickDifferentRandom(quotes: string[], previous: string): string {
  if (quotes.length <= 1) return quotes[0] ?? '';
  let next = previous;
  while (next === previous) {
    next = quotes[Math.floor(Math.random() * quotes.length)];
  }
  return next;
}

export function usePullToRefresh({
  quotes,
  onRefresh,
  color = '#E63946',
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  // Whether the scroll container is at the very top
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<string>(
    quotes[Math.floor(Math.random() * quotes.length)] ?? '',
  );

  // Guard against double-trigger
  const isFetchingRef = useRef(false);
  // Track last Y offset via ref (no re-render needed)
  const scrollYRef = useRef(0);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      // Enable RefreshControl only at the very top (y ≤ 0 handles bounce overshoot)
      setRefreshEnabled(y <= 0);
    },
    [],
  );

  const triggerRefresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Pick a new, different quote
    setCurrentQuote((prev) => pickDifferentRandom(quotes, prev));
    setIsRefreshing(true);

    const start = Date.now();
    try {
      await onRefresh();
    } catch {
      // silently ignore — callers should handle their own errors
    } finally {
      // Honour minimum visible time
      const elapsed = Date.now() - start;
      const remaining = MIN_REFRESH_MS - elapsed;
      if (remaining > 0) {
        await new Promise<void>((r) => setTimeout(r, remaining));
      }
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [quotes, onRefresh]);

  // On Web, RefreshControl is prone to hijacking scroll and triggering native browser reloads.
  // We disable the custom RefreshControl on Web to restore native scrolling, 
  // and we will prevent the native browser reload in the root layout.
  const refreshControl = React.useMemo(() => {
    if (Platform.OS === 'web') return undefined;
    if (!refreshEnabled) return undefined;

    return React.createElement(RefreshControl, {
      refreshing: isRefreshing,
      onRefresh: triggerRefresh,
      tintColor: color,      // iOS
      colors: [color],       // Android
      title: currentQuote,   // iOS subtitle
      titleColor: '#8E8E93',
    }) as React.ReactElement<any, any>;
  }, [refreshEnabled, isRefreshing, triggerRefresh, color, currentQuote]);

  return {
    refreshControl,
    handleScroll,
    scrollEventThrottle: 16,
    isRefreshing,
    currentQuote,
  };
}
