// client/app/_layout.tsx
import { Stack, router, usePathname, type Href } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, LogBox, Platform } from 'react-native';
import { auth, db } from '../src/constants/firebase';
import { NotificationProvider } from '../src/components/NotificationProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Offline support imports ────────────────────────────────────────────────
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import OfflineBanner from '../src/components/OfflineBanner';
import {
  saveSession,
  clearSession,
  getStoredSession,
  isSessionValid,
  USER_SESSION_KEY,
  type UserRole,
} from '../src/services/authService';
// ──────────────────────────────────────────────────────────────────────────

LogBox.ignoreLogs([
  '[Reanimated] Reading from `value` during component render',
  '[Reanimated] Reduced motion setting is enabled',
]);

const SESSION_KEY = 'last_login_ts';
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Maps a Firestore role string to the appropriate app route. */
function routeForRole(role: string | null | undefined): Href {
  if (role === 'admin') return '/admin';
  if (role === 'kitchen') return '/kitchen';
  if (role === 'rider') return '/rider' as Href;
  return '/user';
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const userDocUnsubRef = useRef<(() => void) | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // ── Global offline detection ─────────────────────────────────────────────
  const isOffline = useNetworkStatus();
  // ────────────────────────────────────────────────────────────────────────

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

  // ── Prevent native browser pull-to-refresh on Web ─────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        body {
          overscroll-behavior-y: contain;
        }
      `;
      document.head.append(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

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

      // ── CASE 1: No Firebase user ─────────────────────────────────────────
      if (!user) {
        // Before sending the user to login, check if there is a locally
        // stored session. If there is a valid stored session it means the
        // Firebase token just hasn't loaded yet (common on cold starts) OR
        // the device is offline and Firebase can't resolve auth state.
        try {
          const stored = await getStoredSession();
          if (stored && isSessionValid(stored)) {
            // We have a valid cached session — route to the appropriate
            // dashboard. The offline banner will appear if the device is
            // actually offline, but the user stays on their screen.
            go(routeForRole(stored.role));
            setReady(true);
            return;
          }
        } catch (e) {
          console.warn('[Layout] Stored session check failed:', e);
        }

        // No valid local session → route to login (unless already on a public screen)
        const isPublicSubScreen = pathnameRef.current?.startsWith('/rider-signup');
        if (!isPublicSubScreen) go('/login');
        setReady(true);
        return;
      }

      // ── CASE 2: Firebase user is authenticated ───────────────────────────

      // ── 30-day Session Expiry ─────────────────────────────────────────────
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (stored) {
          const lastLogin = parseInt(stored, 10);
          if (Date.now() - lastLogin > SESSION_EXPIRY_MS) {
            // Session expired: force logout and go to login
            await clearSession();
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
      // ──────────────────────────────────────────────────────────────────────

      // ── Check stored session FIRST to avoid Firestore round-trip ──────────
      // If we already have a valid stored session, route immediately and
      // subscribe in the background — this avoids the blank screen on slow networks.
      try {
        const storedSession = await getStoredSession();
        if (storedSession && isSessionValid(storedSession)) {
          // Route to the stored role's dashboard immediately
          go(routeForRole(storedSession.role));
        }
      } catch (e) {
        console.warn('[Layout] Early session routing failed:', e);
      }
      // ──────────────────────────────────────────────────────────────────────

      // Live updates on user doc for role/ban changes
      const ref = doc(db, 'users', user.uid);
      userDocUnsubRef.current = onSnapshot(ref, async (d) => {
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

        // Persist the resolved role to AsyncStorage so future offline
        // launches can route directly without a Firestore call.
        try {
          await saveSession(user, data.role as UserRole);
        } catch (e) {
          console.warn('[Layout] Failed to save session:', e);
        }

        go(routeForRole(data.role));
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
        {/* ── Global offline banner ── rendered here so it covers ALL screens */}
        <OfflineBanner visible={isOffline} />

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