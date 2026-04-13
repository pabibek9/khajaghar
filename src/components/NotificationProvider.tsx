import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../constants/firebase';
import OrderBanner from './OrderBanner';

// ─── Expo-notifications: safe import for Expo Go ─────────────────────────────
// expo-notifications remote push crashes in Expo Go with SDK 53+.
// We lazy-load and no-op gracefully so the rest of the app keeps running.
const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: any = {
  setNotificationHandler: () => {},
  requestPermissionsAsync: async () => ({ status: 'denied' }),
  scheduleNotificationAsync: async () => {},
};

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('[NotificationProvider] expo-notifications not available:', e);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationContextType {
  unreadCount: number;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBanner, setActiveBanner] = useState<{ id: string; visible: boolean }>({ id: '', visible: false });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Request permissions on mount (no-op in Expo Go via the mock above)
    if (!isExpoGo) {
      Notifications.requestPermissionsAsync().catch(() => {});
    }

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (user) {
        if (!isExpoGo && Platform.OS !== 'web') {
          try {
             const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
             const pToken = await Notifications.getExpoPushTokenAsync({ projectId });
             if (pToken?.data) {
                await updateDoc(doc(db, 'users', user.uid), {
                   expoPushToken: pToken.data,
                   devicePlatform: Platform.OS,
                }).catch(() => {});
             }
          } catch(e) { console.log('Push token fetch failed:', e); }
        }

        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          where('status', '==', 'In Progress')
        );

        unsubscribeRef.current = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              triggerOrderNotification(change.doc.id);
            }
          });
          setUnreadCount(snapshot.size);
        });
      } else {
        setUnreadCount(0);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const triggerOrderNotification = async (orderId: string) => {
    // Always show the in-app visual banner
    setActiveBanner({ id: orderId, visible: true });

    // Only schedule a system notification in a real dev build
    if (!isExpoGo) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Order Update! 🍔',
            body: `Your order #${orderId.slice(-6).toUpperCase()} is now in progress!`,
            data: { orderId },
          },
          trigger: null,
        });
      } catch (e) {
        console.log('[NotificationProvider] Could not schedule notification:', e);
      }
    }
  };

  const resetUnreadCount = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, resetUnreadCount }}>
      {children}
      <OrderBanner
        visible={activeBanner.visible}
        orderId={activeBanner.id}
        onClose={() => setActiveBanner(prev => ({ ...prev, visible: false }))}
      />
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
