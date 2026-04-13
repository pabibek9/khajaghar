// client/app/role-select.tsx
import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { auth, db } from '../src/constants/firebase';

export default function RoleSelect() {
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const emailName = useMemo(() => (email ? email.split('@')[0] : ''), [email]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/login'); return; }
      setEmail(user.email || ''); 
      setUid(user.uid);

      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          email: user.email || '',
          role: null,
          vip: false,
          isOpen: false,
          banned: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const d = snap.data() as any;

        // 🔥 If role already exists, immediately redirect
        if (d?.role === 'user') { router.replace('/user'); return; }
        if (d?.role === 'kitchen') { router.replace('/kitchen'); return; }

        const patch: any = { updatedAt: serverTimestamp() };
        if (typeof d?.vip === 'undefined') patch.vip = false;
        if (typeof d?.isOpen === 'undefined') patch.isOpen = false;
        if (Object.keys(patch).length > 1) await updateDoc(ref, patch);

        if (d?.preferredName) setPreferredName(d.preferredName);
        if (d?.phone) setPhone(d.phone);
        if (d?.banned) { router.replace('/banned'); }
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth).catch(() => {});
    router.replace('/login');
  };

  const saveWithRole = async (role: 'user' | 'kitchen') => {
    if (!uid) return;
    if (!preferredName.trim()) { Alert.alert('Missing info', 'Please enter your name.'); return; }
    if (!/^\+?\d{7,15}$/.test(phone.trim())) { Alert.alert('Invalid phone', 'Enter a valid phone number.'); return; }

    setSaving(true);
    try {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, {
        role,
        vip: false,        // stays false until admin grants
        isOpen: false,     // closed by default
        preferredName: preferredName.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      });
      role === 'kitchen' ? router.replace('/kitchen') : router.replace('/user');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save role');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0C', padding: 20, paddingTop: 48 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Select your role</Text>
        <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
          <Text style={{ color: '#FF6B6B', fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: '#A7A7AD', marginBottom: 8 }}>Hi {emailName || 'there'} 👋</Text>
      <Text style={{ color: '#A7A7AD', marginBottom: 24 }}>{email}</Text>

      <Text style={{ color: '#DADAE0', marginBottom: 8 }}>Preferred name</Text>
      <TextInput 
        value={preferredName} 
        onChangeText={setPreferredName} 
        placeholder="Your name" 
        placeholderTextColor="#777" 
        style={{ backgroundColor: '#1A1A1D', color: 'white', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }} 
      />

      <Text style={{ color: '#DADAE0', marginBottom: 8 }}>Phone</Text>
      <TextInput 
        value={phone} 
        onChangeText={setPhone} 
        placeholder="+97798xxxxxxx" 
        placeholderTextColor="#777" 
        keyboardType="phone-pad" 
        style={{ backgroundColor: '#1A1A1D', color: 'white', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24 }} 
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity 
          disabled={saving} 
          onPress={() => saveWithRole('user')} 
          style={{ flex: 1, backgroundColor: '#2C7CF8', padding: 14, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{saving ? 'Saving…' : 'Continue as User'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          disabled={saving} 
          onPress={() => saveWithRole('kitchen')} 
          style={{ flex: 1, backgroundColor: '#34C759', padding: 14, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{saving ? 'Saving…' : 'Continue as Kitchen'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
