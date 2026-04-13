// client/app/_layout.tsx
import { Stack, router, usePathname, type Href } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, LogBox } from 'react-native';
import { auth, db } from '../src/constants/firebase';
import { NotificationProvider } from '../src/components/NotificationProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs([
  '[Reanimated] Reading from `value` during component render',
  '[Reanimated] Reduced motion setting is enabled',
]);



const SESSION_KEY = 'last_login_ts';
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const userDocUnsubRef = useRef<(() => void) | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const go = (to: Href) => {
    const target =
      typeof to === 'string'
        ? to
        : (to as any)?.pathname ?? String(to);

    if (pathnameRef.current !== target) router.replace(to);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // clean old user doc listener
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }

      if (pathnameRef.current?.startsWith('/print')) {
        setReady(true);
        return;
      }

      if (!user) {
        // Not logged in → go to login (unless already on a public screen)
        const isPublicSubScreen = pathnameRef.current?.startsWith('/rider-signup');
        if (!isPublicSubScreen) go('/login');
        setReady(true);
        return;
      }

      // ── 30-day Session Expiry ──────────────────────────────────────────────
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (stored) {
          const lastLogin = parseInt(stored, 10);
          if (Date.now() - lastLogin > SESSION_EXPIRY_MS) {
            // Session expired: force logout and go to login
            await auth.signOut();
            await AsyncStorage.removeItem(SESSION_KEY);
            go('/login');
            setReady(true);
            return;
          }
        } else {
          // First time seeing this user — record now
          await AsyncStorage.setItem(SESSION_KEY, String(Date.now()));
        }
      } catch (e) {
        // AsyncStorage failure should not block the app
        console.warn('[Layout] Session check failed:', e);
      }
      // ─────────────────────────────────────────────────────────────────────

      // Live updates on user doc for role/ban changes
      const ref = doc(db, 'users', user.uid);
      userDocUnsubRef.current = onSnapshot(ref, (d) => {
        const data = d.data() as any;
        const activePath = pathnameRef.current;

        const isSubScreen =
          activePath?.startsWith('/print') ||
          activePath?.startsWith('/location_map') ||
          activePath?.startsWith('/rider-signup');

        if (isSubScreen) return;

        if (!data) { go('/role-select'); return; }
        if (data.banned) { go('/banned'); return; }
        if (!data.role) { go('/role-select'); return; }

        if (data.role === 'admin') { go('/admin'); return; }
        if (data.role === 'kitchen') { go('/kitchen'); return; }
        if (data.role === 'rider') { go('/rider' as any); return; }
        go('/user');
      });

      setReady(true);
    });

    return () => {
      unsubAuth();
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }
    };
  }, []);

  // Show a full-screen loader while auth state is being resolved
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="role-select" />
          <Stack.Screen name="user" />
          <Stack.Screen name="kitchen" />
          <Stack.Screen name="(tabs)/explore" />
          <Stack.Screen name="print" />
          <Stack.Screen name="print-bill" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin" />
          <Stack.Screen name="banned" />
          <Stack.Screen name="unverified" />
          <Stack.Screen name="location_map/index" />
          <Stack.Screen name="rider/index" />
          <Stack.Screen name="rider-signup" />
        </Stack>
      </NotificationProvider>
    </GestureHandlerRootView>
  );
}