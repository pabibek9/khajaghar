// src/utils/safeApiCall.ts
//
// Wraps any async Firestore write or API call with a connectivity check.
// If the device is offline, the call is skipped and the user is notified.
// Usage:
//   const result = await safeApiCall(() => addDoc(collection(db, 'orders'), data), showToast);

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Performs a lightweight connectivity check.
 * Returns true when the device has real internet access.
 */
async function isOnline(): Promise<boolean> {
  if (Platform.OS === 'web') return navigator.onLine;

  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Guards a Firestore / API call against offline conditions.
 *
 * @param fn        - The async call to execute (must return a Promise).
 * @param showToast - A function to display a user-facing message (Alert, toast, etc.).
 * @returns         - The result of `fn`, or `null` if the device is offline.
 *
 * @example
 *   const ref = await safeApiCall(
 *     () => addDoc(collection(db, 'orders'), orderData),
 *     (msg) => Alert.alert('Offline', msg),
 *   );
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  showToast: (msg: string) => void,
): Promise<T | null> {
  const online = await isOnline();
  if (!online) {
    showToast('No internet. Please reconnect and try again.');
    return null;
  }
  return await fn();
}
