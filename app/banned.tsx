// client/app/banned.tsx
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../src/constants/firebase';


export default function Banned() {
return (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
<Text style={{ fontSize: 22, fontWeight: '800', color: '#FF3B30' }}>Account Banned</Text>
<Text style={{ textAlign: 'center' }}>Contact support if you think this is a mistake.</Text>
<TouchableOpacity onPress={() => signOut(auth).then(() => router.replace('/login'))} style={{ backgroundColor: '#FF6B6B', padding: 12, borderRadius: 10 }}>
<Text style={{ color: 'white', fontWeight: '700' }}>Back to Login</Text>
</TouchableOpacity>
</View>
);
}