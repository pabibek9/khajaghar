import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import Constants from 'expo-constants';

import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { auth, db, googleProvider, oauthIds } from '../src/constants/firebase';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { saveSession, type UserRole } from '../src/services/authService';

WebBrowser.maybeCompleteAuthSession();

const theme = {
  bg: '#000000',
  card: '#111114',
  input: '#1A1A1D',
  inputBorder: '#2A2A2E',
  primary: '#2C7CF8',
  warning: '#FFCC00',
  text: '#FFFFFF',
  secondaryText: '#6E6E73',
  accent: '#6E6E73',
  error: '#FF3B30',
};





export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Offline detection ────────────────────────────────────────────────────
  const isOffline = useNetworkStatus();
  // ────────────────────────────────────────────────────────────────────────
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] =
    Google.useIdTokenAuthRequest({
      clientId:
        Platform.OS === 'ios'
          ? oauthIds.iosClientId
          : Platform.OS === 'android'
            ? oauthIds.androidClientId
            : oauthIds.webClientId,
      redirectUri,
    });

  const afterLogin = useCallback(async (uid: string, emailAddr: string) => {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const currentUser = auth.currentUser;

    if (!snap.exists()) {
      await setDoc(ref, {
        email: emailAddr,
        role: null,
        vip: false,
        isOpen: false,
        banned: false,
        emailVerified: currentUser?.emailVerified || false,
        createdAt: serverTimestamp(),
      });
      router.replace('/role-select');
      return;
    }

    const d = snap.data();
    if (d?.banned) { router.replace('/banned'); return; }

    const createdAt = d?.createdAt?.toDate();
    const now = new Date();
    const diffInDays = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24) : 0;
    const isGoogleUser = currentUser?.providerData.some(p => p.providerId === GoogleAuthProvider.PROVIDER_ID);

    if (currentUser && !currentUser.emailVerified && diffInDays > 3 && !isGoogleUser) {
      await updateDoc(ref, { banned: true, banReason: 'Email not verified within 72 hours.' });
      router.replace('/banned');
      return;
    }

    if (!d?.role) { router.replace('/role-select'); return; }

    // ── Persist session so future offline launches can route correctly ─────
    if (currentUser) {
      try {
        await saveSession(currentUser, d.role as UserRole);
      } catch (e) {
        console.warn('[Login] Failed to save session:', e);
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    if (d.role === 'kitchen') { router.replace('/kitchen'); return; }
    if (d.role === 'admin') { router.replace('/admin'); return; }
    if (d.role === 'rider') { router.replace('/rider'); return; }
    router.replace('/user');
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const res = await signInWithPopup(auth, googleProvider);
        await afterLogin(res.user.uid, res.user.email!);
      } else {
        if (!request) {
          Alert.alert('Error', 'Authentication request is not ready. Please restart the app.');
          return;
        }
        await promptAsync({ useProxy: true } as any);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Login failed', err?.message || 'Please try again.');
    } finally { setLoading(false); }
  }, [afterLogin, promptAsync, request]);

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(res => afterLogin(res.user.uid, res.user.email!))
        .catch(error => {
          Alert.alert('Google Sign-In Error', error.message);
          setLoading(false);
        });
    } else if (response?.type === 'dismiss') {
      setLoading(false);
    }
  }, [response, afterLogin]);

  const handleLogin = async () => {
    if (isOffline) {
      Alert.alert('No Internet', 'You are offline. Please reconnect to sign in.');
      return;
    }
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      await afterLogin(res.user.uid, email);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter your email', 'Type your email above, then tap Forgot Password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const isExpoGo = Constants.appOwnership === 'expo';
  const canLogin = email.trim().length > 0 && password.length > 0 && !isOffline;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Offline notice on login screen */}
        {isOffline && (
          <View style={styles.offlineNotice}>
            <Ionicons name="wifi-outline" size={16} color="#fff" />
            <Text style={styles.offlineNoticeText}>You are offline. Sign in is unavailable.</Text>
          </View>
        )}

        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/images/no bg .png')}
              style={{ width: 70, height: 70, resizeMode: 'contain' }}
            />
          </View>
          <Text style={styles.brandName}>Khajaghar</Text>
          <Text style={styles.brandTagline}>Fastest Food Delivery</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back!</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>

          {/* Email */}
          <View style={[styles.inputBox, focusedInput === 'email' && styles.inputFocused]}>
            <Ionicons name="mail-outline" size={20} color={focusedInput === 'email' ? theme.primary : theme.secondaryText} />
            <TextInput
              style={styles.inputField}
              placeholder="Email address"
              placeholderTextColor={theme.secondaryText}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputBox, focusedInput === 'password' && styles.inputFocused]}>
            <Ionicons name="lock-closed-outline" size={20} color={focusedInput === 'password' ? theme.primary : theme.secondaryText} />
            <TextInput
              ref={passwordInputRef}
              style={[styles.inputField, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={theme.secondaryText}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              secureTextEntry={!showPassword}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.secondaryText} />
            </Pressable>
          </View>

          {/* Forgot password */}
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, !canLogin && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading || !canLogin}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Login */}
        {!isExpoGo && (
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={loading || (Platform.OS !== 'web' && !request)}
            style={styles.googleBtn}
            activeOpacity={0.85}
          >
            <AntDesign name="google" size={18} color="#000" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        )}

        {isExpoGo && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={styles.warningText}>
              Use Email + Password to sign in on Expo Go.
            </Text>
          </View>
        )}

        {/* Sign up link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupPrompt}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup' as any)}>
            <Text style={styles.signupLink}>Create Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'center' },

  // Offline notice
  offlineNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  offlineNoticeText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

  // Brand
  brandSection: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#1A1A1D',
    borderWidth: 1, borderColor: '#2A2A2E',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 38 },
  brandName: { fontSize: 34, fontWeight: '900', color: theme.text, letterSpacing: -0.5 },
  brandTagline: { fontSize: 14, color: theme.secondaryText, marginTop: 4, fontWeight: '500' },

  // Card
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E1E22',
    marginBottom: 20,
    gap: 14,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  cardSubtitle: { fontSize: 14, color: theme.secondaryText, marginTop: -6 },

  // Input
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.input,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    gap: 10,
  },
  inputFocused: { borderColor: theme.primary, backgroundColor: '#15151A' },
  inputField: { flex: 1, color: theme.text, fontSize: 16, fontWeight: '500' },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: theme.primary, fontSize: 13, fontWeight: '600' },

  // Primary Button
  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14, height: 56,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E1E22' },
  dividerText: { color: theme.secondaryText, marginHorizontal: 12, fontSize: 12, fontWeight: '700' },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15, borderRadius: 14,
    marginTop: 12,
  },
  googleBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  // Warning
  warningBox: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12,
    backgroundColor: '#1A1A1D',
    borderWidth: 1, borderColor: '#2A2A2E',
    gap: 8, marginTop: 12,
  },
  warningText: { color: theme.primary, fontSize: 12, flexShrink: 1 },

  // Sign up
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28, marginBottom: 8 },
  signupPrompt: { color: theme.secondaryText, fontSize: 14 },
  signupLink: { color: theme.primary, fontSize: 14, fontWeight: '700' },
});