/**
 * Custom hook for user profile management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  subscribeToUserProfile,
  updateUserProfile,
  UserProfile,
} from '../../services/firebase/firestoreService';

export interface UseUserProfileOptions {
  userId: string;
}

export interface UseUserProfileResult {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export function useUserProfile(options: UseUserProfileOptions): UseUserProfileResult {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to user profile
  useEffect(() => {
    if (!options.userId) {
      setIsLoading(false);
      return;
    }

    try {
      unsubscribeRef.current = subscribeToUserProfile(options.userId, (fetchedUser) => {
        setUser(fetchedUser);
        setIsLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [options.userId]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!options.userId) return;

      try {
        setError(null);
        await updateUserProfile(options.userId, data);
        // Local state will be updated via the subscription listener
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update profile');
        throw err;
      }
    },
    [options.userId]
  );

  return {
    user,
    isLoading,
    error,
    updateProfile,
  };
}
