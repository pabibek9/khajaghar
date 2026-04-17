// src/hooks/useAuth.ts
//
// Wraps Firebase onAuthStateChanged and exposes a clean auth state.
// Automatically redirects to /login when the user is signed out.

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../constants/firebase';

export interface AuthState {
  uid: string | null;
  email: string | null;
  /** True on the very first auth check before Firebase responds */
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setEmail(null);
        setIsLoading(false);
        router.replace('/login');
        return;
      }
      setUid(user.uid);
      setEmail(user.email);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  return { uid, email, isLoading };
}
