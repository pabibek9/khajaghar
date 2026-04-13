# 🍱 KHAJA FOOD DELIVERY APP — COMPLETE AI AGENT BUILD PROMPT

> **Stack:** React Native + Expo Router + Firebase (Firestore, Auth, Storage, Cloud Functions)  
> **Platforms:** iOS, Android, Web  
> **State:** Existing codebase with bugs — fix, enhance, and make production-ready  

---

## 📁 PROJECT STRUCTURE (Target)

```
client/
├── app/
│   ├── _layout.tsx              # Root layout with auth guard
│   ├── index.tsx                # Splash/redirect
│   ├── login.tsx                # Auth screen (email + Google)
│   ├── role-select.tsx          # First-time role + profile setup
│   ├── banned.tsx               # Banned account screen
│   ├── user.tsx                 # Customer home (browse + order)
│   ├── kitchen.tsx              # Kitchen dashboard
│   ├── admin.tsx                # Admin panel
│   ├── profile.tsx              # Shared profile edit screen (NEW)
│   ├── print/
│   │   ├── _layout.tsx
│   │   └── [id].tsx             # Print bill page (web only)
│   └── (tabs)/
│       └── explore.tsx
├── src/
│   ├── constants/
│   │   └── firebase.ts          # Firebase config (from .env)
│   ├── components/
│   │   ├── FoodCard.tsx
│   │   ├── OrderCard.tsx        # Shared order card
│   │   └── BottomSheet.tsx      # Reusable bottom sheet
│   └── utils/
│       └── api.ts
├── functions/                   # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts             # Auto-cancel + reassign functions
│   └── package.json
├── firestore.rules              # Security rules
├── .env                         # Firebase env vars (NOT committed)
└── app.config.ts                # Expo config reading .env
```

---

## 🔴 CRITICAL BUG FIXES (Do These First)

### Bug 1 — `user.tsx`: React Hooks Called Outside Component (CRASH)

**Problem:** `useState` and async functions are defined at module level, outside the component.

```tsx
// ❌ WRONG — at module/file level
const [newMobilePassword, setNewMobilePassword] = useState('');
const setupMobileLoginPassword = async () => { ... };
```

**Fix:** Move ALL `useState` calls and their handler functions INSIDE `export default function UserHome()`.

---

### Bug 2 — `user.tsx`: Dead `.map()` Outside JSX (Memory Waste)

**Problem:** This block runs silently on every render and returns nothing:

```tsx
// ❌ DELETE THIS — outside return statement
orders.map((order) => (
  <Text key={order.id} style={{ color: order.status === "rejected" ? "red" : "black" }}>
    {order.status}
  </Text>
));
```

**Fix:** Delete these lines entirely.

---

### Bug 3 — `user.tsx`: Firestore Write Inside `.map()` During Render (INFINITE RE-RENDER)

**Problem:** Auto-cancel logic runs inside JSX `.map()`, causing Firestore writes on every render:

```tsx
// ❌ WRONG — inside orders.map() inside JSX return
if (o.status === "requested" && now - createdAtMs > tenMin) {
  updateDoc(doc(db, "orders", o.id), { status: "canceled", ... });
}
```

**Fix:** Move to a `useEffect`:

```tsx
useEffect(() => {
  const tenMin = 10 * 60 * 1000;
  orders.forEach((o) => {
    const createdAtMs = o.createdAt?.toMillis?.() ?? 0;
    if (o.status === 'requested' && Date.now() - createdAtMs > tenMin) {
      updateDoc(doc(db, 'orders', o.id), {
        status: 'canceled',
        updatedAt: serverTimestamp(),
        autoCanceled: true,
        autoCanceledReason: 'Kitchen did not accept within 10 minutes',
      }).catch(console.error);
    }
  });
}, [orders]);
```

---

### Bug 4 — `user.tsx`: `remarks` State Declared After It's Used

**Problem:** `confirmBuy` references `remarks` before the `useState` declaration.

