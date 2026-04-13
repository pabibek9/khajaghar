import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../src/constants/firebase';

const theme = {
    bg: '#0A0A0A',
    card: '#1C1C1E',
    primary: '#007AFF',
    text: '#F2F2F7',
    secondaryText: '#8E8E93',
    green: '#34C759',
    red: '#FF3B30',
    input: '#2C2C2E',
};

export default function LocationSelectorWeb() {
    const [address, setAddress] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'locating' | 'success' | 'denied' | 'error'>('locating');

    useEffect(() => {
        loadSaved();
        autoDetect();
    }, []);

    const loadSaved = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (!snap.exists()) return;
            const d = snap.data() as any;
            if (d?.addressDetails?.street) setStreet(d.addressDetails.street);
            if (d?.addressDetails?.city) setCity(d.addressDetails.city);
            if (d?.addressDetails?.postalCode) setPostalCode(d.addressDetails.postalCode);
            if (d?.address) setAddress(d.address);
            if (d?.location?.lat) setCoords({ lat: d.location.lat, lng: d.location.lng });
        } catch (_) { }
    };

    // Strategy: Try browser GPS first (accurate), fall back to IP-based (instant, no permission)
    const autoDetect = () => {
        setStatus('locating');

        // Try browser GPS (works if user allows)
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCoords({ lat: latitude, lng: longitude });
                    await reverseGeocode(latitude, longitude);
                    setStatus('success');
                },
                () => {
                    // GPS denied/failed → use IP location as instant fallback
                    detectByIP();
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
            );
        } else {
            detectByIP();
        }
    };

    // IP-based geolocation — no permission needed, works instantly
    const detectByIP = async () => {
        try {
            const res = await fetch('http://ip-api.com/json/?fields=status,city,regionName,country,zip,lat,lon,org');
            const data = await res.json();
            if (data.status !== 'success') throw new Error('Failed');
            const lat = data.lat;
            const lng = data.lon;
            setCoords({ lat, lng });
            // Use reverse geocode for street/neighbourhood detail
            await reverseGeocode(lat, lng);
            setStatus('success');
        } catch (_) {
            try {
                const r2 = await fetch('https://ipinfo.io/json?token=');
                const d2 = await r2.json();
                if (d2.city) {
                    const [lat, lng] = (d2.loc || '0,0').split(',').map(Number);
                    setCoords({ lat, lng });
                    await reverseGeocode(lat, lng);
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            } catch {
                setStatus('error');
            }
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const json = await res.json();
            const a = json.address || {};
            const s = a.road || a.neighbourhood || a.suburb || '';
            const c = a.city || a.town || a.village || a.county || '';
            const p = a.postcode || '';
            const country = a.country || '';
            const full = json.display_name || `${s}, ${c}, ${country}`.replace(/(^[, ]|[, ]$)/g, '');
            setStreet(s);
            setCity(c);
            setPostalCode(p);
            setAddress(full);
        } catch (_) { }
    };

    const handleConfirm = async () => {
        const fullAddr = address || [street, city, postalCode].filter(Boolean).join(', ');
        if (!fullAddr) {
            Alert.alert('No Address', 'Please wait for detection or edit the fields manually.');
            return;
        }
        const user = auth.currentUser;
        if (!user) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                address: fullAddr,
                ...(coords ? { location: { lat: coords.lat, lng: coords.lng } } : {}),
                addressDetails: { street, city, postalCode },
                locationUpdatedAt: serverTimestamp(),
            });
            router.back();
        } catch (e: any) {
            Alert.alert('Save Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Delivery Location</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>

                    {/* Status bar */}
                    {status === 'locating' && (
                        <View style={styles.banner}>
                            <ActivityIndicator color={theme.primary} size="small" />
                            <Text style={styles.bannerText}>Detecting your location…</Text>
                        </View>
                    )}
                    {status === 'success' && (
                        <View style={[styles.banner, styles.successBanner]}>
                            <Ionicons name="checkmark-circle" size={18} color={theme.green} />
                            <Text style={[styles.bannerText, { color: theme.green }]}>
                                Location detected! You can edit any field below.
                            </Text>
                        </View>
                    )}
                    {(status === 'denied' || status === 'error') && (
                        <View style={[styles.banner, styles.errorBanner]}>
                            <Ionicons name="alert-circle-outline" size={18} color={theme.red} />
                            <Text style={[styles.bannerText, { color: theme.red, flex: 1 }]}>
                                Auto-detection failed. Please enter your address below.
                            </Text>
                        </View>
                    )}

                    <Text style={styles.cardTitle}>Your Delivery Address</Text>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Full Address</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 52 }]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Auto-filling…"
                            placeholderTextColor={theme.secondaryText}
                            multiline
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.fieldGroup, { flex: 2 }]}>
                            <Text style={styles.label}>Street / Area</Text>
                            <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="Street" placeholderTextColor={theme.secondaryText} />
                        </View>
                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Postal Code</Text>
                            <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="Postal" placeholderTextColor={theme.secondaryText} keyboardType="numeric" />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>City</Text>
                        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={theme.secondaryText} />
                    </View>

                    {/* Lat / Lng — read-only display */}
                    {coords && (
                        <View style={styles.coordsRow}>
                            <Ionicons name="navigate-outline" size={14} color={theme.secondaryText} />
                            <Text style={styles.coordsText}>
                                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.retryBtn} onPress={autoDetect}>
                        <Ionicons name="locate" size={16} color={theme.primary} />
                        <Text style={styles.retryText}>Re-detect Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.confirmBtn, !address && { opacity: 0.5 }]}
                        onPress={handleConfirm}
                        disabled={loading || status === 'locating'}
                    >
                        {loading
                            ? <ActivityIndicator color="white" />
                            : <Text style={styles.confirmBtnText}>Confirm Delivery Location</Text>
                        }
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    backButton: { padding: 8, borderRadius: 12, backgroundColor: theme.card },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginLeft: 12 },
    scrollContent: { padding: 20, alignItems: 'center' },
    card: {
        backgroundColor: theme.card, borderRadius: 20, padding: 24,
        width: '100%', maxWidth: 480, gap: 14,
        borderWidth: 1, borderColor: '#333',
    },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2C2C2E', borderRadius: 12, padding: 14 },
    errorBanner: { backgroundColor: 'rgba(255,59,48,0.10)' },
    successBanner: { backgroundColor: 'rgba(52,199,89,0.10)' },
    bannerText: { color: theme.secondaryText, fontSize: 13 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: theme.text },
    row: { flexDirection: 'row', gap: 10 },
    fieldGroup: { gap: 6 },
    label: { color: theme.secondaryText, fontSize: 12, fontWeight: '600', marginLeft: 4 },
    input: { backgroundColor: theme.input, color: theme.text, borderRadius: 12, padding: 14, fontSize: 14 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
    retryText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
    confirmBtn: { backgroundColor: theme.green, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    confirmBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
    coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
    coordsText: { color: theme.secondaryText, fontSize: 12, fontFamily: 'monospace' },
});
