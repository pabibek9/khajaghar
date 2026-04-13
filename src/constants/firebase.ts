// client/src/constants/firebase.ts
import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getAuth,
  Auth
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : browserLocalPersistence
    });
  } catch (e) {
    auth = getAuth(app);
  }
}

export { auth };

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Web popup provider 
export const googleProvider = new GoogleAuthProvider();


export const oauthIds = {
  webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID!,
  androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID!,
  iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID!,
};



export default app;