**Fix:** Move ALL `useState` declarations to the TOP of the component, before any functions.

---

### Bug 5 — `user.tsx`: Delivery Fee NOT Included in Order Total

**Problem:** `confirmBuy` calculates `total = sel.price * qty` — no delivery fee.

**Fix:**

```tsx
const confirmBuy = async () => {
  if (!sel) return;
  try {
    const total = await totalFor(sel, qty); // ✅ includes delivery fee
    const kDoc = kitchensCache.get(sel.kitchenId);
    let deliveryFee = 20;
    if (kDoc?.location?.lat && kDoc.location.lng && userLoc.lat && userLoc.lng) {
      const km = haversineKm(
        { lat: parseFloat(userLoc.lat), lng: parseFloat(userLoc.lng) },
        { lat: kDoc.location.lat, lng: kDoc.location.lng }
      );
      deliveryFee = Math.max(20, Math.round(2 * km) + 10);
    }
    // ... rest of addDoc with correct total and deliveryFee
    await addDoc(collection(db, 'orders'), {
      ...orderData,
      deliveryFee,
      total, // ✅ correct total
    });
  }
};
```

---

### Bug 6 — `user.tsx`: Menu Card Width Overflow on Small Phones

**Problem:** Fixed `width: 150` causes overflow on 320px screens.

**Fix:** Replace `itemCard` style:

```tsx
itemCard: {
  flexBasis: '47%',
  flexGrow: 0,
  flexShrink: 0,
  backgroundColor: theme.card,
  borderRadius: 12,
  overflow: 'hidden',
},
```

---

### Bug 7 — `kitchen.tsx`: Kitchen Can Delete Items When Offline or Non-VIP

**Problem:** `deleteItem` has no guard — kitchen can delete even when `isOpen === false` or `vip === false`.

**Fix:** Add guard at start of `deleteItem`:

```tsx
const deleteItem = async (itemId: string) => {
  if (!vip) {
    Alert.alert('Not VIP', 'You must be a VIP kitchen to manage menu items.');
    return;
  }
  // Proceed with existing delete logic...
};
```

Also: The `SmallMenuItemCard` delete button should be hidden if the kitchen is offline or non-VIP. Pass `canEdit` prop:

```tsx
<SmallMenuItemCard
  key={it.id}
  item={it}
  onDelete={deleteItem}
  canEdit={canOperate} // ✅ only show trash button when VIP + online
/>

// Inside SmallMenuItemCard:
function SmallMenuItemCard({ item, onDelete, canEdit }) {
  return (
    <View style={styles.smallItemContainer}>
      {canEdit && (  // ✅ conditionally render delete button
        <Pressable onPress={() => onDelete(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash" size={16} color={theme.white} />
        </Pressable>
      )}
      ...
    </View>
  );
}
```

---

### Bug 8 — `login.tsx`: Google Sign-In Warning Has Raw Markdown

**Problem:**

```tsx
// ❌ Shows literal asterisks: **Existing Account**
"Google Sign-In is unavailable. Use the **Existing Account** OR **Create Account**..."
```

**Fix:** Use styled `<Text>` components with `fontWeight: 'bold'` instead.

---

### Bug 9 — `print-bill.tsx`: Typo

```tsx
// ❌
<strong> Delevery Address:</strong>
// ✅
<strong>Delivery Address:</strong>
```

---

### Bug 10 — `kitchen.tsx`: Dead Code at Top Level

**Problem:** `afterLogin`, `GoogleAuthProvider`, `signInWithPopup` imports exist in `kitchen.tsx` but are never used there.

**Fix:** Remove all of these from `kitchen.tsx` — they belong only in `login.tsx`.

---

### Bug 11 — `role-select.tsx`: Phone Validation Off-By-One

```tsx
// ❌ allows 10 chars through before regex
if (phone.length <= 9) { ... }
// ✅
if (phone.trim().length < 10) { ... }
```

---

### Bug 12 — `admin.tsx`: Missing Background Color

