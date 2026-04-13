// client/app/index.tsx
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../src/constants/firebase';


export default function Index() {
useEffect(() => {
(async () => {
try { await signOut(auth); } catch {}
router.replace('/login');
})();
}, []);


return (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
<ActivityIndicator />
</View>
);
}