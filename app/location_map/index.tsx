// app/location_map/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../src/constants/firebase';

// Safe module-level import — try/catch prevents crash if native module unavailable.
let MapView: any = null;
let Marker: any = View;

if (Platform.OS !== 'web') {
    try {
        const MapsModule = require('react-native-maps');
        MapView = MapsModule.default;
        Marker  = MapsModule.Marker;
    } catch (_) {
        MapView = null;
    }
}

const { width, height } = Dimensions.get('window');

const theme = {
    bg: '#0A0A0A',
    card: '#1C1C1E',
    primary: '#007AFF',
    text: '#F2F2F7',
    secondaryText: '#8E8E93',
    white: '#FFFFFF',
    green: '#34C759',
    red: '#FF3B30',
    input: '#2C2C2E',
};

// Use the Firebase API Key for Google Places (ensure Places API is enabled in GCP console)
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

export default function LocationSelector() {
    const [region, setRegion] = useState({
        latitude: 27.7172, // Default Kathmandu
        longitude: 85.324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    const [markerPosition, setMarkerPosition] = useState({
        latitude: 27.7172,
        longitude: 85.324,
    });

    const [address, setAddress] = useState<any>(null);
    const [fullAddressString, setFullAddressString] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const mapRef = useRef<any>(null);
    const searchRef = useRef<any>(null);

    useEffect(() => {
        // Initial fetch of current location 
        fetchCurrentLocation();
    }, []);

    const reverseGeocode = async (coords: { latitude: number; longitude: number }) => {
        try {
            const decoded = await Location.reverseGeocodeAsync(coords);
            if (decoded.length > 0) {
                const addr = decoded[0];
                setAddress(addr);
                const street = addr.street || addr.name || '';
                const city = addr.city || addr.subregion || addr.region || '';
                const country = addr.country || '';
                const postal = addr.postalCode || '';

                const fullAddr = `${street}${street && city ? ', ' : ''}${city}${city && postal ? ' ' : ''}${postal}${(city || postal) && country ? ', ' : ''}${country}`;
                setFullAddressString(fullAddr.trim());
                if (searchRef.current) {
                    searchRef.current.setAddressText(fullAddr.trim());
                }
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    };

    const fetchCurrentLocation = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                Alert.alert(
                    'Permission Denied',
                    'Location permission is required to use this feature.\n\nPlease enable it in Settings: Settings → Apps → Khaja → Permissions → Location',
                    [
                        { text: 'OK', onPress: () => {} },
                        { text: 'Settings', onPress: () => {
                            if (Platform.OS === 'android') {
                                // Android: Open app settings
                                try {
                                    // This is a fallback - the exact intent may vary
                                    Alert.alert('Open Settings', 'Please manually go to Settings → Apps → Khaja → Permissions');
                                } catch (e) {
                                    console.error('Could not open settings:', e);
                                }
                            }
                        }}
                    ]
                );
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 10000, // 10 second timeout for slow devices
            });

            const newPos = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            updateState(newPos);
        } catch (error: any) {
            console.error('Location error:', error);
            setErrorMsg('Could not fetch location. Try manual search or enable GPS.');
            Alert.alert(
                'Location Error',
                'GPS failed or timed out. You can still search for your location manually.'
            );
        } finally {
            setLoading(false);
        }
    };

    const updateState = (pos: { latitude: number; longitude: number }) => {
        setMarkerPosition(pos);
        const newRegion = {
            ...pos,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        reverseGeocode(pos);
    };

    const handleConfirmLocation = async () => {
        if (!fullAddressString) {
            Alert.alert('Error', 'Please select a valid location first.');
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                location: {
                    lat: markerPosition.latitude,
                    lng: markerPosition.longitude,
                },
                address: fullAddressString,
                addressDetails: {
                    street: address?.street || address?.name || '',
                    city: address?.city || '',
                    postalCode: address?.postalCode || '',
                    district: address?.subregion || '',
                },
                locationUpdatedAt: serverTimestamp(),
            });

            Alert.alert('Success', 'Delivery location updated!');
            router.back();
        } catch (error: any) {
            Alert.alert('Save Failed', error.message);
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
                <Text style={styles.headerTitle}>Select Delivery Location</Text>
            </View>

            <View style={styles.searchContainer}>
                <GooglePlacesAutocomplete
                    ref={searchRef}
                    placeholder="Search for your address..."
                    minLength={2}
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                        if (details) {
                            const pos = {
                                latitude: details.geometry.location.lat,
                                longitude: details.geometry.location.lng,
                            };
                            updateState(pos);
                        }
                    }}
                    query={{
                        key: GOOGLE_MAPS_APIKEY,
                        language: 'en',
                    }}
                    styles={{
                        container: { flex: 0 },
                        textInput: styles.searchInput,
                        listView: { ...styles.searchListView, backgroundColor: 'white' },
                        description: { color: '#000' },
                        predefinedPlacesDescription: { color: '#1faadb' },
                    }}
                    enablePoweredByContainer={false}
                    nearbyPlacesAPI="GooglePlacesSearch"
                    debounce={200}
                    textInputProps={{}}
                    predefinedPlaces={[]}
                />
            </View>

            {Platform.OS === 'web' || !MapView ? (
                <View style={[styles.map, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                    <Ionicons name="map-outline" size={48} color="#444" />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 12 }}>
                        📍 Map unavailable
                    </Text>
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>
                        Use the search bar above to find your address.
                    </Text>
                </View>
            ) : (
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={region}
                    onRegionChangeComplete={(r: any) => setRegion(r)}
                    provider={Platform.OS === 'android' ? 'google' : undefined}
                >
                    <Marker
                        coordinate={markerPosition}
                        draggable
                        onDragEnd={(e: any) => {
                            const pos = e.nativeEvent.coordinate;
                            updateState(pos);
                        }}
                        title="Delivery Here"
                        description={fullAddressString}
                    >
                        <View style={styles.markerContainer}>
                            <View style={styles.markerBadge}>
                                <Ionicons name="location" size={30} color={theme.red} />
                            </View>
                        </View>
                    </Marker>
                </MapView>
            )}


            <View style={styles.footer}>
                <View style={styles.addressBox}>
                    <View style={styles.addressRow}>
                        <Ionicons name="navigate-circle" size={24} color={theme.primary} />
                        <Text style={styles.addressText} numberOfLines={2}>
                            {fullAddressString || (loading ? 'Fetching address...' : 'Move marker to your location')}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.currentLocBtn}
                    onPress={fetchCurrentLocation}
                    disabled={loading}
                >
                    <Ionicons name="locate" size={24} color={theme.primary} />
                    <Text style={styles.currentLocText}>Use My Location</Text>
                    {loading && <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 10 }} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.confirmBtn, !fullAddressString && { opacity: 0.6 }]}
                    onPress={handleConfirmLocation}
                    disabled={loading || !fullAddressString}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Confirm Delivery Location</Text>
                    )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 0 : 16,
        zIndex: 100,
    },

    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: theme.card,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
        marginLeft: 12,
    },
    searchContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 90,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    searchInput: {
        backgroundColor: theme.card,
        color: theme.text,
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    searchListView: {
        backgroundColor: theme.card,
        borderRadius: 12,
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#333',
    },
    map: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerBadge: {
        padding: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.bg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        gap: 16,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 20,
    },
    addressBox: {
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addressText: {
        color: theme.text,
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    currentLocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    currentLocText: {
        color: theme.primary,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    confirmBtn: {
        backgroundColor: theme.green,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    },
});
