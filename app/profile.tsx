import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Image,
} from 'react-native';
import { auth, db } from '../src/constants/firebase';
import { clearSession } from '../src/services/authService';

const theme = {
    pageBg: '#0A0A0A',
    card: '#1C1C1E',
    input: '#2C2C2E',
    text: '#F2F2F7',
    white: '#FFFFFF',
    secondaryText: '#8E8E93',
    blue: '#007AFF',
    red: '#FF3B30',
    gray: '#48484A',
    radius: 14,
    pad: 16,
};

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uid, setUid] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [role, setRole] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [photoURL, setPhotoURL] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace('/login');
                return;
            }
            setUid(user.uid);
            setEmail(user.email || '');
            setPhotoURL(user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`);

            try {
                const uref = doc(db, 'users', user.uid);
                const usnap = await getDoc(uref);
                if (usnap.exists()) {
                    const d = usnap.data();
                    setName(d.preferredName || '');
                    setPhone(d.phone || '');
                    setAddress(d.address || '');
                    setRole(d.role || '');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        setSaving(true);
        try {
            const uref = doc(db, 'users', uid);
            await updateDoc(uref, {
                preferredName: name.trim(),
                phone: phone.trim(),
                address: address.trim(),
                updatedAt: serverTimestamp(),
            });

            if (role === 'kitchen') {
                const kref = doc(db, 'kitchens', uid);
                await updateDoc(kref, {
                    preferredName: name.trim(),
                    address: address.trim(),
                    updatedAt: serverTimestamp(),
                }).catch(() => { });
            }

            Alert.alert('Success', 'Profile updated');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        try {
            await updatePassword(auth.currentUser!, newPassword);
            Alert.alert('Success', 'Password updated');
            setNewPassword('');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleLogout = async () => {
        await clearSession();
        await signOut(auth);
        router.replace('/login');
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.blue} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.pageBg }}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={theme.white} />
                    </Pressable>
                    <Text style={styles.title}>Account</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* AVATAR & BASIC INFO */}
                <View style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
                    <View style={styles.avatarContainer}>
                        {photoURL ? (
                            <Image
                                source={{ uri: photoURL }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={40} color={theme.secondaryText} />
                            </View>
                        )}
                    </View>
                    <Text style={styles.profileName}>{name || 'Khaja User'}</Text>
                    <Text style={styles.profileRole}>{role.toUpperCase()}</Text>

                    <View style={styles.uidBox}>
                        <Text style={styles.uidLabel}>UID: {uid}</Text>
                        <Pressable onPress={() => Alert.alert('UID', uid)} hitSlop={10}>
                            <Ionicons name="copy-outline" size={14} color={theme.secondaryText} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Profile Details</Text>

                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your Name"
                        placeholderTextColor={theme.secondaryText}
                    />

                    <Text style={styles.label}>Email (Linked)</Text>
                    <TextInput
                        style={[styles.input, { opacity: 0.6 }]}
                        value={email}
                        editable={false}
                        placeholderTextColor={theme.secondaryText}
                    />

                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="e.g. 9800000000"
                        keyboardType="phone-pad"
                        placeholderTextColor={theme.secondaryText}
                    />

                    <Text style={styles.label}>Default Delivery Address</Text>
                    <TextInput
                        style={styles.input}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="e.g. Itahari-4, College Road"
                        placeholderTextColor={theme.secondaryText}
                        multiline
                    />

                    <Pressable
                        style={[styles.mainBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Update Profile</Text>}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Security & Account</Text>

                    <Text style={styles.label}>Change Password</Text>
                    <View style={{ gap: 10 }}>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new 6+ char password"
                            secureTextEntry
                            placeholderTextColor={theme.secondaryText}
                        />
                        <Pressable
                            style={[styles.mainBtn, { backgroundColor: theme.gray, marginTop: 0 }]}
                            onPress={handleUpdatePassword}
                        >
                            <Text style={styles.mainBtnText}>Update Password</Text>
                        </Pressable>
                    </View>

                    <View style={{ height: 1, backgroundColor: '#2C2C2E', marginVertical: 20 }} />

                    <Pressable
                        style={[styles.mainBtn, { backgroundColor: theme.red, marginTop: 0 }]}
                        onPress={handleLogout}
                    >
                        <Text style={styles.mainBtnText}>Sign Out</Text>
                    </Pressable>
                </View>

                <Text style={styles.version}>Khaja App v1.0.4 • Made with ❤️</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        backgroundColor: theme.pageBg,
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.white,
    },
    card: {
        backgroundColor: theme.card,
        borderRadius: theme.radius,
        padding: theme.pad,
        marginBottom: 20,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.gray,
        marginBottom: 15,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: theme.blue,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.white,
        marginBottom: 4,
    },
    profileRole: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.blue,
        letterSpacing: 1,
        marginBottom: 15,
    },
    uidBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.input,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    uidLabel: {
        color: theme.secondaryText,
        fontSize: 11,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.white,
        marginBottom: 15,
    },
    label: {
        color: theme.secondaryText,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: theme.input,
        borderRadius: 10,
        padding: 14,
        color: theme.text,
        fontSize: 16,
    },
    mainBtn: {
        backgroundColor: theme.blue,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    mainBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    version: {
        color: theme.secondaryText,
        textAlign: 'center',
        marginTop: 40,
        fontSize: 12,
        paddingBottom: 20,
    },
});
