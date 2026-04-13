import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../src/constants/firebase';

const theme = {
    bg: '#000000',
    card: '#1C1C1E',
    primary: '#FF3B30', // Red for alert/banned
    accent: '#007AFF', // Blue for actions
    text: '#FFFFFF',
    secondaryText: '#A7A7AD',
    success: '#34C759',
};

export default function Banned() {
    const [loading, setLoading] = useState(false);

    const handleResendEmail = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            await sendEmailVerification(auth.currentUser);
            Alert.alert('Email Sent', 'A verification link has been sent to your email. Please check your inbox and spam folder.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    banned: false,
                    banReason: null
                });
                Alert.alert('Success', 'Your account has been unbanned! Redirecting...');
                // The _layout snapshot will automatically handle redirection
            } else {
                Alert.alert(
                    'Still Unverified',
                    "We couldn't verify your email yet. Please find the mail from Khaja and click the link. Double-check your Spam folder!"
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        signOut(auth).then(() => router.replace('/login'));
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="alert-circle" size={80} color={theme.primary} />
                </View>

                <Text style={styles.title}>Account Restricted</Text>
                <Text style={styles.subtitle}>
                    Your account has been temporarily restricted because your email was not verified within the 72-hour window.
                </Text>

                <View style={styles.card}>
                    <Ionicons name="mail-open-outline" size={24} color={theme.accent} style={styles.cardIcon} />
                    <View style={styles.cardTextContainer}>
                        <Text style={styles.cardTitle}>How to Unrestrict:</Text>
                        <Text style={styles.cardDescription}>
                            1. Look for a verification email from Khaja.
                        </Text>
                        <Text style={styles.cardDescription}>
                            2. Click the link inside the email.
                        </Text>
                        <Text style={[styles.cardDescription, { fontWeight: '700', color: theme.primary }]}>
                            3. If you don't see it, check your SPAM folder!
                        </Text>
                    </View>
                </View>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleCheckVerification}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                                <Text style={styles.buttonText}>I've Verified My Email</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleResendEmail}
                        disabled={loading}
                    >
                        <Ionicons name="send-outline" size={20} color={theme.accent} />
                        <Text style={[styles.buttonText, { color: theme.accent }]}>Resend Verification Email</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Back to Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: theme.secondaryText,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    card: {
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        flexDirection: 'row',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardIcon: {
        marginRight: 16,
        marginTop: 2,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        color: theme.secondaryText,
        marginBottom: 6,
        lineHeight: 20,
    },
    buttonGroup: {
        width: '100%',
        gap: 16,
    },
    button: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryButton: {
        backgroundColor: theme.success,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.accent,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    logoutButton: {
        marginTop: 32,
        padding: 10,
    },
    logoutText: {
        color: theme.secondaryText,
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});