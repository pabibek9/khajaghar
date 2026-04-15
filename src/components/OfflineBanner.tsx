// src/components/OfflineBanner.tsx
//
// A fixed/absolute offline indicator banner shown on every screen whenever
// the device has no internet connection.
//
// On React Native the native equivalent of CSS `position: fixed` is
// `position: 'absolute'` combined with rendering at the top of the View tree.
// This component renders itself at the very top of the screen using SafeAreaView
// insets so it never overlaps the status bar.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface OfflineBannerProps {
  /** Pass the isOffline boolean from useNetworkStatus() */
  visible: boolean;
}

export default function OfflineBanner({ visible }: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const wasOffline = useRef(false);
  const [isShowingOnline, setIsShowingOnline] = React.useState(false);

  useEffect(() => {
    if (visible) {
      wasOffline.current = true;
      setIsShowingOnline(false);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      if (wasOffline.current) {
        setIsShowingOnline(true);
        wasOffline.current = false;
        
        const timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -80,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsShowingOnline(false);
          });
        }, 2000);
        
        return () => clearTimeout(timer);
      } else if (!isShowingOnline) {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible]);

  const isOfflineMode = visible;
  const isOnlineFixMode = isShowingOnline && !visible;

  return (
    <Animated.View
      pointerEvents={(isOfflineMode || isOnlineFixMode) ? 'box-none' : 'none'}
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0),
          transform: [{ translateY }],
          opacity,
          backgroundColor: isOnlineFixMode ? '#27ae60' : '#c0392b',
        },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons 
          name={isOnlineFixMode ? "checkmark-circle-outline" : "wifi-outline"} 
          size={16} 
          color="#fff" 
          style={styles.icon} 
        />
        <Text style={styles.text}>
          {isOnlineFixMode ? "Back online!" : "No internet connection. Actions are paused."}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#c0392b',
    zIndex: 9999,
    // Elevation for Android so it sits above all other views
    elevation: 20,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