```tsx
// ❌ root View has no background — white flash on dark phones
<View style={{ flex: 1, padding: 16, gap: 12 }}>
// ✅
<View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: '#0A0A0A' }}>
```

---

## 🔒 FIREBASE SECURITY RULES

Create `firestore.rules` in project root:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      // Admins can read/write all users
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Kitchens: kitchen owner can write their own doc, all authenticated users can read
    match /kitchens/{kitchenId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == kitchenId;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

      // Kitchen items: kitchen owner can write, all auth users can read
      match /items/{itemId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == kitchenId;
      }
    }

    // Orders: users can create and read their own, kitchens can read/update orders assigned to them
    match /orders/{orderId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        resource.data.kitchenId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }
  }
}
```

---

## 🌍 ENVIRONMENT VARIABLES — Move Firebase Config to `.env`

### Step 1: Create `.env` in project root

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBUFvyUvhvnJVBHzkx2K8KjIAppaAR4i3k
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=bibekkhaja.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=bibekkhaja
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=bibekkhaja.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=639565915655
EXPO_PUBLIC_FIREBASE_APP_ID=1:639565915655:web:e06ad3caa13f3ca063aca2
EXPO_PUBLIC_WEB_CLIENT_ID=639565915655-splkise0bvkgff8rst5kef1512lgotfs.apps.googleusercontent.com
EXPO_PUBLIC_ANDROID_CLIENT_ID=639565915655-o3rougkeh3dmakfee2d1tr6ut0s9r31g.apps.googleusercontent.com
EXPO_PUBLIC_IOS_CLIENT_ID=639565915655-2m7vi4ttk8582pqlshmer5u9b7nmsb84.apps.googleusercontent.com
```

### Step 2: Add `.env` to `.gitignore`

```
.env
.env.local
```

### Step 3: Update `src/constants/firebase.ts`

```tsx
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const oauthIds = {
  webClientId:     process.env.EXPO_PUBLIC_WEB_CLIENT_ID!,
  androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID!,
  iosClientId:     process.env.EXPO_PUBLIC_IOS_CLIENT_ID!,
};

export default app;
```

---

## 📱 EXPO GO / MOBILE LOGIN FIX

**Problem:** Google Sign-In doesn't work in Expo Go. Users are stuck.

**Solution:** On mobile (Expo Go), show ONLY the email/password form. Hide Google button entirely with a clear message. Also add "Forgot Password" flow.

### Updated `login.tsx` structure:

```tsx
// 1. Detect if running in Expo Go
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';

// 2. In JSX — conditionally show Google button
{!isExpoGo && (
  <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleBtn}>
    <AntDesign name="google" size={20} color="#000" />
    <Text style={styles.googleBtnText}>Continue with Google</Text>
  </TouchableOpacity>
)}

{isExpoGo && (
  <View style={styles.infoBox}>
    <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
    <Text style={styles.infoText}>
      Use Email + Password to sign in on Expo Go. Google Sign-In is available on the full app.
    </Text>
  </View>
)}

// 3. Add Forgot Password button below login form
{!isSignUp && (
  <TouchableOpacity onPress={handleForgotPassword}>
    <Text style={styles.forgotText}>Forgot password?</Text>
  </TouchableOpacity>
)}

// 4. Add forgot password handler
import { sendPasswordResetEmail } from 'firebase/auth';

const handleForgotPassword = async () => {
  if (!email) {
    Alert.alert('Enter your email', 'Type your email address above, then tap Forgot Password.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
  } catch (e: any) {
    Alert.alert('Error', e.message);
  }
};
```

---

## 🎨 UI REDESIGN — Kitchen Screen (`kitchen.tsx`)

### Tab Bar: Replace the 3 existing tabs with a proper bottom tab structure

The current tabs (`requests`, `active`, `history`) are at the top with no content in the 3rd tab on mobile. Rebuild as proper sections:

