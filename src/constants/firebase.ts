// client/src/constants/firebase.ts
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyBUFvyUvhvnJVBHzkx2K8KjIAppaAR4i3k",
  authDomain: "bibekkhaja.firebaseapp.com",
  projectId: "bibekkhaja",
  storageBucket: "bibekkhaja.firebasestorage.app",
  messagingSenderId: "639565915655",
  appId: "1:639565915655:web:e06ad3caa13f3ca063aca2",
  measurementId: "G-BWQZC7XW43"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Web popup provider (used only on web)
export const googleProvider = new GoogleAuthProvider();

// Google OAuth client IDs for expo-auth-session 
export const oauthIds = {
  webClientId:     '639565915655-splkise0bvkgff8rst5kef1512lgotfs.apps.googleusercontent.com',
  androidClientId: '639565915655-o3rougkeh3dmakfee2d1tr6ut0s9r31g.apps.googleusercontent.com',
  iosClientId:     '639565915655-2m7vi4ttk8582pqlshmer5u9b7nmsb84.apps.googleusercontent.com' 
};

export default app;
