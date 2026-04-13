import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '../src/constants/firebase';

const theme = {
    bg: '#0A0A0A',
    card: '#1C1C1E',
    primary: '#007AFF',
    text: '#F2F2F7',
    secondaryText: '#8E8E93',
    white: '#FFFFFF',
    red: '#FF3B30',
};

export default function UnverifiedScreen() {
    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="time-outline" size={100} color={theme.primary} />
                </View>

                <Text style={styles.title}>Account Under Review</Text>

                <Text style={styles.description}>
                    Your account is currently being reviewed by our team.
                    You will receive access once the verification process is complete.
                </Text>

                <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={24} color={theme.secondaryText} />
                    <Text style={styles.infoText}>
                        This usually takes less than 24 hours.
                    </Text>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: theme.secondaryText,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 48,
        width: '100%',
        gap: 12,
    },
    infoText: {
        color: theme.text,
        fontSize: 14,
        fontWeight: '500',
    },
    logoutButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        backgroundColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    logoutButtonText: {
        color: theme.red,
        fontSize: 18,
        fontWeight: '700',
    },
});
