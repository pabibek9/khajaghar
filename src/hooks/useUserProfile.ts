// src/hooks/useUserProfile.ts
//
// Subscribes to the current user's Firestore profile document.
// Also auto-detects GPS location on native platforms and populates
// address / coords without requiring the user to manually enter them.
//
// Usage:
//   const { profile, address, setAddress, userLoc, setUserLoc, saveProfile } = useUserProfile(uid);

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  subscribeToUserProfile,
  updateUserProfile,
  UserProfile,
} from '../services/firebase/firestoreService';

export interface UseUserProfileResult {
  profile: UserProfile | null;
  /** Editable address string bound to the profile text input */
  address: string;
  setAddress: (addr: string) => void;
  /** GPS coordinates {lat?, lng?} — strings for TextInput compatibility */
  userLoc: { lat?: string; lng?: string };
  setUserLoc: React.Dispatch<React.SetStateAction<{ lat?: string; lng?: string }>>;
  /** Saves address + coords to Firestore */
  saveProfile: () => Promise<void>;
  isSaving: boolean;
}

export function useUserProfile(uid: string | null): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [address, setAddress] = useState('');
  const [userLoc, setUserLoc] = useState<{ lat?: string; lng?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // ── Firestore profile subscription ─────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUserProfile(uid, (p) => {
      setProfile(p);
      if (p) {
        if (p.address) setAddress(p.address);
        if (p.location?.lat && p.location?.lng) {
          setUserLoc({ lat: String(p.location.lat), lng: String(p.location.lng) });
        }
      }
    });
    return () => unsub();
  }, [uid]);

  // ── Auto-detect GPS location on native (best-effort, non-blocking) ─────────
  useEffect(() => {
    if (!uid || Platform.OS === 'web') return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLoc((prev) => {
          // Don't overwrite if we already have saved coords
          if (prev.lat && prev.lng) return prev;
          return {
            lat: String(loc.coords.latitude),
            lng: String(loc.coords.longitude),
          };
        });
      } catch (_) {
        // Silently ignore — user can manually enter address
      }
    })();
  }, [uid]);

  // ── Save to Firestore ───────────────────────────────────────────────────────
  const saveProfile = useCallback(async () => {
    if (!uid) return;
    setIsSaving(true);
    try {
      await updateUserProfile(uid, {
        address: address || '',
        ...(userLoc.lat && userLoc.lng
          ? { location: { lat: parseFloat(userLoc.lat), lng: parseFloat(userLoc.lng) } }
          : {}),
      });
    } finally {
      setIsSaving(false);
    }
  }, [uid, address, userLoc]);

  return { profile, address, setAddress, userLoc, setUserLoc, saveProfile, isSaving };
}
