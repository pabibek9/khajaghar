// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Web uses browser events for instant updates
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOffline = () => setIsOffline(true);
      const handleOnline = () => setIsOffline(false);
      
      setIsOffline(!navigator.onLine);

      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }

    // iOS and Android use native bindings to the OS's networking stack
    const unsubscribe = NetInfo.addEventListener(state => {
      // isConnected means joined a network (WiFi/Cellular)
      // isInternetReachable means resolving DNS (actual internet)
      // Default to online if isInternetReachable is still resolving (null)
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  return isOffline;
}
