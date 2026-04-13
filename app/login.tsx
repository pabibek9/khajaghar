// client/app/login.tsx
import { AntDesign } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, googleProvider, oauthIds } from '../src/constants/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [loading, setLoading] = useState(false);

  // Use the simpler id-token hook to avoid expoClientId typing issues
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Platform.select({
      web: oauthIds.webClientId,
      android: oauthIds.androidClientId || oauthIds.webClientId, 
      ios: oauthIds.iosClientId || oauthIds.webClientId         
    }) as string,
    
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setLoading(true);
      try { await afterLogin(user.uid, user.email || ''); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!response || response.type !== 'success') return;

    
    const idToken = (response.params as any)?.id_token as string | undefined;
    if (!idToken) return;

    (async () => {
      setLoading(true);
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const res = await signInWithCredential(auth, credential);
        await afterLogin(res.user.uid, res.user.email || '');
      } catch (e: any) {
        console.error(e);
        Alert.alert('Login failed', e?.message || 'Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [response]);

  const afterLogin = useCallback(async (uid: string, email: string) => {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        email,
        role: null,
        vip: false,
        isOpen: false,
        banned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.replace('/role-select');
      return;
    }

    const d = snap.data() as any;
    if (d?.banned) { router.replace('/banned'); return; }
    if (!d?.role)  { router.replace('/role-select'); return; }
    if (d.role === 'kitchen') { router.replace('/kitchen'); return; }
    if (d.role === 'admin')   { router.replace('/admin');   return; }
    router.replace('/user');
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        
        const res = await signInWithPopup(auth, googleProvider);
        const u = res.user; if (!u) throw new Error('Google sign-in failed.');
        await afterLogin(u.uid, u.email || '');
      } else {
        
        await promptAsync();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Login failed', err?.message || 'Please try again.');
    } finally { setLoading(false); }
  }, [afterLogin, promptAsync]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 24, backgroundColor: '#0B0B0C' }}>
      <Text style={{ fontSize: 28, color: 'white', fontWeight: '700' }}>Sign in to continue</Text>
      <Text style={{ fontSize: 14, color: '#A7A7AD', textAlign: 'center' }}>
        One-tap with Google.and lets have yammy food!🤤
      </Text>

      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={loading || (Platform.OS !== 'web' && !request)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, width: '100%', maxWidth: 360, justifyContent: 'center' }}
      >
        <AntDesign name="google" size={20} />
        <Text style={{ fontWeight: '700' }}>Continue with Google</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ marginTop: 12 }}>
          <ActivityIndicator />
        </View>
      ) : null}
    </View>
  );
}