```tsx
// Tab 3 "Profile" section must contain:
// - Kitchen name (editable)
// - Address (editable)  
// - Lat/Lng coordinates
// - Change password section
// - Logout button (moved HERE from header)
// - App version

{tab === 'profile' && (
  <View style={{ gap: 16 }}>
    
    {/* Kitchen Info */}
    <Card style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Kitchen Profile</Text>
      
      <Text style={styles.fieldLabel}>Kitchen Name</Text>
      <TextInput value={kitchenName} onChangeText={setKitchenName}
        placeholder="Your kitchen name"
        placeholderTextColor={theme.secondaryText}
        style={styles.input} />
      
      <Text style={styles.fieldLabel}>Delivery Address</Text>
      <TextInput value={address} onChangeText={setAddress}
        placeholder="e.g. Itahari-5, Main Street"
        placeholderTextColor={theme.secondaryText}
        style={styles.input} />
      
      <View style={styles.locationRow}>
        <TextInput value={loc.lat ?? ''} onChangeText={(t) => setLoc(s => ({ ...s, lat: t }))}
          placeholder="Latitude" keyboardType="numeric"
          placeholderTextColor={theme.secondaryText}
          style={[styles.input, styles.locationInput]} />
        <TextInput value={loc.lng ?? ''} onChangeText={(t) => setLoc(s => ({ ...s, lng: t }))}
          placeholder="Longitude" keyboardType="numeric"
          placeholderTextColor={theme.secondaryText}
          style={[styles.input, styles.locationInput]} />
      </View>
      
      <Button label="Save Profile" color={theme.blue} onPress={saveProfile} />
    </Card>

    {/* Change Password */}
    <Card style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Change Password</Text>
      <TextInput value={newPassword} onChangeText={setNewPassword}
        placeholder="New password (min 6 chars)"
        secureTextEntry
        placeholderTextColor={theme.secondaryText}
        style={styles.input} />
      <Button label="Update Password" color={theme.gray} onPress={handleChangePassword} />
    </Card>

    {/* Account Actions */}
    <Card style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.accountRow}>
        <Ionicons name="mail-outline" size={16} color={theme.secondaryText} />
        <Text style={[styles.itemMeta, { flex: 1 }]}>{userEmail}</Text>
      </View>
      <View style={styles.accountRow}>
        <Ionicons name="shield-checkmark-outline" size={16} 
          color={vip ? theme.yellow : theme.secondaryText} />
        <Text style={[styles.itemMeta, { flex: 1, color: vip ? theme.yellow : theme.secondaryText }]}>
          {vip ? 'VIP Kitchen ✓' : 'Pending VIP approval'}
        </Text>
      </View>
      <Button label="Logout" color={theme.red} onPress={logout} />
    </Card>

    {/* App Version */}
    <Text style={{ color: theme.secondaryText, textAlign: 'center', fontSize: 12 }}>
      KHAJA v1.0.0 • Made with ❤️ in Nepal
    </Text>
    
  </View>
)}
```

### Header: Remove Logout button from header — it lives in Profile tab now

```tsx
// ❌ Remove logout from header card
// ✅ Header shows only name, VIP status, and online/offline toggle
<Card style={{ gap: 10 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={[styles.avatarCircle, { backgroundColor: theme.blue }]}>
      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.headerTitle}>{name}</Text>
      <Text style={[styles.statusText, { color: vip ? theme.yellow : theme.secondaryText }]}>
        {vip ? '⭐ VIP Kitchen' : 'Awaiting VIP'}
      </Text>
    </View>
    <View style={[styles.statusDot, { backgroundColor: isOpen ? theme.green : theme.gray }]} />
  </View>
  <Button 
    label={isOpen ? '🔴 Go Offline' : '🟢 Go Online'} 
    color={isOpen ? theme.gray : theme.green} 
    onPress={toggleOpen} 
    style={{ marginTop: 4 }} 
  />
</Card>
```

### Tab Bar Style — make it fixed at top with icons:

