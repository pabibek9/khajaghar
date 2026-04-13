// app/rider/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Linking, Platform, Pressable,
    SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    collection, doc, getDoc, onSnapshot, orderBy, query,
    runTransaction, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { auth, db } from '../../src/constants/firebase';
import { useNotifications } from '../../src/components/NotificationProvider';
import NotificationBell from '../../src/components/NotificationBell';

// Safe module-level import — try/catch prevents crash if native module
// isn't registered (e.g. Expo Go with New Architecture mismatch).
let MapView: any = null;
let Marker: any = View;
let Polyline: any = View;
let PROVIDER_GOOGLE: any = 'google';

if (Platform.OS !== 'web') {
    try {
        const MapsModule = require('react-native-maps');
        MapView         = MapsModule.default;
        Marker          = MapsModule.Marker;
        Polyline        = MapsModule.Polyline;
        PROVIDER_GOOGLE = MapsModule.PROVIDER_GOOGLE;
    } catch (_) {
        // react-native-maps unavailable (Expo Go / emulator without Play Services)
        MapView = null;
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────
type RiderOrder = {
    id: string;
    itemName: string;
    total: number;
    status: string;
    userId: string;
    userName?: string | null;
    userPhone?: string | null;
    userAddress?: string | null;
    kitchenId?: string;
    kitchenName?: string;
    kitchenAddress?: string;
    kitchenLat?: number;
    kitchenLng?: number;
    riderId?: string;
    riderName?: string;
    deliveryLat?: number;
    deliveryLng?: number;
    createdAt?: any;
    assignedAt?: any;
    pickedUpAt?: any;
    onTheWayAt?: any;
    deliveredAt?: any;
};

type RiderProfile = {
    name: string;
    phone: string;
    email: string;
    vehicleType: string;
    photoUrl?: string;
    approved: boolean;
    riderStatus: string;
    totalDeliveries: number;
    totalEarnings: number;
};

// ─── Theme ───────────────────────────────────────────────────────────────────
const theme = {
    bg: '#0A0A0A', card: '#1C1C1E', input: '#2C2C2E',
    primary: '#FF9500', text: '#F2F2F7', secondaryText: '#8E8E93',
    green: '#34C759', red: '#FF3B30', blue: '#007AFF',
    white: '#FFFFFF', yellow: '#FFCC00', gray: '#48484A',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(n: number) { return `Rs. ${n.toLocaleString()}`; }

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: theme.yellow, approved: theme.green, suspended: theme.red,
        waiting_rider: theme.primary, assigned_to_rider: theme.blue,
        picked_up: theme.blue, on_the_way: theme.green, delivered: theme.gray,
        rider_cancel_requested: theme.yellow, rider_cancel_approved: theme.red,
        order_returned: theme.blue, rider_reported_not_returned: theme.red,
    };
    return (
        <View style={{ backgroundColor: map[status] ?? theme.gray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {status.replace(/_/g, ' ').toUpperCase()}
            </Text>
        </View>
    );
}

function Card({ children, style }: React.PropsWithChildren<{ style?: any }>) {
    return <View style={[styles.card, style]}>{children}</View>;
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <View style={styles.statBox}>
            <Ionicons name={icon as any} size={24} color={color} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Rider() {
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, 12);

    const [uid, setUid] = useState('');
    const { unreadCount } = useNotifications();
    const [profile, setProfile] = useState<RiderProfile | null>(null);
    const [tab, setTab] = useState<'dashboard' | 'available' | 'active' | 'earnings' | 'profile'>('dashboard');
    const [available, setAvailable] = useState<RiderOrder[]>([]);
    const [activeOrders, setActiveOrders] = useState<RiderOrder[]>([]);
    const [deliveredOrders, setDeliveredOrders] = useState<RiderOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [canceling, setCanceling] = useState<string | null>(null);
    const [riderCoords, setRiderCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    const locationWatcher = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    const mapRef = useRef<any>(null);
    const unsubAuthRef = useRef<(() => void) | null>(null);

    // Auto-center map on rider location or delivery location
    useEffect(() => {
        const activeOrder = activeOrders.find(o => ['assigned_to_rider', 'picked_up', 'on_the_way'].includes(o.status));
        if (activeOrder?.deliveryLat && activeOrder?.deliveryLng && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: activeOrder.deliveryLat,
                longitude: activeOrder.deliveryLng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        } else if (riderCoords && mapRef.current) {
            mapRef.current.animateToRegion({
                ...riderCoords,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    }, [riderCoords, activeOrders]);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ── Auth + profile ──────────────────────────────────────────────────────────
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            if (!u) { router.replace('/login'); return; }
            setUid(u.uid);

            // Watch rider profile
            const riderRef = doc(db, 'riders', u.uid);
            const unsubRider = onSnapshot(riderRef, (snap) => {
                if (snap.exists()) {
                    const d = snap.data() as any;
                    setProfile({
                        name: d.name || '',
                        phone: d.phone || '',
                        email: d.email || '',
                        vehicleType: d.vehicleType || 'Bike',
                        photoUrl: d.photoUrl || undefined,
                        approved: !!d.approved,
                        riderStatus: d.riderStatus || 'pending',
                        totalDeliveries: d.totalDeliveries || 0,
                        totalEarnings: d.totalEarnings || 0,
                    });
                } else {
                    // Critical: if role is rider but no rider doc, they need to sign up properly
                    Alert.alert("Profile Incomplete", "Your rider profile was not found. Please complete registration.");
                    router.replace('/rider-signup');
                }
            });

            // Available orders: waiting_rider
            const availQ = query(collection(db, 'orders'), where('status', '==', 'waiting_rider'));
            const unsubAvail = onSnapshot(availQ, (snap) => {
                setAvailable(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
            });

            // My active orders (including cancellation/return flows)
            const activeStatuses = [
                'assigned_to_rider', 'picked_up', 'on_the_way',
                'rider_cancel_requested', 'rider_cancel_approved', 'order_returned'
            ];
            const activeQ = query(
                collection(db, 'orders'),
                where('riderId', '==', u.uid)
            );
            const unsubActive = onSnapshot(activeQ, (snap) => {
                const allMine = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                setActiveOrders(allMine.filter(o => activeStatuses.includes(o.status)));
            }, (err) => {
                console.error("Active Orders Query Error:", err);
                Alert.alert("Sync Error", "Failed to sync active orders. " + err.message);
            });

            // My delivered orders for earnings
            const doneQ = query(
                collection(db, 'orders'),
                where('riderId', '==', u.uid)
            );
            const unsubDone = onSnapshot(doneQ, (snap) => {
                const allMine = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                const done = allMine.filter(o => ['delivered', 'rider_reported_not_returned'].includes(o.status));
                done.sort((a, b) => {
                    const aTime = a.deliveredAt?.toMillis ? a.deliveredAt.toMillis() : 0;
                    const bTime = b.deliveredAt?.toMillis ? b.deliveredAt.toMillis() : 0;
                    return bTime - aTime;
                });
                setDeliveredOrders(done);
            }, (err) => {
                console.error("Done Orders Query Error:", err);
            });

            return () => { unsubRider(); unsubAvail(); unsubActive(); unsubDone(); };
        });
        unsubAuthRef.current = unsubAuth;
        return () => { unsubAuth(); stopTracking(); };
    }, []);

    // ── GPS Tracking ────────────────────────────────────────────────────────────
    const startTracking = async () => {
        if (locationWatcher.current) return;
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            locationWatcher.current = await Location.watchPositionAsync(
                { 
                    accuracy: Location.Accuracy.BestForNavigation, 
                    timeInterval: 2000, 
                    distanceInterval: 5 
                },
                (pos) => {
                    if (!uid) return;
                    const coords = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    };
                    setRiderCoords(coords);
                    updateDoc(doc(db, 'riders', uid), {
                        liveLocation: {
                            lat: coords.latitude,
                            lng: coords.longitude,
                            timestamp: new Date().toISOString(),
                        },
                    }).catch(() => { });
                }
            );
        } catch (_) { }
    };

    const stopTracking = () => {
        if (locationWatcher.current) {
            locationWatcher.current.remove?.();
            locationWatcher.current = null;
        }
        if (uid) {
            updateDoc(doc(db, 'riders', uid), { liveLocation: null }).catch(() => { });
        }
    };

    // ── Order Actions ───────────────────────────────────────────────────────────
    const acceptOrder = async (order: RiderOrder) => {
        if (!profile?.approved) {
            Alert.alert('Not Approved', 'Your account is pending admin approval. Please wait.');
            return;
        }
        if (isAccepting) return; // Guard clause to prevent race conditions

        setIsAccepting(true);
        setAccepting(order.id);
        try {
            const ref = doc(db, 'orders', order.id);
            const snap = await getDoc(ref);
            if (!snap.exists()) throw new Error('Order not found');
            const data = snap.data() as any;
            if (data.status !== 'waiting_rider') throw new Error('Order already taken');
            
            await updateDoc(ref, {
                status: 'assigned_to_rider',
                riderId: uid,
                riderName: profile?.name || 'Rider',
                assignedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            await startTracking();
            setTab('active');
        } catch (e: any) {
            if (e.message === 'Order already taken') {
                Alert.alert('Too Slow!', 'Another rider already accepted this order.');
            } else {
                Alert.alert('Error', e.message);
            }
        } finally {
            setAccepting(null);
            setIsAccepting(false);
        }
    };

    async function updateOrderStatus(orderId: string, newStatus: string, extra?: Record<string, any>) {
        console.log(`[Rider] Updating Order ${orderId} to ${newStatus}`, extra);
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                ...extra,
                updatedAt: serverTimestamp(),
            });
            console.log(`[Rider] Order ${orderId} status updated successfully.`);
            
            if (newStatus === 'delivered') {
                stopTracking();
                // Update rider stats
                if (!uid) {
                    console.warn("[Rider] UID missing during stats update");
                    return;
                }
                const rRef = doc(db, 'riders', uid);
                const rSnap = await getDoc(rRef);
                if (rSnap.exists()) {
                    const rd = rSnap.data() as any;
                    const order = activeOrders.find(o => o.id === orderId);
                    const earnings = Math.round((order?.total || 0) * 0.1);
                    console.log(`[Rider] Updating stats: deliveries=${(rd.totalDeliveries || 0) + 1}, earnings=${(rd.totalEarnings || 0) + earnings}`);
                    await updateDoc(rRef, {
                        totalDeliveries: (rd.totalDeliveries || 0) + 1,
                        totalEarnings: (rd.totalEarnings || 0) + earnings,
                        liveLocation: null,
                    });
                }
            }
        } catch (e: any) {
            console.error(`[Rider] Update Failed for ${orderId}:`, e);
            Alert.alert('Update Failed', `Error: ${e.message}\nStatus: ${newStatus}`);
        }
    }

    const openMaps = (lat?: number, lng?: number, label?: string, address?: string) => {
        if (!lat || !lng) {
            if (address) {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                Linking.openURL(url).catch(() => {
                    Alert.alert("Error", "Could not open maps application.");
                });
            } else {
                Alert.alert("Location Missing", "No coordinates or address available for this location.");
            }
            return;
        }
        const url = Platform.OS === 'ios'
            ? `maps:?q=${label ?? 'Location'}&ll=${lat},${lng}`
            : `geo:${lat},${lng}?q=${lat},${lng}(${label ?? 'Location'})`;
        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
        });
    };


    async function requestCancellation(orderId: string) {
        const executeCancel = async () => {
            setCanceling(orderId);
            console.log(`[Rider] Requesting Cancellation for Order ${orderId}`);
            try {
                await updateDoc(doc(db, 'orders', orderId), {
                    status: 'rider_cancel_requested',
                    riderCancelAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                console.log(`[Rider] Cancellation requested successfully for ${orderId}`);
                if (Platform.OS !== 'web') Alert.alert('Requested', 'Waiting for kitchen to approve your cancellation.');
                else window.alert('Waiting for kitchen to approve your cancellation.');
            } catch (e: any) { 
                console.error(`[Rider] Cancellation Request Failed for ${orderId}:`, e);
                if (Platform.OS !== 'web') Alert.alert('Request Failed', e.message);
                else window.alert(`Request Failed: ${e.message}`);
            }
            finally { setCanceling(null); }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Request the kitchen to cancel this delivery. You must return the food if already picked up.')) {
                executeCancel();
            }
        } else {
            Alert.alert('Cancel Order?', 'Request the kitchen to cancel this delivery. You must return the food if already picked up.', [
                { text: 'Back', style: 'cancel' },
                { text: 'Request Cancel', style: 'destructive', onPress: executeCancel }
            ]);
        }
    }

    const logout = async () => {
        stopTracking();
        if (unsubAuthRef.current) {
            unsubAuthRef.current();
            unsubAuthRef.current = null;
        }
        await signOut(auth);
        router.replace('/login');
    };

    // ── Earnings calculation ────────────────────────────────────────────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayDeliveries = deliveredOrders.filter(o => {
        const d = o.deliveredAt?.toDate?.();
        return d && d >= today;
    });
    const todayEarnings = todayDeliveries.reduce((s, o) => s + Math.round((o.total) * 0.1), 0);
    const totalEarnings = profile?.totalEarnings ?? 0;
    const totalDeliveries = profile?.totalDeliveries ?? 0;

    // ── Pending approval screen ────────────────────────────────────────────────
    if (profile && !profile.approved) {
        return (
            <SafeAreaView style={[styles.container, { flex: 1 }]}>
                <View style={[styles.topBar, { alignItems: 'center', gap: 12 }]}>
                    <Text style={[styles.appName, { flex: 1 }]}>Khaja Rider</Text>
                    <NotificationBell 
                        count={unreadCount} 
                        onPress={() => setTab('active')} 
                        color={theme.text}
                    />
                    <TouchableOpacity onPress={logout} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="log-out-outline" size={18} color={theme.red} />
                        <Text style={{ color: theme.red, fontSize: 13, fontWeight: '600' }}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={styles.heroCircle}>
                        <Text style={{ fontSize: 64 }}>⏳</Text>
                    </View>
                    
                    <View style={styles.statusBadgeLive}>
                        <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                        <Text style={styles.statusBadgeTextLive}>UNDER REVIEW</Text>
                    </View>

                    <Text style={[styles.bigTitle, { marginTop: 20 }]}>Application Pending</Text>
                    <Text style={{ color: theme.secondaryText, textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 32, fontSize: 15 }}>
                        Your rider account is currently being reviewed by our administration team. This usually takes 24-48 hours. We'll notify you once you're ready to start delivering!
                    </Text>

                    <View style={{ width: '100%', gap: 12 }}>
                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4, marginLeft: 4 }}>SUBMITTED DETAILS</Text>
                        <View style={styles.pendingRow}>
                            <Ionicons name="person-circle-outline" size={22} color={theme.primary} />
                            <View>
                                <Text style={{ color: theme.secondaryText, fontSize: 11 }}>FULL NAME</Text>
                                <Text style={styles.pendingLabel}>{profile.name}</Text>
                            </View>
                        </View>
                        <View style={styles.pendingRow}>
                            <Ionicons name={profile.vehicleType === 'Bicycle' ? 'bicycle-outline' : 'car-outline'} size={22} color={theme.primary} />
                            <View>
                                <Text style={{ color: theme.secondaryText, fontSize: 11 }}>VEHICLE TYPE</Text>
                                <Text style={styles.pendingLabel}>{profile.vehicleType}</Text>
                            </View>
                        </View>
                        <View style={styles.pendingRow}>
                            <Ionicons name="mail-outline" size={22} color={theme.primary} />
                            <View>
                                <Text style={{ color: theme.secondaryText, fontSize: 11 }}>REGISTERED EMAIL</Text>
                                <Text style={styles.pendingLabel}>{profile.email}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.btn, { marginTop: 40, width: '100%', backgroundColor: '#262628' }]} 
                        onPress={() => Alert.alert('Contact Support', 'Please email support@khaja.com if you have any questions about your application.')}
                    >
                        <Ionicons name="help-circle-outline" size={20} color={theme.secondaryText} />
                        <Text style={[styles.btnText, { color: theme.secondaryText }]}>Need Help?</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.primary} size="large" />
            </SafeAreaView>
        );
    }

    // ── Screens ─────────────────────────────────────────────────────────────────
    const renderDashboard = () => (
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.greeting}>Hello, {profile.name.split(' ')[0]} 👋</Text>
            <StatusBadge status={profile.riderStatus} />

            <View style={styles.statsGrid}>
                <StatBox icon="today-outline" label="Today's Earnings" value={formatCurrency(todayEarnings)} color={theme.green} />
                <StatBox icon="bicycle-outline" label="Today's Deliveries" value={String(todayDeliveries.length)} color={theme.blue} />
                <StatBox icon="trophy-outline" label="Total Deliveries" value={String(totalDeliveries)} color={theme.primary} />
                <StatBox icon="wallet-outline" label="Total Earned" value={formatCurrency(totalEarnings)} color={theme.yellow} />
            </View>

            {activeOrders.length > 0 && (
                <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                    <Text style={styles.cardTitle}>🚀 Active Delivery</Text>
                    <Text style={styles.cardMeta}>{activeOrders[0].itemName}</Text>
                    <StatusBadge status={activeOrders[0].status} />
                    <TouchableOpacity style={[styles.btn, { marginTop: 12, backgroundColor: theme.primary }]} onPress={() => setTab('active')}>
                        <Text style={styles.btnText}>View Active Delivery</Text>
                    </TouchableOpacity>
                </Card>
            )}

            {available.length > 0 && (
                <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.yellow }}>
                    <Text style={styles.cardTitle}>🔔 {available.length} Order{available.length > 1 ? 's' : ''} Waiting!</Text>
                    <Text style={styles.cardMeta}>New delivery requests are available near you.</Text>
                    <TouchableOpacity style={[styles.btn, { marginTop: 12, backgroundColor: theme.yellow }]} onPress={() => setTab('available')}>
                        <Text style={[styles.btnText, { color: '#000' }]}>View Available Orders</Text>
                    </TouchableOpacity>
                </Card>
            )}
        </ScrollView>
    );

    const renderAvailable = () => (
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>Available Orders ({available.length})</Text>
            {available.length === 0 && (
                <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                    <Text style={styles.emptyText}>No available orders right now.</Text>
                    <Text style={[styles.emptyText, { fontSize: 13, marginTop: 6 }]}>New ones will appear here instantly.</Text>
                </View>
            )}
            {available.map(order => (
                <Card key={order.id} style={{ gap: 10 }}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>{order.itemName}</Text>
                        <Text style={[styles.cardTitle, { color: theme.green }]}>{formatCurrency(order.total)}</Text>
                    </View>
                    <View style={{ gap: 4 }}>
                        <Text style={styles.cardMeta}>👤 {order.userName || 'Customer'}</Text>
                        <Text style={styles.cardMeta}>📞 {order.userPhone || 'N/A'}</Text>
                        <Text style={styles.cardMeta}>🏠 {order.userAddress || 'N/A'}</Text>
                        {order.kitchenName && <Text style={styles.cardMeta}>🍽️ Kitchen: {order.kitchenName}</Text>}
                        {order.kitchenAddress && <Text style={styles.cardMeta}>📍 Pickup: {order.kitchenAddress}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {order.kitchenLat && (
                            <TouchableOpacity style={[styles.iconBtn]} onPress={() => openMaps(order.kitchenLat, order.kitchenLng, 'Kitchen')}>
                                <Ionicons name="navigate-outline" size={16} color={theme.blue} />
                                <Text style={[styles.iconBtnText, { color: theme.blue }]}>Kitchen Map</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.iconBtn]} 
                            onPress={() => openMaps(undefined, undefined, 'Delivery Address', order.userAddress || undefined)}
                        >
                            <Ionicons name="search-outline" size={16} color={theme.green} />
                            <Text style={[styles.iconBtnText, { color: theme.green }]}>Search Address</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.primary }, (isAccepting || activeOrders.length > 0) && { opacity: 0.6 }]}
                        onPress={() => acceptOrder(order)}
                        disabled={isAccepting || activeOrders.length > 0}
                    >
                        {accepting === order.id
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                <Text style={styles.btnText}>
                                    {activeOrders.length > 0 ? 'Finish Current Delivery First' : 'Accept Delivery'}
                                </Text>
                            </>
                        }
                    </TouchableOpacity>
                </Card>
            ))}
        </ScrollView>
    );

    const renderActive = () => (
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>Active Delivery</Text>
            {activeOrders.length === 0 && (
                <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>✅</Text>
                    <Text style={styles.emptyText}>No active deliveries.</Text>
                    <Text style={[styles.emptyText, { fontSize: 13, marginTop: 6 }]}>Accept an order to start delivering.</Text>
                </View>
            )}
            {activeOrders.map(order => (
                <Card key={order.id} style={{ gap: 12, padding: 0, overflow: 'hidden' }}>
                    {/* Real-time Map Section */}
                    <View style={{ height: 200, width: '100%', backgroundColor: '#262628' }}>
                        {Platform.OS !== 'web' && MapView ? (
                            <>
                                <MapView
                                    ref={mapRef}
                                    style={{ flex: 1 }}
                                    initialRegion={{
                                        latitude: riderCoords?.latitude || order.kitchenLat || 27.7172,
                                        longitude: riderCoords?.longitude || order.kitchenLng || 85.324,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    }}
                                    showsUserLocation
                                    followsUserLocation
                                >
                                    {riderCoords && (
                                        <Marker
                                            coordinate={riderCoords}
                                            title="You (Rider)"
                                            pinColor={theme.primary}
                                        >
                                            <View style={styles.riderMarker}>
                                                <Ionicons name="bicycle" size={20} color="#fff" />
                                            </View>
                                        </Marker>
                                    )}
                                    {order.kitchenLat && order.kitchenLng && (
                                        <Marker
                                            coordinate={{ latitude: order.kitchenLat, longitude: order.kitchenLng }}
                                            title="Kitchen (Pickup)"
                                            pinColor={theme.yellow}
                                        />
                                    )}
                                    {order.deliveryLat && order.deliveryLng && (
                                        <Marker
                                            coordinate={{ latitude: order.deliveryLat, longitude: order.deliveryLng }}
                                            title="Customer (Delivery)"
                                            pinColor={theme.green}
                                        />
                                    )}
                                    {riderCoords && order.kitchenLat && order.kitchenLng && (
                                        <Polyline
                                            coordinates={[
                                                riderCoords,
                                                { latitude: order.kitchenLat, longitude: order.kitchenLng }
                                            ]}
                                            strokeColor={theme.primary}
                                            strokeWidth={3}
                                        />
                                    )}
                                    {order.kitchenLat && order.kitchenLng && order.deliveryLat && order.deliveryLng && (
                                        <Polyline
                                            coordinates={[
                                                { latitude: order.kitchenLat, longitude: order.kitchenLng },
                                                { latitude: order.deliveryLat, longitude: order.deliveryLng }
                                            ]}
                                            strokeColor={theme.green}
                                            strokeWidth={3}
                                            lineDashPattern={[5, 5]}
                                        />
                                    )}
                                </MapView>
                                <TouchableOpacity
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: 50, 
                                        right: 10, 
                                        backgroundColor: 'rgba(0,0,0,0.6)', 
                                        padding: 8, 
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.2)'
                                    }}
                                    onPress={() => {
                                        if (order.deliveryLat && order.deliveryLng && mapRef.current) {
                                            mapRef.current.animateToRegion({
                                                latitude: order.deliveryLat,
                                                longitude: order.deliveryLng,
                                                latitudeDelta: 0.005,
                                                longitudeDelta: 0.005,
                                            }, 800);
                                        } else {
                                            Alert.alert("No Location", "Customer location coordinate not found. Try searching address.");
                                        }
                                    }}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                        <Ionicons name="person" size={16} color={theme.green} />
                                        <Text style={{color: '#fff', fontSize: 10, fontWeight: '700'}}>USER</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: 10, 
                                        right: 10, 
                                        backgroundColor: 'rgba(0,0,0,0.6)', 
                                        padding: 8, 
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.2)'
                                    }}
                                    onPress={() => {
                                        if (riderCoords && mapRef.current) {
                                            mapRef.current.animateToRegion({
                                                ...riderCoords,
                                                latitudeDelta: 0.005,
                                                longitudeDelta: 0.005,
                                            }, 800);
                                        }
                                    }}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                        <Ionicons name="bicycle" size={16} color={theme.primary} />
                                        <Text style={{color: '#fff', fontSize: 10, fontWeight: '700'}}>YOU</Text>
                                    </View>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Ionicons name="map-outline" size={40} color={theme.gray} />
                                <Text style={{ color: theme.secondaryText, fontSize: 13 }}>Interactive Map unavailable on Web</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ padding: 16, gap: 12 }}>
                        <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>{order.itemName}</Text>
                        <StatusBadge status={order.status} />
                    </View>

                    {/* Customer Info */}
                    <View style={[styles.infoBox, { borderLeftColor: theme.green }]}>
                        <Text style={styles.infoBoxTitle}>Customer</Text>
                        <Text style={styles.cardMeta}>👤 {order.userName || 'N/A'}</Text>
                        <Text style={styles.cardMeta}>📞 {order.userPhone || 'N/A'}</Text>
                        <Text style={styles.cardMeta}>🏠 {order.userAddress || 'N/A'}</Text>
                    </View>

                    {/* Kitchen Info */}
                    <View style={[styles.infoBox, { borderLeftColor: theme.primary }]}>
                        <Text style={styles.infoBoxTitle}>Pickup Location</Text>
                        {order.kitchenName && <Text style={styles.cardMeta}>🍽️ {order.kitchenName}</Text>}
                        {order.kitchenAddress && <Text style={styles.cardMeta}>📍 {order.kitchenAddress}</Text>}
                    </View>

                    {/* Navigation Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {order.kitchenLat && (
                            <TouchableOpacity style={[styles.iconBtn, { flex: 1 }]} onPress={() => openMaps(order.kitchenLat, order.kitchenLng, 'Kitchen')}>
                                <Ionicons name="navigate" size={16} color={theme.primary} />
                                <Text style={[styles.iconBtnText, { color: theme.primary }]}>Navigate to Kitchen</Text>
                            </TouchableOpacity>
                        )}
                        {order.deliveryLat ? (
                            <TouchableOpacity style={[styles.iconBtn, { flex: 1 }]} onPress={() => openMaps(order.deliveryLat, order.deliveryLng, 'Customer')}>
                                <Ionicons name="navigate" size={16} color={theme.green} />
                                <Text style={[styles.iconBtnText, { color: theme.green }]}>Navigate to Customer</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.iconBtn, { flex: 1 }]} onPress={() => openMaps(undefined, undefined, 'Customer', order.userAddress || undefined)}>
                                <Ionicons name="search" size={16} color={theme.green} />
                                <Text style={[styles.iconBtnText, { color: theme.green }]}>Find Customer Location</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={{ gap: 8, marginTop: 4 }}>
                        {order.status === 'assigned_to_rider' && (
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: theme.blue }]}
                                onPress={() => updateOrderStatus(order.id, 'picked_up', { pickedUpAt: serverTimestamp() })}
                            >
                                <Ionicons name="bag-check-outline" size={18} color="#fff" />
                                <Text style={styles.btnText}>✅ Picked Up Order</Text>
                            </TouchableOpacity>
                        )}
                        {order.status === 'picked_up' && (
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                    startTracking();
                                    updateOrderStatus(order.id, 'on_the_way', { onTheWayAt: serverTimestamp() });
                                }}
                            >
                                <Ionicons name="bicycle-outline" size={18} color="#fff" />
                                <Text style={styles.btnText}>🚴 Start Delivery</Text>
                            </TouchableOpacity>
                        )}
                        {order.status === 'on_the_way' && (
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: theme.green }]}
                                onPress={() => {
                                    if (Platform.OS === 'web') {
                                        const confirmed = window.confirm('Mark this order as delivered to the customer?');
                                        if (confirmed) {
                                            updateOrderStatus(order.id, 'delivered', { deliveredAt: serverTimestamp() });
                                        }
                                    } else {
                                        Alert.alert('Confirm Delivery', 'Mark this order as delivered to the customer?', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delivered!', onPress: () => updateOrderStatus(order.id, 'delivered', { deliveredAt: serverTimestamp() }) },
                                        ]);
                                    }
                                }}
                            >
                                <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                                <Text style={styles.btnText}>🏁 Mark as Delivered</Text>
                            </TouchableOpacity>
                        )}

                        {/* Cancellation Request Section */}
                        {['assigned_to_rider', 'picked_up', 'on_the_way'].includes(order.status) && (
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: '#262628', borderWidth: 1, borderColor: theme.red }]}
                                onPress={() => requestCancellation(order.id)}
                                disabled={canceling === order.id}
                            >
                                <Ionicons name="close-circle-outline" size={18} color={theme.red} />
                                <Text style={[styles.btnText, { color: theme.red }]}>Request Cancellation</Text>
                            </TouchableOpacity>
                        )}

                        {order.status === 'rider_cancel_requested' && (
                            <View style={[styles.infoBox, { borderLeftColor: theme.yellow, backgroundColor: 'rgba(255,204,0,0.1)' }]}>
                                <Text style={{ color: theme.yellow, fontWeight: '700', textAlign: 'center' }}>⏳ Cancellation Requested</Text>
                                <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center' }}>Waiting for kitchen to approve...</Text>
                            </View>
                        )}

                        {order.status === 'rider_cancel_approved' && (
                            <View style={{ gap: 8 }}>
                                <View style={[styles.infoBox, { borderLeftColor: theme.red, backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                                    <Text style={{ color: theme.red, fontWeight: '700', textAlign: 'center' }}>⚠️ Return Food to Kitchen</Text>
                                    <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center' }}>Kitchen approved. Please return the items immediately.</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: theme.primary }]}
                                    onPress={() => updateOrderStatus(order.id, 'order_returned', { returnedAt: serverTimestamp() })}
                                >
                                    <Ionicons name="reload-outline" size={18} color="#fff" />
                                    <Text style={styles.btnText}>📦 Mark as Returned</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {order.status === 'order_returned' && (
                            <View style={[styles.infoBox, { borderLeftColor: theme.blue, backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                                <Text style={{ color: theme.blue, fontWeight: '700', textAlign: 'center' }}>🔄 Return Pending Confirmation</Text>
                                <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center' }}>Waiting for kitchen to confirm receipt.</Text>
                            </View>
                        )}
                    </View>

                        <Text style={[styles.cardMeta, { textAlign: 'center', marginTop: 8 }]}>
                            💰 Delivery Earnings: {formatCurrency(Math.round(order.total * 0.1))}
                        </Text>
                    </View>
                </Card>
            ))}
        </ScrollView>
    );

    const renderEarnings = () => (
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>Earnings Overview</Text>

            <View style={styles.statsGrid}>
                <StatBox icon="today-outline" label="Today's Earnings" value={formatCurrency(todayEarnings)} color={theme.green} />
                <StatBox icon="calendar-outline" label="Today's Deliveries" value={String(todayDeliveries.length)} color={theme.blue} />
                <StatBox icon="wallet-outline" label="Total Earned" value={formatCurrency(totalEarnings)} color={theme.primary} />
                <StatBox icon="bicycle-outline" label="Total Deliveries" value={String(totalDeliveries)} color={theme.yellow} />
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 8 }]}>Delivery History</Text>
            {deliveredOrders.length === 0 && (
                <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>📊</Text>
                    <Text style={styles.emptyText}>No deliveries yet.</Text>
                    <Text style={[styles.emptyText, { fontSize: 13 }]}>Your completed deliveries will appear here.</Text>
                </View>
            )}
            {deliveredOrders.slice(0, 30).map(order => {
                const deliveredDate = order.deliveredAt?.toDate?.();
                return (
                    <Card key={order.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.deliveryDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{order.itemName}</Text>
                            <Text style={styles.cardMeta}>{order.userName || 'Customer'}</Text>
                            {deliveredDate && (
                                <Text style={[styles.cardMeta, { fontSize: 11 }]}>
                                    {deliveredDate.toLocaleDateString()} {deliveredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.green }]}>+{formatCurrency(Math.round(order.total * 0.1))}</Text>
                    </Card>
                );
            })}
        </ScrollView>
    );

    const renderProfile = () => (
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Card style={{ alignItems: 'center', gap: 10 }}>
                <View style={styles.avatarCircle}>
                    <Text style={{ fontSize: 36 }}>
                        {profile.vehicleType === 'Bicycle' ? '🚲' : profile.vehicleType === 'Scooter' ? '🛵' : '🏍️'}
                    </Text>
                </View>
                <Text style={[styles.cardTitle, { fontSize: 20 }]}>{profile.name}</Text>
                <StatusBadge status={profile.riderStatus} />
                <Text style={styles.cardMeta}>{profile.email}</Text>
                <Text style={styles.cardMeta}>📞 {profile.phone}</Text>
                <Text style={styles.cardMeta}>🚗 {profile.vehicleType}</Text>
            </Card>

            <Card>
                <Text style={styles.cardTitle}>Statistics</Text>
                <View style={{ gap: 6, marginTop: 8 }}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardMeta}>Total Deliveries</Text>
                        <Text style={[styles.cardMeta, { color: theme.text, fontWeight: '700' }]}>{totalDeliveries}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardMeta}>Total Earned</Text>
                        <Text style={[styles.cardMeta, { color: theme.green, fontWeight: '700' }]}>{formatCurrency(totalEarnings)}</Text>
                    </View>
                </View>
            </Card>

            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.red }]} onPress={logout}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // ── Bottom Nav ──────────────────────────────────────────────────────────────
    const TABS = [
        { key: 'dashboard', icon: 'home-outline', label: 'Home' },
        { key: 'available', icon: 'list-outline', label: 'Orders', badge: available.length },
        { key: 'active', icon: 'bicycle-outline', label: 'Active', badge: activeOrders.length },
        { key: 'earnings', icon: 'wallet-outline', label: 'Earnings' },
        { key: 'profile', icon: 'person-outline', label: 'Profile' },
    ] as const;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.topBar, { alignItems: 'center', gap: 12 }]}>
                <Text style={[styles.appName, { flex: 1 }]}>Khaja Rider</Text>
                <NotificationBell 
                    count={unreadCount} 
                    onPress={() => setTab('active')} 
                    color={theme.text}
                />
                <StatusBadge status={profile.riderStatus} />
            </View>

            <View style={{ flex: 1 }}>
                {tab === 'dashboard' && renderDashboard()}
                {tab === 'available' && renderAvailable()}
                {tab === 'active' && renderActive()}
                {tab === 'earnings' && renderEarnings()}
                {tab === 'profile' && renderProfile()}
            </View>

            <View style={[styles.bottomNav, { paddingBottom: bottomPad }]}>
                {TABS.map(t => {
                    const active = tab === t.key;
                    return (
                        <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
                            <View>
                                <Ionicons name={t.icon as any} size={24} color={active ? theme.primary : theme.gray} />
                                {(t as any).badge > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{(t as any).badge}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.tabLabel, active && { color: theme.primary }]}>{t.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: '#333',
    },
    appName: { fontSize: 18, fontWeight: '800', color: theme.primary },

    tabContent: { padding: 16, gap: 14, paddingBottom: 100 },
    greeting: { fontSize: 22, fontWeight: '800', color: theme.text },
    bigTitle: { fontSize: 24, fontWeight: '800', color: theme.text, textAlign: 'center' },
    sectionHeader: { fontSize: 18, fontWeight: '700', color: theme.text },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
    statBox: {
        flex: 1, minWidth: '43%',
        backgroundColor: theme.card, borderRadius: 14,
        padding: 16, alignItems: 'center', gap: 6,
    },
    statValue: { fontSize: 20, fontWeight: '800', color: theme.text },
    statLabel: { fontSize: 11, color: theme.secondaryText, textAlign: 'center' },

    card: {
        backgroundColor: theme.card, borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    cardMeta: { fontSize: 14, color: theme.secondaryText, lineHeight: 20 },

    infoBox: { backgroundColor: '#262628', borderRadius: 12, padding: 12, borderLeftWidth: 3, gap: 4 },
    infoBoxTitle: { fontSize: 12, fontWeight: '700', color: theme.secondaryText, marginBottom: 4 },

    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, borderRadius: 14,
    },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    iconBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#262628', borderRadius: 10, padding: 10, justifyContent: 'center',
    },
    iconBtnText: { fontSize: 13, fontWeight: '600' },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    emptyBox: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: theme.secondaryText, fontSize: 16, textAlign: 'center' },

    deliveryDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.green },
    avatarCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: theme.card, borderWidth: 3, borderColor: theme.primary,
        alignItems: 'center', justifyContent: 'center',
    },

    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#333' },
    pendingLabel: { color: theme.text, fontSize: 16, fontWeight: '600' },

    heroCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#333' },
    statusBadgeLive: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(52,199,89,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(52,199,89,0.2)' },
    statusBadgeTextLive: { color: theme.green, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.green },

    bottomNav: {
        flexDirection: 'row',
        backgroundColor: theme.card,
        paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#333',
        position: 'absolute', bottom: 0, width: '100%',
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { color: theme.gray, fontSize: 11, marginTop: 4, fontWeight: '600' },
    badge: {
        position: 'absolute', top: -4, right: -8,
        backgroundColor: theme.red, borderRadius: 8,
        minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    riderMarker: {
        backgroundColor: theme.primary,
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
});
