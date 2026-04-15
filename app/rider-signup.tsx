// app/rider-signup.tsx
import React, { useState, useRef } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View, Animated, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/constants/firebase';
import { clearSession } from '../src/services/authService';

const theme = {
    bg: '#0A0A0A', card: '#1C1C1E', input: '#2C2C2E',
    primary: '#FF9500', text: '#F2F2F7', secondaryText: '#8E8E93',
    green: '#34C759', red: '#FF3B30', white: '#FFFFFF',
};

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Bicycle'];

export default function RiderSignup() {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [vehicle, setVehicle] = useState('Bike');
    const [citizenId, setCitizenId] = useState('');
    const [licenseUrl, setLicenseUrl] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [showSuccess, setShowSuccess] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    const handleSignup = async () => {
        if (!fullName.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
        if (!phone.trim()) { Alert.alert('Required', 'Please enter your phone number.'); return; }
        if (!email.trim()) { Alert.alert('Required', 'Please enter your email.'); return; }
        if (password.length < 6) { Alert.alert('Password', 'Password must be at least 6 characters.'); return; }

        setLoading(true);
        try {
            let uid = auth.currentUser?.uid;

            if (!uid) {
                // Not logged in, create new account
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                uid = cred.user.uid;
            } else if (auth.currentUser?.email !== email.trim()) {
                // Logged in as someone else? Force logout or error
                await clearSession();
                await signOut(auth);
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                uid = cred.user.uid;
            }

            const userDoc = {
                email: email.trim(),
                role: 'rider',
                approved: false,
                riderStatus: 'pending',
                banned: false,
                preferredName: fullName.trim(),
                phone: phone.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const riderDoc = {
                uid,
                name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                vehicleType: vehicle,
                citizenshipIdUrl: citizenId.trim() || null,
                licenseUrl: licenseUrl.trim() || null,
                photoUrl: photoUrl.trim() || null,
                approved: false,
                riderStatus: 'pending',
                totalDeliveries: 0,
                totalEarnings: 0,
                liveLocation: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'users', uid), userDoc);
            await setDoc(doc(db, 'riders', uid), riderDoc);

            // Show success animation
            setShowSuccess(true);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true })
            ]).start();

            // Wait 3 seconds, then sign out and go to login
            setTimeout(async () => {
                await clearSession();
                await signOut(auth);
                router.replace('/login');
            }, 3000);

        } catch (e: any) {
            Alert.alert('Registration Failed', e.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="chevron-back" size={22} color={theme.text} />
                        </TouchableOpacity>
                        <View style={styles.headerTextWrap}>
                            <Text style={styles.title}>Rider Registration</Text>
                            <Text style={styles.subtitle}>Join our delivery fleet</Text>
                        </View>
                    </View>

                    {/* Icon Hero */}
                    <View style={styles.iconHero}>
                        <Text style={styles.iconHeroText}>🚴</Text>
                        <Text style={styles.iconHeroSub}>Earn by delivering orders in your area</Text>
                    </View>

                    {/* Personal Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>

                        <Field label="Full Name" placeholder="Your legal full name" value={fullName} onChangeText={setFullName} icon="person-outline" />
                        <Field label="Phone Number" placeholder="+977 98XXXXXXXX" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" />
                        <Field label="Email Address" placeholder="rider@example.com" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />

                        <View style={styles.fieldWrap}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="At least 6 characters"
                                    placeholderTextColor={theme.secondaryText}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.secondaryText} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Vehicle Type */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vehicle Type</Text>
                        <View style={styles.vehicleRow}>
                            {VEHICLE_TYPES.map(v => (
                                <TouchableOpacity
                                    key={v}
                                    style={[styles.vehicleBtn, vehicle === v && styles.vehicleBtnActive]}
                                    onPress={() => setVehicle(v)}
                                >
                                    <Text style={styles.vehicleIcon}>
                                        {v === 'Bike' ? '🏍️' : v === 'Scooter' ? '🛵' : '🚲'}
                                    </Text>
                                    <Text style={[styles.vehicleLabel, vehicle === v && { color: theme.primary }]}>{v}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Documents */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Documents (Photo URLs)</Text>
                        <Text style={styles.docHint}>Upload your documents to Google Drive or Imgur and paste the public link below. These are required for admin approval.</Text>

                        <Field label="Profile Photo URL" placeholder="https://..." value={photoUrl} onChangeText={setPhotoUrl} icon="camera-outline" />
                        <Field label="Citizenship ID URL" placeholder="https://..." value={citizenId} onChangeText={setCitizenId} icon="card-outline" />
                        <Field label="Driving License URL" placeholder="https://..." value={licenseUrl} onChangeText={setLicenseUrl} icon="document-outline" />
                    </View>

                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
                        <Text style={styles.infoText}>
                            After registration, your account will be reviewed by admin before you can start accepting deliveries.
                        </Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                                <Text style={styles.submitText}>Register as Rider</Text>
                            </>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
                        <Text style={styles.loginLinkText}>Already registered? Sign in</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <Modal transparent visible={showSuccess} animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View style={[
                        styles.successCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}>
                        <View style={styles.successIconCircle}>
                            <Ionicons name="checkmark" size={50} color="#fff" />
                        </View>
                        <Text style={styles.successTitle}>Registration Sent!</Text>
                        <Text style={styles.successMsg}>
                            Your application is now being reviewed by our team.
                        </Text>
                        <View style={styles.loadingBarContainer}>
                            <Animated.View style={[styles.loadingBar, { width: '100%' }]} />
                        </View>
                        <Text style={styles.redirectText}>Redirecting to login...</Text>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function Field({ label, placeholder, value, onChangeText, icon, keyboardType = 'default' }: {
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: any,
    keyboardType?: any
}) {
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputRow}>
                <Ionicons name={icon} size={18} color={theme.secondaryText} style={{ marginLeft: 14 }} />
                <TextInput
                    style={[styles.input, { flex: 1, borderRadius: 0 }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.secondaryText}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: theme.card },
    headerTextWrap: { gap: 2 },
    title: { fontSize: 22, fontWeight: '800', color: theme.text },
    subtitle: { fontSize: 13, color: theme.secondaryText },

    iconHero: { alignItems: 'center', marginBottom: 28, gap: 8 },
    iconHeroText: { fontSize: 56 },
    iconHeroSub: { color: theme.secondaryText, fontSize: 14, textAlign: 'center' },

    section: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },

    fieldWrap: { gap: 6 },
    label: { color: theme.secondaryText, fontSize: 12, fontWeight: '600', marginLeft: 4 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.input, borderRadius: 12, overflow: 'hidden',
    },
    input: {
        backgroundColor: theme.input, color: theme.text,
        padding: 14, fontSize: 15,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.input, borderRadius: 12 },
    eyeBtn: { padding: 14 },

    vehicleRow: { flexDirection: 'row', gap: 10 },
    vehicleBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 14,
        backgroundColor: theme.input, borderRadius: 12,
        borderWidth: 2, borderColor: 'transparent',
        gap: 6,
    },
    vehicleBtnActive: { borderColor: theme.primary, backgroundColor: 'rgba(255,149,0,0.10)' },
    vehicleIcon: { fontSize: 24 },
    vehicleLabel: { color: theme.secondaryText, fontSize: 13, fontWeight: '600' },

    docHint: { color: theme.secondaryText, fontSize: 12, lineHeight: 18 },

    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: 'rgba(255,149,0,0.12)', borderRadius: 12, padding: 14,
        marginBottom: 20,
    },
    infoText: { color: theme.primary, fontSize: 13, flex: 1, lineHeight: 20 },

    submitBtn: {
        backgroundColor: theme.primary, borderRadius: 16,
        height: 56, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10, marginBottom: 16,
    },
    submitText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    loginLink: { alignItems: 'center', paddingVertical: 8 },
    loginLinkText: { color: theme.secondaryText, fontSize: 14 },

    // Success Modal Styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center', alignItems: 'center', padding: 24
    },
    successCard: {
        backgroundColor: theme.card, borderRadius: 24, padding: 32,
        alignItems: 'center', width: '100%', maxWidth: 340,
        borderWidth: 1, borderColor: '#333'
    },
    successIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: theme.green, alignItems: 'center',
        justifyContent: 'center', marginBottom: 20,
        shadowColor: theme.green, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10
    },
    successTitle: {
        fontSize: 24, fontWeight: '800', color: theme.text,
        marginBottom: 12, textAlign: 'center'
    },
    successMsg: {
        fontSize: 15, color: theme.secondaryText,
        textAlign: 'center', lineHeight: 22, marginBottom: 24
    },
    loadingBarContainer: {
        width: '100%', height: 4, backgroundColor: '#333',
        borderRadius: 2, overflow: 'hidden', marginBottom: 16
    },
    loadingBar: { height: '100%', backgroundColor: theme.primary },
    redirectText: { fontSize: 13, color: theme.secondaryText, fontWeight: '600' }
});