```tsx
const TABS = [
  { key: 'requests', label: 'Requests', icon: 'notifications-outline' },
  { key: 'active',   label: 'Active',   icon: 'bicycle-outline' },
  { key: 'history',  label: 'History',  icon: 'time-outline' },
  { key: 'profile',  label: 'Profile',  icon: 'person-outline' },
] as const;

<View style={styles.tabBar}>
  {TABS.map((t) => (
    <Pressable key={t.key} onPress={() => setTab(t.key)}
      style={[styles.tabItem, tab === t.key && styles.tabItemActive]}>
      <Ionicons name={t.icon as any} size={20} 
        color={tab === t.key ? theme.blue : theme.secondaryText} />
      <Text style={[styles.tabLabel, tab === t.key && { color: theme.blue }]}>
        {t.label}
      </Text>
    </Pressable>
  ))}
</View>
```

---

## 🎨 UI REDESIGN — User Screen (`user.tsx`)

### Header Improvements

```tsx
// Replace hamburger menu (broken/empty) with working profile button
<Animated.View style={[styles.header, { opacity: headerFade }]}>
  <View>
    <Text style={styles.greeting}>Good {timeOfDay()},</Text>
    <Text style={styles.hi}>{name} 👋</Text>
  </View>
  <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  </TouchableOpacity>
</Animated.View>

// Helper function
const timeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};
```

### Order Status Color Coding (add to order cards)

```tsx
const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  requested:        { color: '#FFCC00', icon: 'time-outline',           label: 'Waiting for kitchen' },
  accepted:         { color: '#007AFF', icon: 'checkmark-circle-outline', label: 'Order accepted' },
  out_for_delivery: { color: '#34C759', icon: 'bicycle-outline',        label: 'On the way!' },
  delivered:        { color: '#8E8E93', icon: 'bag-check-outline',      label: 'Delivered' },
  canceled:         { color: '#FF3B30', icon: 'close-circle-outline',   label: 'Canceled' },
  rejected:         { color: '#FF3B30', icon: 'ban-outline',            label: 'Rejected by kitchen' },
  expired_reassign: { color: '#FF9500', icon: 'refresh-outline',        label: 'Needs reassignment' },
};
```

### Empty State with Icon

```tsx
function EmptyState({ message, icon }: { message: string; icon: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon as any} size={40} color={theme.secondaryText} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// Usage:
{visibleItems.length === 0 && (
  <EmptyState message="No items available near you" icon="restaurant-outline" />
)}
{orders.length === 0 && (
  <EmptyState message="You haven't placed any orders yet" icon="bag-outline" />
)}
```

---

## 🆕 NEW SCREEN: `profile.tsx`

Create `app/profile.tsx` — shared profile screen for both users and kitchens:

```tsx
// app/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../src/constants/firebase';

export default function Profile() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { router.replace('/login'); return; }
    setEmail(user.email || '');
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const d = snap.data() as any;
      setName(d?.preferredName || '');
      setPhone(d?.phone || '');
      setRole(d?.role || '');
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        preferredName: name.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { Alert.alert('Missing fields', 'Fill both password fields.'); return; }
    if (newPw.length < 6) { Alert.alert('Too short', 'Password must be at least 6 characters.'); return; }
    try {
      const user = auth.currentUser!;
      const cred = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      Alert.alert('Success', 'Password changed successfully.');
      setCurrentPw(''); setNewPw('');
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 16, padding: 20, paddingTop: 60 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F2F2F7" />
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.nameText}>{name || 'Set your name'}</Text>
        <Text style={styles.roleChip}>{role.toUpperCase()}</Text>
      </View>

      {/* Edit Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <Text style={styles.label}>Full Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input}
          placeholder="Your name" placeholderTextColor="#8E8E93" />
        <Text style={styles.label}>Phone Number</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input}
          placeholder="+977 98XXXXXXXX" keyboardType="phone-pad" placeholderTextColor="#8E8E93" />
        <Text style={styles.label}>Email</Text>
        <TextInput value={email} editable={false}
          style={[styles.input, { opacity: 0.5 }]} />
        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <TextInput value={currentPw} onChangeText={setCurrentPw} style={styles.input}
          placeholder="Current password" secureTextEntry placeholderTextColor="#8E8E93" />
        <TextInput value={newPw} onChangeText={setNewPw} style={styles.input}
          placeholder="New password (min 6 chars)" secureTextEntry placeholderTextColor="#8E8E93" />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#48484A' }]} onPress={handleChangePassword}>
          <Text style={styles.saveBtnText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={{ color: '#48484A', textAlign: 'center', fontSize: 11, marginBottom: 20 }}>
        KHAJA Delivery v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: '#F2F2F7' },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 32, fontWeight: '800', color: 'white' },
  nameText: { fontSize: 20, fontWeight: '700', color: '#F2F2F7' },
  roleChip: { backgroundColor: '#2C2C2E', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, color: '#8E8E93', fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: '#1C1C1E', borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F2F2F7', marginBottom: 4 },
  label: { color: '#8E8E93', fontSize: 13 },
  input: { backgroundColor: '#2C2C2E', color: '#F2F2F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  logoutBtn: { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
```

