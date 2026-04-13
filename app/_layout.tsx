// client/app/_layout.tsx
import { Stack, router, usePathname, type Href } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../src/constants/firebase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const userDocUnsubRef = useRef<(() => void) | null>(null);
  const pathname = usePathname(); // current path, e.g. "/login"

  // Navigate only if target differs from current URL
  const go = (to: Href) => {
    const target = typeof to === 'string' ? to : (to as any)?.pathname ?? String(to);
    if (pathname !== target) router.replace(to);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // clean prior doc listener
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }

      if (!user) {
        go('/login');
        setReady(true);
        return;
      }

      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        go('/role-select');
        setReady(true);
        return;
      }

      // live updates for role/banned changes
      userDocUnsubRef.current = onSnapshot(ref, (d) => {
        const data = d.data() as any;
        if (!data)       { go('/role-select'); return; }
        if (data.banned) { go('/banned');      return; }
        if (!data.role)  { go('/role-select'); return; }

        if (data.role === 'admin')   { go('/admin');   return; }
        if (data.role === 'kitchen') { go('/kitchen'); return; }
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
  }, [pathname]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="user" />
      <Stack.Screen name="kitchen" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="banned" />
    </Stack>
  );
}
