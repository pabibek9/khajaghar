// client/app/role-select.tsx
import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Alert, Text, TextInput, View, StyleSheet,
  Pressable, Animated, KeyboardAvoidingView,
  Platform, ScrollView, SafeAreaView, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import * as Haptics from 'expo-haptics'; // Premium touch feedback
import { Ionicons } from '@expo/vector-icons'; // Built-in Expo icons
import { auth, db } from '../src/constants/firebase';

// --- BUTTONS PRESERVED EXACTLY ---
const ActionButton = ({ onPress, children, style, disabled }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const flattenedStyle = StyleSheet.flatten(style);

  const onPressIn = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleValue, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }], flex: flattenedStyle.flex ?? 0 }}>
      <Pressable
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={[styles.btnBase, flattenedStyle]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function RoleSelect() {
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const emailName = useMemo(() => (email ? email.split('@')[0] : 'there'), [email]);
  const isFormReady = preferredName.trim().length > 0 && phone.trim().length > 7;

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/login'); return; }
      setEmail(user.email || '');
      setUid(user.uid);

      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const d = snap.data() as any;
        if (d?.role === 'user') { router.replace('/user'); return; }
        if (d?.role === 'kitchen') { router.replace('/kitchen'); return; }
        if (d?.role === 'rider') { router.replace('/rider'); return; }
        if (d?.preferredName) setPreferredName(d.preferredName);
        if (d?.phone) setPhone(d.phone);
      }
    });
    unsubRef.current = unsub;
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    // Cut the wire FIRST so the listener never sees the null-user state
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    try {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await signOut(auth);
      router.replace('/login');
    } catch (e) {
      console.error('[RoleSelect] Logout error:', e);
    }
  };

  const saveWithRole = async (role: 'user' | 'kitchen') => {
    if (!uid || saving) return;
    if (!isFormReady) {
      Alert.alert('Details Missing', 'Please provide your name and phone number first.');
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, {
        role,
        preferredName: preferredName.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      });
      router.replace(role === 'kitchen' ? '/kitchen' : '/user');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally { setSaving(false); }
  };

  const renderContent = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Select Role</Text>
          <Text style={styles.welcome}>Welcome back, {emailName}</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={18} color="#FF4B4B" />
        </Pressable>
      </View>

      {/* Modernized Form */}
      <View style={styles.formContainer}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputBox, focusedInput === 'name' && styles.inputFocused]}>
            <Ionicons name="person-outline" size={20} color={focusedInput === 'name' ? '#2C7CF8' : '#555'} />
            <TextInput
              value={preferredName}
              onChangeText={setPreferredName}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Your Name"
              placeholderTextColor="#555"
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputBox, focusedInput === 'phone' && styles.inputFocused]}>
            <Ionicons name="call-outline" size={20} color={focusedInput === 'phone' ? '#2C7CF8' : '#555'} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocusedInput('phone')}
              onBlur={() => setFocusedInput(null)}
              placeholder="+977"
              placeholderTextColor="#555"
              keyboardType="phone-pad"
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
            />
          </View>
        </View>
      </View>

      {/* Visual Guide */}
      <View style={[styles.guideContainer, { opacity: isFormReady ? 1 : 0.4 }]}>
        <View style={styles.line} />
        <Text style={styles.guideText}>CHOOSE YOUR PATH</Text>
        <View style={styles.line} />
      </View>

      {/* --- BUTTONS PRESERVED EXACTLY AS REQUESTED --- */}
      <View style={styles.buttonContainer}>
        <View style={styles.row}>
          <ActionButton
            onPress={() => saveWithRole('kitchen')}
            style={[styles.btnKitchen, { flexGrow: 1, flexBasis: '45%', minWidth: 150 }]}
            disabled={saving}
          >
            <Text style={styles.btnText}>{saving ? '...' : 'Kitchen 👨‍🍳'}</Text>
          </ActionButton>

          <ActionButton
            onPress={() => saveWithRole('user')}
            style={[styles.btnUser, { flexGrow: 1, flexBasis: '45%', minWidth: 150 }]}
            disabled={saving}
          >
            <Text style={styles.btnText}>{saving ? '...' : 'Customer 😋'}</Text>
          </ActionButton>
        </View>

        <ActionButton
          onPress={() => router.push('/rider-signup' as any)}
          style={styles.btnRider}
        >
          <Text style={styles.btnText}>🚴 Continue as Rider</Text>
        </ActionButton>
      </View>

      <Text style={styles.footerEmail}>{email}</Text>

    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        renderContent()
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            {renderContent()}
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingTop: 10 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10
  },
  title: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  welcome: { color: '#888', fontSize: 16, fontWeight: '500' },
  logoutBtn: {
    backgroundColor: '#1A1A1D',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },

  formContainer: { marginBottom: 30 },
  inputWrapper: { marginBottom: 20 },
  label: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: '#222'
  },
  inputFocused: {
    borderColor: '#2C7CF8',
    backgroundColor: '#15151A'
  },
  textInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    alignSelf: 'stretch',
  },

  guideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  guideText: { color: '#444', fontSize: 10, fontWeight: '900', marginHorizontal: 15, letterSpacing: 2 },

  // --- BUTTON STYLES (PRESERVED) ---
  buttonContainer: { width: '100%', gap: 12 },
  row: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  btnBase: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  btnKitchen: { backgroundColor: '#2C7CF8' },
  btnUser: { backgroundColor: '#34C759' },
  btnRider: { backgroundColor: '#FF9500' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },

  footerEmail: {
    textAlign: 'center',
    color: '#333',
    fontSize: 12,
    marginTop: 40,
    fontWeight: '600'
  }
});