---

## ☁️ FIREBASE CLOUD FUNCTIONS (Auto-Cancel + Auto-Reassign)

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Runs every 5 minutes — auto-cancels orders not accepted within 10 min
export const autoCancelExpiredOrders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const snap = await db.collection('orders')
      .where('status', '==', 'requested')
      .where('createdAt', '<', tenMinAgo)
      .get();

    const batch = db.batch();
    snap.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'canceled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoCanceled: true,
        autoCanceledReason: 'Kitchen did not accept within 10 minutes',
      });
    });
    await batch.commit();
    console.log(`Auto-canceled ${snap.size} expired orders`);
  });
```

Deploy with: `firebase deploy --only functions`

---

## 📱 PUSH NOTIFICATIONS (Expo Notifications)

### Setup in `app/_layout.tsx`:

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(uid: string) {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Save to Firestore
  await updateDoc(doc(db, 'users', uid), { expoPushToken: token });
}
```

### Trigger in Cloud Functions on order status change:

```typescript
export const sendOrderNotification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status) return;

    const messages: Record<string, { title: string; body: string }> = {
      accepted:         { title: '✅ Order Accepted!', body: 'Your order is being prepared.' },
      out_for_delivery: { title: '🛵 On the Way!',    body: 'Your food is out for delivery.' },
      delivered:        { title: '🎉 Delivered!',     body: 'Enjoy your meal!' },
      rejected:         { title: '❌ Order Rejected', body: 'The kitchen rejected your order.' },
      canceled:         { title: '⚠️ Order Canceled', body: 'Your order was automatically canceled.' },
    };

    const msg = messages[after.status];
    if (!msg) return;

    const userSnap = await db.collection('users').doc(after.userId).get();
    const token = userSnap.data()?.expoPushToken;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title: msg.title, body: msg.body }),
    });
  });
```

---

## 🖼️ IMAGE UPLOAD (Firebase Storage)

Replace the image URL text input with a real image picker:

```tsx
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const pickAndUploadImage = async (): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });

  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const blob = await (await fetch(uri)).blob();
  const storage = getStorage();
  const storageRef = ref(storage, `kitchens/${uid}/items/${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};

// Replace image URL TextInput with:
<TouchableOpacity onPress={async () => {
  const url = await pickAndUploadImage();
  if (url) setImg(url);
}} style={styles.imagePickerBtn}>
  {img ? (
    <Image source={{ uri: img }} style={styles.imagePreview} />
  ) : (
    <View style={styles.imagePlaceholder}>
      <Ionicons name="camera-outline" size={28} color={theme.secondaryText} />
      <Text style={{ color: theme.secondaryText, marginTop: 4 }}>Tap to add photo</Text>
    </View>
  )}
