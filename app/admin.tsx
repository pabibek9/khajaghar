// client/app/admin.tsx
import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../src/constants/firebase';

type UserDoc = {
  email?: string;
  preferredName?: string;
  phone?: string;
  role?: 'user' | 'kitchen' | 'admin' | null;
  banned?: boolean;
  vip?: boolean;
  isOpen?: boolean;
  createdAt?: any;
};

export default function Admin() {
  const [users, setUsers] = useState<Array<{ id: string; data: UserDoc }>>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'kitchen' | 'user' | 'banned' | 'vip' | 'open'>('all');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace('/login'); return; }
      await refresh();
    });
    return () => unsub();
  }, []);

  const refresh = async () => {
    try {
      const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200));
      const snap = await getDocs(qy);
      const rows: Array<{ id: string; data: UserDoc }> = [];
      snap.forEach((d) => rows.push({ id: d.id, data: d.data() as UserDoc }));
      setUsers(rows);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load users');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(({ data }) => {
      if (filter === 'kitchen' && data.role !== 'kitchen') return false;
      if (filter === 'user' && data.role !== 'user') return false;
      if (filter === 'banned' && !data.banned) return false;
      if (filter === 'vip' && !data.vip) return false;
      if (filter === 'open' && !data.isOpen) return false;
      if (!term) return true;
      return (
        (data.email || '').toLowerCase().includes(term) ||
        (data.preferredName || '').toLowerCase().includes(term) ||
        (data.phone || '').toLowerCase().includes(term)
      );
    });
  }, [users, search, filter]);

  const patch = async (uid: string, data: Partial<UserDoc>) => {
    try { await updateDoc(doc(db, 'users', uid), data as any); await refresh(); }
    catch (e: any) { Alert.alert('Error', e?.message || 'Update failed'); }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor="#777"
          style={{ flex: 1, backgroundColor: '#1A1A1D', color: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
        <TouchableOpacity onPress={refresh} style={{ backgroundColor: '#2C7CF8', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signOut(auth).then(() => router.replace('/login'))}
          style={{ backgroundColor: '#FF3B30', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['all','kitchen','user','banned','vip','open'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={{ backgroundColor: filter === f ? '#2C7CF8' : '#3a3a3a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
            <Text style={{ color: 'white' }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
        {filtered.map(({ id, data }) => (
          <View key={id} style={{ backgroundColor: '#0f0f10', borderRadius: 10, padding: 12, gap: 6 }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>
              {data.preferredName || '—'} ({data.role || 'none'})
            </Text>
            <Text style={{ color: '#bdbdbd' }}>{data.email}</Text>
            <Text style={{ color: data.vip ? '#ffe38a' : '#bdbdbd' }}>vip: {String(!!data.vip)}</Text>
            <Text style={{ color: data.isOpen ? '#6fe07f' : '#bdbdbd' }}>isOpen: {String(!!data.isOpen)}</Text>
            <Text style={{ color: data.banned ? '#FF3B30' : '#6fe07f' }}>banned: {String(!!data.banned)}</Text>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <TouchableOpacity onPress={() => patch(id, { vip: !data.vip })}
                style={{ backgroundColor: data.vip ? '#8E8E93' : '#f1c40f', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'black', fontWeight: '700' }}>{data.vip ? 'Revoke VIP' : 'Grant VIP'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => patch(id, { isOpen: !data.isOpen })}
                style={{ backgroundColor: data.isOpen ? '#8E8E93' : '#34C759', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>{data.isOpen ? 'Force Stop' : 'Force Start'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => patch(id, { banned: !data.banned })}
                style={{ backgroundColor: data.banned ? '#34C759' : '#FF3B30', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>{data.banned ? 'Unban' : 'Ban'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
