// src/services/authService.ts
//
// LocalStorage-style session persistence for React Native using AsyncStorage.
// Saves a minimal session after successful login so the app can route
// authenticated users to their dashboard even on offline cold starts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from 'firebase/auth';

export const USER_SESSION_KEY = 'user_session';
export const SESSION_TIMESTAMP_KEY = 'last_login_ts';

export type UserRole = 'customer' | 'driver' | 'rider' | 'restaurant' | 'kitchen' | 'admin';

export interface StoredSession {
  uid: string;
  email: string | null;
  role: UserRole;
  token: string;
  savedAt: number;
}

/**
 * Saves the current Firebase user session + role to AsyncStorage.
 * Call this immediately after a successful login and role fetch.
 */
export async function saveSession(user: User, role: UserRole): Promise<void> {
  try {
    const token = await user.getIdToken();
    const session: StoredSession = {
      uid: user.uid,
      email: user.email,
      role,
      token,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    await AsyncStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
  } catch (e) {
    console.warn('[authService] Failed to save session:', e);
  }
}

/**
 * Retrieves the stored session, or null if none exists.
 */
export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch (e) {
    console.warn('[authService] Failed to read session:', e);
    return null;
  }
}

/**
 * Clears the session from AsyncStorage.
 * Call this on logout BEFORE calling Firebase signOut().
 */
export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([USER_SESSION_KEY, SESSION_TIMESTAMP_KEY]);
  } catch (e) {
    console.warn('[authService] Failed to clear session:', e);
  }
}

/**
 * Checks whether a stored session is still within the 30-day expiry window.
 */
export function isSessionValid(session: StoredSession): boolean {
  const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  return Date.now() - session.savedAt < SESSION_EXPIRY_MS;
}