</TouchableOpacity>
```

---

## ⭐ RATINGS & REVIEWS

### Firestore Schema

```
orders/{orderId}
  └── rating: number (1-5)
  └── review: string
  └── ratedAt: timestamp

kitchens/{kitchenId}
  └── avgRating: number
  └── totalRatings: number
```

### Add rating UI after delivery in `user.tsx`:

```tsx
{o.status === 'delivered' && !o.rating && (
  <View style={{ gap: 6 }}>
    <Text style={styles.itemMeta}>Rate this order:</Text>
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1,2,3,4,5].map(star => (
        <Pressable key={star} onPress={() => submitRating(o.id, star)}>
          <Ionicons name="star" size={24} 
            color={star <= (o.rating ?? 0) ? '#FFCC00' : theme.gray} />
        </Pressable>
      ))}
    </View>
  </View>
)}
```

---

## 🗺️ ORDER TRACKING (Map View)

```tsx
// In user.tsx — for out_for_delivery orders
import MapView, { Marker, Polyline } from 'react-native-maps';

{o.status === 'out_for_delivery' && userLoc.lat && (
  <MapView
    style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8 }}
    initialRegion={{
      latitude: parseFloat(userLoc.lat!),
      longitude: parseFloat(userLoc.lng!),
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }}
  >
    <Marker coordinate={{ latitude: parseFloat(userLoc.lat!), longitude: parseFloat(userLoc.lng!) }}
      title="Your location" pinColor="blue" />
  </MapView>
)}
```

---

## 📦 DEPLOYMENT CHECKLIST

### Before Deploy
- [ ] All bugs fixed (12 bugs listed above)
- [ ] `.env` created, Firebase config moved out of code
- [ ] `.env` added to `.gitignore`
- [ ] `firestore.rules` written and tested
- [ ] Firebase Storage rules set (only auth users can upload to their own path)
- [ ] Cloud Functions deployed (`firebase deploy --only functions`)
- [ ] `app.config.ts` reads from `process.env`
- [ ] Test email login on Expo Go ✓
- [ ] Test Google login on Web ✓
- [ ] Test order flow end-to-end ✓
- [ ] Test admin ban/unban ✓
- [ ] Test kitchen item delete (only VIP + online) ✓
- [ ] Print bill works on web ✓

### Firebase Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kitchens/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Expo Build Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for Android
eas build --platform android

# Build for iOS  
eas build --platform ios

# Build for Web (Firebase Hosting)
npx expo export --platform web
firebase deploy --only hosting
```

---

## 🏗️ ADDITIONAL FEATURES TO ADD (Phase 2)

| Feature | How |
|---|---|
| In-app chat (user ↔ kitchen) | Firestore `chats/{orderId}` subcollection |
| Loyalty points | Add `points` field to user doc, increment on delivery |
| Referral codes | Generate unique code on signup, track in Firestore |
| Multiple items per order | Change order schema to `items: [{id, name, price, qty}]` |
| Kitchen analytics dashboard | Aggregate delivered orders by day/week |
| Promo codes / discounts | `promoCodes` collection, validate on order creation |
| Dark/Light mode toggle | `useColorScheme()` + Context |
| Offline support | Firebase offline persistence: `enableIndexedDbPersistence(db)` |

---

## 🎯 IMPLEMENTATION ORDER

1. **Fix all 12 bugs** — especially the hook crash in `user.tsx`
2. **Move Firebase config to `.env`**
3. **Add Firestore security rules**
4. **Fix kitchen delete guard** (VIP + online only)
5. **Fix Expo Go login** (hide Google button, add Forgot Password)
6. **Rebuild kitchen tab 3** (Profile section with logout)
7. **Create `profile.tsx`** screen
8. **Add order status colors** in user screen
9. **Add empty states with icons**
10. **Deploy Cloud Functions** for auto-cancel
11. **Add push notifications**
12. **Add image upload** (replace URL input)
13. **EAS build + deploy**

---

*Generated for: KHAJA Food Delivery App | Stack: Expo Router + Firebase | Target: Production-ready*
