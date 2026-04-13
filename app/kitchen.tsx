// client/app/kitchen.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { googleProvider } from '../src/constants/firebase';
import { useNotifications } from '../src/components/NotificationProvider';
import NotificationBell from '../src/components/NotificationBell';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { auth, db } from '../src/constants/firebase';
import { updatePassword } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Item = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  dietary?: 'Veg' | 'Non-Veg' | 'Vegan';
  category?: 'Drinks' | 'Fast-food' | 'Meal' | 'Snacks' | 'Dessert';
  outOfStock?: boolean;
  totalRating?: number;
  ratingCount?: number;
  createdAt?: any;
};

type Order = {
  id: string;
  itemName: string;
  total: number;
  status:
  | 'requested'
  | 'accepted'
  | 'waiting_rider'
  | 'assigned_to_rider'
  | 'picked_up'
  | 'on_the_way'
  | 'out_for_delivery'
  | 'delivered'
  | 'canceled'
  | 'rejected'
  | 'expired_reassign'
  | 'rider_cancel_requested'
  | 'rider_cancel_approved'
  | 'order_returned'
  | 'rider_reported_not_returned';
  userId: string;
  userName?: string | null;
  createdAt?: any;
  acceptedAt?: any;
  outForDeliveryAt?: any;
  deliveredAt?: any;
  riderCancelAt?: any;
  riderReportedAt?: any;
  userEmail?: string | null;
  userPhone?: string | null;
  userAddress?: string | null;
  remarks?: string;
  riderId?: string;
  riderName?: string | null;
  userDidNotReceiveReported?: boolean;
  kitchenNotifiedOfReport?: boolean;
};

const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.some(b => b.style === 'cancel' || b.text === 'Cancel')) {
      const result = window.confirm(`${title}${message ? '\n' + message : ''}`);
      if (result) {
        const confirmBtn = buttons.find(b => b.style !== 'cancel' && b.text !== 'Cancel');
        if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
      }
    } else {
      window.alert(`${title}${message ? '\n' + message : ''}`);
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const theme = {
  pageBg: '#0A0A0A',
  card: '#1C1C1E',
  input: '#2C2C2E',
  white: '#FFFFFF',
  orange: '#FF6B35',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  gray: '#48484A',
  yellow: '#FFCC00',
  text: '#F2F2F7',
  secondaryText: '#8E8E93',
  radius: 16,
  pad: 16,
  shadow: {
    color: '#000',
    opacity: 0.35,
    radius: 12,
    offset: { width: 0, height: 6 },
  },
};

function useFade(delay = 0) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 350,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [a, delay]);
  return a;
}

function Button({
  label,
  color,
  onPress,
  style,
}: {
  label: string;
  color: string;
  onPress?: () => void;
  style?: any;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const inP = () =>
    Animated.spring(s, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  const ouP = () =>
    Animated.spring(s, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  return (
    <Animated.View style={[{ transform: [{ scale: s }] }, style]}>
      <Pressable
        onPressIn={inP}
        onPressOut={ouP}
        onPress={onPress}
        style={[styles.button, { backgroundColor: color, width: '100%' }]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Card({
  children,
  delay = 0,
  style,
}: React.PropsWithChildren<{ delay?: number; style?: any }>) {
  const a = useFade(delay);
  return (
    <Animated.View
      style={[
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
          backgroundColor: theme.card,
          borderRadius: theme.radius,
          padding: theme.pad,
          shadowColor: theme.shadow.color,
          shadowOpacity: theme.shadow.opacity,
          shadowRadius: theme.shadow.radius,
          shadowOffset: theme.shadow.offset,
          elevation: 6,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function SmallMenuItemCard({
  item,
  onDelete,
  onEdit,
  canEdit,
  isDeleteMode,
  isSelected,
  onToggle,
}: {
  item: Item;
  onDelete: (itemId: string) => void;
  onEdit?: (item: Item) => void;
  canEdit: boolean;
  isDeleteMode?: boolean;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const defaultImage = 'https://via.placeholder.com/400/2C2C2E/8E8E93?text=No+Image';

  const handlePress = () => {
    if (isDeleteMode && onToggle) {
      onToggle(item.id);
    } else if (onEdit) {
      onEdit(item);
    }
  };



  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.smallItemContainer,
        isSelected && { borderColor: theme.red, borderWidth: 2 }
      ]}
    >

      {canEdit && !isDeleteMode && (
        <Pressable
          onPress={() => onDelete(item.id)}
          style={styles.deleteButton}
          hitSlop={8}
        >
          <Ionicons name="trash" size={14} color={theme.white} />
        </Pressable>
      )}

      {isDeleteMode && (
        <View style={[styles.checkbox, isSelected && { backgroundColor: theme.red }]}>
          {isSelected && <Ionicons name="checkmark" size={12} color={theme.white} />}
        </View>
      )}

      {/* 16:9 image */}
      <View style={styles.smallItemImageWrap}>
        <Image
          source={{ uri: item.imageUrl || defaultImage }}
          style={[styles.smallItemImage, item.outOfStock && { opacity: 0.4 }]}
          resizeMode="cover"
        />
        {item.outOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        )}
        {item.dietary && (
          <View style={[styles.dietaryBadge, { backgroundColor: item.dietary === 'Veg' ? theme.green : item.dietary === 'Vegan' ? '#00C9A7' : theme.red }]}>
            <Text style={{ fontSize: 10 }}>{item.dietary === 'Veg' ? '🟢' : item.dietary === 'Vegan' ? '🌱' : '🔴'}</Text>
          </View>
        )}
      </View>

      <View style={{ padding: 10, gap: 4 }}>
        <Text numberOfLines={1} style={styles.smallItemTitle}>
          {item.name}
        </Text>
        {item.category && (
          <Text style={[styles.smallItemMeta, { fontSize: 11 }]}>{item.category}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={styles.smallItemPrice}>Rs. {item.price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function OrderCard({
  order,
  onAccept,
  onReject,
  onStartDelivery,
  onMarkDelivered,
  onReportIssue,
  onApproveRiderCancel,
  onRejectRiderCancel,
  onConfirmReturn,
  onReportRiderMissing,
}: {
  order: Order;
  onAccept: (o: Order) => void;
  onReject: (o: Order) => void;
  onStartDelivery: (o: Order) => void;
  onMarkDelivered: (o: Order) => void;
  onReportIssue?: (o: Order) => void;
  onApproveRiderCancel: (o: Order) => void;
  onRejectRiderCancel: (o: Order) => void;
  onConfirmReturn: (o: Order) => void;
  onReportRiderMissing: (o: Order) => void;
}) {
  const statusColor =
    order.status === 'requested'
      ? theme.yellow
      : order.status === 'accepted'
        ? theme.blue
        : order.status === 'waiting_rider'
          ? '#FF9500'
          : order.status === 'assigned_to_rider'
            ? theme.green
            : order.status === 'picked_up'
              ? theme.green
              : order.status === 'on_the_way'
                ? theme.green
                : order.status === 'out_for_delivery'
                  ? theme.green
                  : order.status === 'delivered'
                    ? theme.secondaryText
                    : order.status === 'rider_cancel_requested'
                      ? theme.yellow
                      : order.status === 'rider_cancel_approved' || order.status === 'rider_reported_not_returned'
                        ? theme.red
                        : order.status === 'order_returned'
                          ? theme.blue
                          : theme.red;

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.row}>
        <Text style={[styles.itemTitle, { fontSize: 18, flex: 1 }]}>
          Order: {order.itemName}
        </Text>
        <Text style={[styles.itemTitle, { color: theme.white }]}>
          Rs. {order.total}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons
          name="information-circle-outline"
          size={14}
          color={statusColor}
        />
        <Text
          style={[
            styles.itemMeta,
            { color: statusColor, fontWeight: '700' },
          ]}
        >
          {order.status.replace(/_/g, ' ').toUpperCase()}
        </Text>
      </View>

      <View style={{ marginTop: 6, gap: 2 }}>
        <Text style={[styles.itemMeta, { color: theme.yellow }]}>
          Customer Details
        </Text>
        <Text style={styles.itemMeta}> Name: {order.userName || 'unknown'} </Text>
        <Text style={styles.itemMeta}> Phone: {order.userPhone ?? 'N/A'} </Text>
        <Text style={styles.itemMeta}> Email: {order.userEmail ?? 'N/A'} </Text>
        <Text style={styles.itemMeta}> Address: {order.userAddress ?? 'N/A'}</Text>
        <Text style={styles.remarksHighlight}>
          Remarks: {order.remarks || 'No special instructions'}
        </Text>
      </View>

      {order.status === 'requested' && (
        <View style={styles.row}>
          <Button
            label="Accept"
            color={theme.green}
            onPress={() => onAccept(order)}
            style={{ flex: 1 }}
          />
          <Button
            label="Reject"
            color={theme.red}
            onPress={() => onReject(order)}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {order.status === 'accepted' && (
        <View style={{ gap: 8 }}>
          <View style={styles.row}>
            <Button
              label="📢 Call Rider"
              color='#FF9500'
              onPress={async () => {
                try {
                  await updateDoc(doc(db, 'orders', order.id), {
                    status: 'waiting_rider',
                    waitingRiderAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                } catch (e: any) {
                  showAlert('Error', e?.message);
                }
              }}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => router.push(`/print/${order.id}`)}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 12,
                backgroundColor: theme.gray,
                borderRadius: 6,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.white, fontWeight: '700', fontSize: 12 }}>
                Print
              </Text>
            </Pressable>
          </View>
          <Button
            label="Start Self Delivery"
            color={theme.blue}
            onPress={() => onStartDelivery(order)}
            style={{ width: '100%', marginTop: 4 }}
          />
          <Button
            label="Dismiss / Report Order"
            color={theme.red}
            onPress={() => onReportIssue?.(order)}
            style={{ width: '100%' }}
          />
        </View>
      )}

      {order.status === 'waiting_rider' && (
        <View style={{ backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 10, padding: 12, gap: 6 }}>
          <Text style={{ color: '#FF9500', fontWeight: '700', textAlign: 'center' }}>⏳ Waiting for Rider...</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center' }}>All available riders have been notified</Text>
        </View>
      )}

      {(order.status === 'assigned_to_rider' || order.status === 'picked_up' || order.status === 'on_the_way' || order.status === 'out_for_delivery') && (
        <View style={{ backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: 10, padding: 12, gap: 6 }}>
          <Text style={{ color: theme.green, fontWeight: '700', textAlign: 'center' }}>
            {order.status === 'assigned_to_rider' ? '🚴 Rider Assigned' : order.status === 'picked_up' ? '📦 Order Picked Up' : order.status === 'out_for_delivery' ? '🚚 Out for Delivery' : '🚀 On the Way!'}
          </Text>
          {order.riderName && (
            <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center' }}>Rider: {order.riderName}</Text>
          )}
          {order.status === 'out_for_delivery' && (
            <Button
              label="Mark as Delivered"
              color={theme.green}
              onPress={() => onMarkDelivered(order)}
            />
          )}
        </View>
      )}

      {order.status === 'rider_cancel_requested' && (
        <View style={{ backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 10, padding: 12, gap: 10 }}>
          <Text style={{ color: theme.yellow, fontWeight: '700', textAlign: 'center' }}>🚨 Rider Requested Cancellation</Text>
          <View style={styles.row}>
            <Button label="Approve & Req Return" color={theme.red} onPress={() => onApproveRiderCancel(order)} style={{ flex: 1 }} />
            <Button label="Reject" color={theme.gray} onPress={() => onRejectRiderCancel(order)} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {order.status === 'rider_cancel_approved' && (
        <View style={{ backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 10, padding: 12, gap: 10 }}>
          <Text style={{ color: theme.red, fontWeight: '700', textAlign: 'center' }}>📦 Waiting for Food Return</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center' }}>Rider: {order.riderName}</Text>
          <Button label="Report: Food Not Returned" color={theme.red} onPress={() => onReportRiderMissing(order)} style={{ width: '100%' }} />
        </View>
      )}

      {order.status === 'order_returned' && (
        <View style={{ backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 10, padding: 12, gap: 10 }}>
          <Text style={{ color: theme.blue, fontWeight: '700', textAlign: 'center' }}>🔄 Rider Returned Food</Text>
          <Button label="Confirm Receipt & Re-list" color={theme.green} onPress={() => onConfirmReturn(order)} style={{ width: '100%' }} />
        </View>
      )}

      {order.status === 'rider_reported_not_returned' && (
        <View style={{ backgroundColor: 'rgba(255,59,48,0.2)', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: theme.red, fontWeight: '700', textAlign: 'center' }}>🚫 Rider Reported: No Return</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 12, textAlign: 'center', marginTop: 4 }}>This incident has been logged for admin review.</Text>
        </View>
      )}
    </Card>
  );
}

function MiniBillCard({ order, kitchenName }: { order: Order; kitchenName: string }) {
  const dateObj = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.miniBill}>
      <Text style={styles.billHeader}>{kitchenName}</Text>
      <View style={styles.billDivider} />

      <View style={{ gap: 4 }}>
        <Text style={styles.billText}>Order: {order.itemName}</Text>
        <Text style={styles.billText}>Customer: {order.userName || 'Guest'}</Text>
        <Text style={styles.billText}>Date: {dateStr}</Text>
        {order.remarks ? <Text style={styles.billText}>Remarks: {order.remarks}</Text> : null}
      </View>
      <View style={styles.billDivider} />

      <View style={styles.row}>
        <Text style={[styles.billText, { flex: 1, fontWeight: '700' }]}>Status</Text>
        <Text style={[styles.billText, { fontWeight: '700' }]}>
          {order.status.replace(/_/g, ' ').toUpperCase()}
        </Text>
      </View>
      <View style={styles.billDivider} />

      <View style={styles.row}>
        <Text style={[styles.billText, { flex: 1, fontSize: 16, fontWeight: 'bold' }]}>TOTAL</Text>
        <Text style={[styles.billText, { fontSize: 16, fontWeight: 'bold' }]}>
          Rs. {order.total}
        </Text>
      </View>
    </View>
  );
}

export default function Kitchen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  const [uid, setUid] = useState('');
  const { unreadCount } = useNotifications();
  const [name, setName] = useState('');
  const [vip, setVip] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [loc, setLoc] = useState<{ lat?: string; lng?: string }>({});
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<'requests' | 'active' | 'defects' | 'menu' | 'profile' | 'history'>(
    'menu',
  );
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | 'month'>('today');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'delivered' | 'rejected'>('all');

  const [newPassword, setNewPassword] = useState('');
  const [requests, setRequests] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [defects, setDefects] = useState<Order[]>([]);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [reportingOrder, setReportingOrder] = useState<Order | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  const [activeMissingFoodWarning, setActiveMissingFoodWarning] = useState<Order | null>(null);

  const canOperate = vip && isOpen;
  const unsubAuthRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let unsubItems: (() => void) | null = null;
    let unsubKitchenDoc: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace('/login');
        return;
      }
      setUid(u.uid);

      const uref = doc(db, 'users', u.uid);
      const usnap = await getDoc(uref);
      const udata = usnap.data() as any;
      if (udata?.banned) {
        router.replace('/banned');
        return;
      }
      if (udata?.role !== 'kitchen') {
        router.replace('/user');
        return;
      }
      setName(udata?.preferredName || u.email?.split('@')[0] || 'Kitchen');

      const kref = doc(db, 'kitchens', u.uid);
      const ksnap = await getDoc(kref);
      if (!ksnap.exists()) {
        await setDoc(
          kref,
          {
            preferredName: udata?.preferredName || 'Kitchen',
            phone: udata?.phone || null,
            address: udata?.address || '',
            location: udata?.location || null,
            vip: udata?.vip ?? false,
            isOpen: udata?.isOpen ?? false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      unsubKitchenDoc = onSnapshot(kref, (d) => {
        const k = d.data() as any;
        setVip(!!k?.vip);
        setIsOpen(!!k?.isOpen);
        setAddress(k?.address || '');
        if (k?.location?.lat && k?.location?.lng) {
          setLoc({
            lat: String(k.location.lat),
            lng: String(k.location.lng),
          });
        }
      });

      const iq = query(
        collection(db, 'kitchens', u.uid, 'items'),
        orderBy('createdAt', 'desc'),
      );
      unsubItems = onSnapshot(iq, (snap) => {
        const list: Item[] = [];
        snap.forEach((docx) => {
          const d = docx.data() as any;
          list.push({ ...d, id: docx.id });
        });
        setItems(list);
      });

      const oq = query(
        collection(db, 'orders'),
        where('kitchenId', '==', u.uid),
      );
      unsubOrders = onSnapshot(oq, (s) => {
        const all: Order[] = s.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setRequests(all.filter((o) => o.status === 'requested'));
        setActive(
          all.filter(
            (o) =>
              o.status === 'accepted' ||
              o.status === 'waiting_rider' ||
              o.status === 'assigned_to_rider' ||
              o.status === 'picked_up' ||
              o.status === 'on_the_way' ||
              o.status === 'out_for_delivery' ||
              o.status === 'rider_cancel_requested' ||
              o.status === 'order_returned' ||
              o.status === 'rider_reported_not_returned',
          ),
        );
        setDefects(
          all.filter(
            (o) =>
              o.status === 'rider_cancel_requested' ||
              o.status === 'order_returned' ||
              o.status === 'rider_reported_not_returned',
          ),
        );
        setHistory(
          all.filter((o) =>
            ['delivered', 'canceled', 'rejected', 'expired_reassign'].includes(
              o.status,
            ),
          ),
        );

        const newMissingFood = all.find(o =>
          o.userDidNotReceiveReported === true &&
          o.kitchenNotifiedOfReport === false
        );

        if (newMissingFood && !activeMissingFoodWarning) {
          setActiveMissingFoodWarning(newMissingFood);
        }
      });

      // Auto-location fetch (Phase 1)
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = location.coords;

          setLoc(prev => {
            if (prev.lat && prev.lng) return prev;
            return { lat: String(latitude), lng: String(longitude) };
          });

          // Also reverse geocode if address is empty
          if (!address) {
            const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (rev.length > 0) {
              const r = rev[0];
              const str = `${r.street || r.name || ''}, ${r.city || r.subregion || ''}`.trim().replace(/^,/, '').trim();
              if (str && str !== ',') setAddress(str);
            }
          }
        } catch (e) {
          console.log("Kitchen auto-location failed", e);
        }
      })();
    });

    unsubAuthRef.current = unsubAuth;
    return () => {
      unsubAuth();
      unsubItems && unsubItems();
      unsubKitchenDoc && unsubKitchenDoc();
      unsubOrders && unsubOrders();
    };
  }, []);

  const toggleOpen = async () => {
    try {
      if (!vip) {
        showAlert('Not VIP', 'Admin must grant VIP first.');
        return;
      }
      const kref = doc(db, 'kitchens', uid);
      await updateDoc(kref, {
        isOpen: !isOpen,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', uid), {
        isOpen: !isOpen,
        updatedAt: serverTimestamp(),
      }).catch(() => { });
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to toggle');
    }
  };

  const saveProfile = async () => {
    const kref = doc(db, 'kitchens', uid);
    const patch: any = {
      address: address || '',
      updatedAt: serverTimestamp(),
    };
    if (loc.lat && loc.lng) {
      patch.location = {
        lat: parseFloat(loc.lat),
        lng: parseFloat(loc.lng),
      };
    }
    await updateDoc(kref, patch);
    await updateDoc(doc(db, 'users', uid), {
      address: patch.address,
      location: patch.location ?? null,
      updatedAt: serverTimestamp(),
    }).catch(() => { });
    showAlert('Saved', 'Kitchen profile updated');
  };

  const [n, setN] = useState('');
  const [p, setP] = useState('');
  const [img, setImg] = useState('');
  const [dietary, setDietary] = useState<'Veg' | 'Non-Veg' | 'Vegan'>('Non-Veg');
  const [category, setCategory] = useState<'Drinks' | 'Fast-food' | 'Meal' | 'Snacks' | 'Dessert'>('Meal');
  const [oos, setOos] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  const addItem = async () => {
    if (!canOperate) {
      showAlert('Closed', 'You must be VIP and Online to add items.');
      return;
    }
    if (!n.trim() || !p.trim()) {
      showAlert('Missing', 'Name and price required.');
      return;
    }
    const price = Number(p);
    if (Number.isNaN(price) || price <= 0) {
      showAlert('Invalid', 'Price must be a positive number.');
      return;
    }
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'kitchens', uid, 'items', editingItem.id), {
          name: n.trim(),
          price,
          imageUrl: img.trim() || null,
          dietary,
          category,
          outOfStock: oos,
          updatedAt: serverTimestamp(),
        });
        showAlert('Success', 'Item updated successfully!');
      } else {
        await addDoc(collection(db, 'kitchens', uid, 'items'), {
          name: n.trim(),
          price,
          imageUrl: img.trim() || null,
          dietary,
          category,
          outOfStock: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showAlert('Success', 'Item added successfully!');
      }
      resetForm();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to save item');
    }
  };

  const resetForm = () => {
    setN('');
    setP('');
    setImg('');
    setDietary('Non-Veg');
    setCategory('Meal');
    setOos(false);
    setEditingItem(null);
    setIsAddItemModalOpen(false);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setN(item.name);
    setP(String(item.price));
    setImg(item.imageUrl || '');
    setDietary(item.dietary || 'Non-Veg');
    setCategory(item.category || 'Meal');
    setOos(!!item.outOfStock);
    setIsAddItemModalOpen(true);
  };

  const deleteItem = async (itemId: string) => {
    const execDelete = async () => {
      try {
        await deleteDoc(doc(db, 'kitchens', uid, 'items', itemId));
      } catch (e: any) {
        showAlert('Error', e?.message || 'Failed to remove item');
      }
    };

    showAlert(
      'Remove item?',
      'This will remove the dish from your menu for all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: execDelete },
      ],
    );
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const execBulkDelete = async () => {
      try {
        const promises = selectedIds.map(id =>
          deleteDoc(doc(db, 'kitchens', uid, 'items', id))
        );
        await Promise.all(promises);
        showAlert('Success', 'Items removed.');
      } catch (e: any) {
        showAlert('Error', 'Failed to delete some items.');
      } finally {
        setIsDeleteMode(false);
        setSelectedIds([]);
      }
    };

    showAlert(
      'Delete Selected?',
      `Are you sure you want to remove ${selectedIds.length} items from your menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: execBulkDelete }
      ]
    );
  };

  const acceptOrder = async (o: Order) => {
    if (!canOperate) {
      showAlert('Closed', 'Go online first.');
      return;
    }
    try {
      await updateDoc(doc(db, 'orders', o.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to accept order');
    }
  };

  const rejectOrder = (o: Order) => {
    setRejectingOrder(o);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectingOrder) return;
    try {
      await updateDoc(doc(db, 'orders', rejectingOrder.id), {
        status: 'rejected',
        rejectionReason: rejectReason,
        updatedAt: serverTimestamp(),
        userDismissedRejection: false,
      });
      setRejectingOrder(null);
      setRejectReason('');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to reject order');
    }
  };

  const dismissMissingFoodWarning = async () => {
    if (activeMissingFoodWarning) {
      await updateDoc(doc(db, 'orders', activeMissingFoodWarning.id), {
        kitchenNotifiedOfReport: true,
      });
      setActiveMissingFoodWarning(null);
    }
  };

  const reportIssue = (o: Order) => {
    setReportingOrder(o);
    setReportReason('');
  };

  const confirmReportIssue = async () => {
    if (!reportingOrder) return;
    try {
      await updateDoc(doc(db, 'orders', reportingOrder.id), {
        status: 'canceled',
        cancellationReason: reportReason,
        userNotifiedOfReport: false,
        updatedAt: serverTimestamp(),
      });

      const uref = doc(db, 'users', reportingOrder.userId);
      const usnap = await getDoc(uref);
      if (usnap.exists()) {
        const d = usnap.data();
        const newCount = (d.kitchen_reports || 0) + 1;
        await updateDoc(uref, {
          kitchen_reports: newCount,
          banned: newCount >= 3 ? true : (d.banned || false),
        });
      }

      setReportingOrder(null);
      setReportReason('');
      setShowReportSuccess(true);
    } catch (e: any) {
      showAlert('Error', e?.message || 'Failed to report issue');
    }
  };

  const onApproveRiderCancel = async (o: Order) => {
    try {
      await updateDoc(doc(db, 'orders', o.id), {
        status: 'rider_cancel_approved',
        updatedAt: serverTimestamp(),
      });
      showAlert('Approved', 'Rider has been asked to return the food.');
    } catch (e: any) { showAlert('Error', e.message); }
  };

  const onRejectRiderCancel = async (o: Order) => {
    try {
      await updateDoc(doc(db, 'orders', o.id), {
        status: 'assigned_to_rider', // revert to assigned
        updatedAt: serverTimestamp(),
      });
      showAlert('Rejected', 'Rider has been told to continue delivery.');
    } catch (e: any) { showAlert('Error', e.message); }
  };

  const onConfirmReturn = async (o: Order) => {
    try {
      await updateDoc(doc(db, 'orders', o.id), {
        status: 'waiting_rider', // make it available for other riders again
        riderId: null,
        riderName: null,
        updatedAt: serverTimestamp(),
      });
      showAlert('Success', 'Food returned. Order is now waiting for a new rider.');
    } catch (e: any) { showAlert('Error', e.message); }
  };

  const onReportRiderMissing = async (o: Order) => {
    showAlert('Report Rider?', 'Report that the rider did not return the food? This will be logged for admin review.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report', style: 'destructive', onPress: async () => {
          try {
            await updateDoc(doc(db, 'orders', o.id), {
              status: 'rider_reported_not_returned',
              riderReportedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            showAlert('Reported', 'Rider has been reported for missing food.');
          } catch (e: any) { showAlert('Error', e.message); }
        }
      }
    ]);
  };

  const startDelivery = async (o: Order) => {
    await updateDoc(doc(db, 'orders', o.id), {
      status: 'out_for_delivery',
      outForDeliveryAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const markDelivered = async (o: Order) => {
    await updateDoc(doc(db, 'orders', o.id), {
      status: 'delivered',
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    if (unsubAuthRef.current) {
      unsubAuthRef.current();
      unsubAuthRef.current = null;
    }
    await signOut(auth);
    router.replace('/login');
  };

  if (!vip) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 12,
          backgroundColor: theme.pageBg,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: theme.text,
          }}
        >
          Hi {name}
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: theme.secondaryText,
          }}
        >
          You are not VIP yet. Ask an admin to grant VIP. Until then,
          you cannot go online or post items.
        </Text>
        <Button label="Logout" color={theme.red} onPress={logout} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Card style={{ gap: 10 }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>
                {name}{' '}
                <Ionicons
                  name="restaurant-outline"
                  size={24}
                  color={theme.yellow}
                />
              </Text>
            </View>
            <NotificationBell
              count={unreadCount}
              onPress={() => setTab('requests')}
              color={theme.white}
            />
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
                marginLeft: 12,
              }}
            >
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: isOpen ? theme.green : theme.gray,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isOpen ? theme.green : theme.secondaryText,
                  },
                ]}
              >
                {isOpen ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Button
              label={isOpen ? 'Go Offline' : 'Go Online'}
              color={isOpen ? theme.gray : theme.green}
              onPress={toggleOpen}
            />
          </View>
        </Card>

        {/* Tab Content */}
        <View style={{ gap: 10 }}>
          {tab === 'history' && (
            <>
              <Text style={styles.sectionTitle}>Order History</Text>

              <View style={{ gap: 10, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.filterChip, historyDateFilter === 'all' && styles.filterChipActive]}
                    onPress={() => setHistoryDateFilter('all')}
                  >
                    <Text style={[styles.filterChipText, historyDateFilter === 'all' && styles.filterChipTextActive]}>All Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, historyDateFilter === 'today' && styles.filterChipActive]}
                    onPress={() => setHistoryDateFilter('today')}
                  >
                    <Text style={[styles.filterChipText, historyDateFilter === 'today' && styles.filterChipTextActive]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, historyDateFilter === 'month' && styles.filterChipActive]}
                    onPress={() => setHistoryDateFilter('month')}
                  >
                    <Text style={[styles.filterChipText, historyDateFilter === 'month' && styles.filterChipTextActive]}>This Month</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.filterChip, historyStatusFilter === 'all' && styles.filterChipActive]}
                    onPress={() => setHistoryStatusFilter('all')}
                  >
                    <Text style={[styles.filterChipText, historyStatusFilter === 'all' && styles.filterChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, historyStatusFilter === 'delivered' && styles.filterChipActive]}
                    onPress={() => setHistoryStatusFilter('delivered')}
                  >
                    <Text style={[styles.filterChipText, historyStatusFilter === 'delivered' && styles.filterChipTextActive]}>Delivered</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, historyStatusFilter === 'rejected' && styles.filterChipActive]}
                    onPress={() => setHistoryStatusFilter('rejected')}
                  >
                    <Text style={[styles.filterChipText, historyStatusFilter === 'rejected' && styles.filterChipTextActive]}>Rejected</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                value={historySearch}
                onChangeText={setHistorySearch}
                placeholder="Search history by item or customer..."
                placeholderTextColor={theme.secondaryText}
                style={[styles.input, { marginBottom: 10 }]}
              />

              {(() => {
                const now = new Date();
                const filteredHistory = history.filter(o => {
                  const matchesSearch = (o.itemName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                    (o.userName || '').toLowerCase().includes(historySearch.toLowerCase());

                  let matchesDate = true;
                  const dateObj = o.createdAt?.toDate ? o.createdAt.toDate() : new Date();
                  if (historyDateFilter === 'today') {
                    matchesDate = dateObj.toDateString() === now.toDateString();
                  } else if (historyDateFilter === 'month') {
                    matchesDate = dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
                  }

                  let matchesStatus = true;
                  if (historyStatusFilter === 'delivered') {
                    matchesStatus = o.status === 'delivered';
                  } else if (historyStatusFilter === 'rejected') {
                    matchesStatus = o.status === 'rejected';
                  }

                  return matchesSearch && matchesDate && matchesStatus;
                });

                if (filteredHistory.length === 0) {
                  return (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="receipt-outline" size={40} color={theme.gray} />
                      <Text style={styles.emptyText}>No history found.</Text>
                    </View>
                  );
                }

                return filteredHistory.map(o => (
                  <MiniBillCard key={o.id} order={o} kitchenName={name} />
                ));
              })()}
            </>
          )}

          {tab === 'requests' && (
            <>
              <Text style={styles.sectionTitle}>Incoming Requests</Text>
              {requests.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={40} color={theme.gray} />
                  <Text style={styles.emptyText}>No new requests at the moment.</Text>
                </View>
              )}
              {requests.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onAccept={acceptOrder}
                  onReject={rejectOrder}
                  onStartDelivery={startDelivery}
                  onMarkDelivered={markDelivered}
                  onReportIssue={reportIssue}
                  onApproveRiderCancel={onApproveRiderCancel}
                  onRejectRiderCancel={onRejectRiderCancel}
                  onConfirmReturn={onConfirmReturn}
                  onReportRiderMissing={onReportRiderMissing}
                />
              ))}
            </>
          )}

          {tab === 'active' && (
            <>
              <Text style={styles.sectionTitle}>Active Orders</Text>
              {active.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={40} color={theme.gray} />
                  <Text style={styles.emptyText}>No active orders to prepare.</Text>
                </View>
              )}
              {active.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onAccept={acceptOrder}
                  onReject={rejectOrder}
                  onStartDelivery={startDelivery}
                  onMarkDelivered={markDelivered}
                  onReportIssue={reportIssue}
                  onApproveRiderCancel={onApproveRiderCancel}
                  onRejectRiderCancel={onRejectRiderCancel}
                  onConfirmReturn={onConfirmReturn}
                  onReportRiderMissing={onReportRiderMissing}
                />
              ))}
            </>
          )}

          {tab === 'defects' && (
            <>
              <Text style={styles.sectionTitle}>Cancellation & Returns</Text>
              {defects.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={40} color={theme.gray} />
                  <Text style={styles.emptyText}>No rider issues or pending returns.</Text>
                </View>
              )}
              {defects.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onAccept={acceptOrder}
                  onReject={rejectOrder}
                  onStartDelivery={startDelivery}
                  onMarkDelivered={markDelivered}
                  onReportIssue={reportIssue}
                  onApproveRiderCancel={onApproveRiderCancel}
                  onRejectRiderCancel={onRejectRiderCancel}
                  onConfirmReturn={onConfirmReturn}
                  onReportRiderMissing={onReportRiderMissing}
                />
              ))}
            </>
          )}

          {tab === 'menu' && (
            <MenuTab
              isOpen={isOpen}
              items={items}
              isDeleteMode={isDeleteMode}
              selectedIds={selectedIds}
              onOpenModal={() => setIsAddItemModalOpen(true)}
              onToggleDeleteMode={() => { setIsDeleteMode(!isDeleteMode); setSelectedIds([]); }}
              onBulkDelete={handleBulkDelete}
              onDeleteItem={deleteItem}
              onToggleSelect={toggleSelectItem}
              onEdit={handleEditItem}
            />
          )}

          {tab === 'profile' && (
            <View style={{ gap: 20 }}>
              <Card style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Kitchen Profile</Text>
                <Text style={styles.inputLabel}>Kitchen Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Grandma's Kitchen"
                  placeholderTextColor={theme.secondaryText}
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>Kitchen Address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g., Itahari-5, Main Street"
                  placeholderTextColor={theme.secondaryText}
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>Location Coordinates</Text>
                <View style={styles.locationRow}>
                  <TextInput
                    value={loc.lat ?? ''}
                    onChangeText={(t) => setLoc((s) => ({ ...s, lat: t }))}
                    placeholder="Lat"
                    keyboardType="numeric"
                    placeholderTextColor={theme.secondaryText}
                    style={[styles.input, styles.locationInput]}
                  />
                  <TextInput
                    value={loc.lng ?? ''}
                    onChangeText={(t) => setLoc((s) => ({ ...s, lng: t }))}
                    placeholder="Lng"
                    keyboardType="numeric"
                    placeholderTextColor={theme.secondaryText}
                    style={[styles.input, styles.locationInput]}
                  />
                </View>
                <Button
                  label="Update Profile"
                  color={theme.blue}
                  onPress={saveProfile}
                />
              </Card>

              <Card style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Account Settings</Text>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min 6 characters"
                  secureTextEntry
                  placeholderTextColor={theme.secondaryText}
                  style={styles.input}
                />
                <Button
                  label="Update Password"
                  color={theme.gray}
                  onPress={async () => {
                    if (newPassword.length < 6) {
                      showAlert("Short Password", "Minimum 6 characters required.");
                      return;
                    }
                    try {
                      await updatePassword(auth.currentUser!, newPassword);
                      showAlert("Success", "Password updated!");
                      setNewPassword('');
                    } catch (e: any) {
                      showAlert("Error", e.message);
                    }
                  }}
                />
                <View style={{ height: 1, backgroundColor: theme.gray, marginVertical: 8 }} />
                <Button label="Logout Account" color={theme.red} onPress={logout} />
                <Text style={{ color: theme.secondaryText, textAlign: 'center', fontSize: 12, marginTop: 8 }}>
                  App Version: 1.0.4 (Production Ready)
                </Text>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FIXED BOTTOM TAB BAR */}
      <View style={[styles.bottomTabBar, { paddingBottom: bottomPad }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('requests')}>
          <Ionicons
            name={tab === 'requests' ? 'notifications' : 'notifications-outline'}
            size={24}
            color={tab === 'requests' ? theme.blue : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'requests' && { color: theme.blue }]}>Requests</Text>
          {requests.length > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{requests.length}</Text></View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('active')}>
          <Ionicons
            name={tab === 'active' ? 'time' : 'time-outline'}
            size={24}
            color={tab === 'active' ? theme.blue : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'active' && { color: theme.blue }]}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('defects')}>
          <Ionicons
            name={tab === 'defects' ? 'alert-circle' : 'alert-circle-outline'}
            size={24}
            color={tab === 'defects' ? theme.red : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'defects' && { color: theme.red }]}>Defects</Text>
          {defects.length > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.red }]}><Text style={styles.badgeText}>{defects.length}</Text></View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('menu')}>
          <Ionicons
            name={tab === 'menu' ? 'fast-food' : 'fast-food-outline'}
            size={24}
            color={tab === 'menu' ? theme.blue : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'menu' && { color: theme.blue }]}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('history')}>
          <Ionicons
            name={tab === 'history' ? 'receipt' : 'receipt-outline'}
            size={24}
            color={tab === 'history' ? theme.blue : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'history' && { color: theme.blue }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('profile')}>
          <Ionicons
            name={tab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={tab === 'profile' ? theme.blue : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'profile' && { color: theme.blue }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* REJECT ORDER MODAL */}
      <Modal visible={!!rejectingOrder} transparent animationType="fade" onRequestClose={() => setRejectingOrder(null)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Order</Text>
            <Text style={styles.modalMeta}>Please provide a reason for rejecting {rejectingOrder?.itemName}. This will be shown to the user.</Text>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Out of stock, too far..."
              placeholderTextColor={theme.secondaryText}
              style={[
                styles.input,
                { height: 80, textAlignVertical: 'top', marginVertical: 10 }
              ]}
              multiline
            />

            <View style={styles.row}>
              <Button label="Cancel" color={theme.gray} onPress={() => setRejectingOrder(null)} style={{ flex: 1 }} />
              <Button label="Confirm Reject" color={theme.red} onPress={confirmReject} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* REPORT ISSUE MODAL */}
      <Modal visible={!!reportingOrder} transparent animationType="fade" onRequestClose={() => setReportingOrder(null)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Delivery</Text>
            <Text style={styles.modalMeta}>User unreachable? Please explain what happened. This order will be canceled.</Text>

            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="e.g. Called 5 times, no answer..."
              placeholderTextColor={theme.secondaryText}
              style={[
                styles.input,
                { height: 80, textAlignVertical: 'top', marginVertical: 10 }
              ]}
              multiline
            />

            <View style={styles.row}>
              <Button label="Back" color={theme.gray} onPress={() => setReportingOrder(null)} style={{ flex: 1 }} />
              <Button label="Cancel Order" color={theme.red} onPress={confirmReportIssue} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* REPORT SUCCESS MODAL */}
      <Modal visible={showReportSuccess} transparent animationType="fade" onRequestClose={() => setShowReportSuccess(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={{ backgroundColor: 'rgba(255, 59, 48, 0.15)', padding: 16, borderRadius: 50 }}>
              <Ionicons name="warning" size={48} color={theme.red} />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 22, color: theme.red, marginTop: 10 }]}>Reported!</Text>
            <Text style={[styles.modalMeta, { textAlign: 'center', fontSize: 16 }]}>
              We will review this issue. The user has been notified.
            </Text>
            <Button label="Close" color={theme.gray} onPress={() => setShowReportSuccess(false)} style={{ width: '100%', marginTop: 20 }} />
          </Animated.View>
        </View>
      </Modal>

      {/* MISSING FOOD WARNING MODAL */}
      <Modal visible={!!activeMissingFoodWarning} transparent animationType="fade" onRequestClose={dismissMissingFoodWarning}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={{ backgroundColor: 'rgba(255, 59, 48, 0.15)', padding: 16, borderRadius: 50 }}>
              <Ionicons name="alert-circle" size={48} color={theme.red} />
            </View>
            <Text style={[styles.modalMeta, { textAlign: 'center', fontSize: 13, color: theme.red, marginTop: 10 }]}>
              Note: If missing food is reported too many times, your kitchen will automatically be banned and forced offline.
            </Text>
            <ScrollView style={{ maxHeight: 300, width: '100%', marginTop: 10 }} contentContainerStyle={{ alignItems: 'center' }}>
              <Text style={[styles.modalMeta, { textAlign: 'center', fontSize: 16 }]}>
                A user reported they did NOT receive their order for {activeMissingFoodWarning?.itemName}.
              </Text>
            </ScrollView>
            <Button label="I understand" color={theme.gray} onPress={dismissMissingFoodWarning} style={{ width: '100%', marginTop: 20 }} />
          </Animated.View>
        </View>
      </Modal>
      {/* ADD ITEM MODAL */}
      <AddItemModal
        visible={isAddItemModalOpen}
        onClose={resetForm}
        n={n} setN={setN}
        p={p} setP={setP}
        img={img} setImg={setImg}
        dietary={dietary} setDietary={setDietary}
        category={category} setCategory={setCategory}
        oos={oos} setOos={setOos}
        isEditing={!!editingItem}
        onSave={addItem}
      />
    </View>
  );
}

// ─── MenuTab component (responsive grid) ─────────────────────────────────────
function MenuTab({
  isOpen, items, isDeleteMode, selectedIds,
  onOpenModal, onToggleDeleteMode, onBulkDelete, onDeleteItem, onToggleSelect, onEdit,
}: {
  isOpen: boolean;
  items: Item[];
  isDeleteMode: boolean;
  selectedIds: string[];
  onOpenModal: () => void;
  onToggleDeleteMode: () => void;
  onBulkDelete: () => void;
  onDeleteItem: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (item: Item) => void;
}) {
  const { width } = useWindowDimensions();
  // Responsive columns: >= 1024 → 4, >= 768 → 3, >= 480 → 2, else 1
  const numCols = width >= 1024 ? 4 : width >= 768 ? 3 : width >= 480 ? 2 : 2;
  const cardWidth = `${Math.floor(100 / numCols) - 2}%` as any;

  return (
    <View style={{ gap: 20 }}>
      {isOpen ? (
        <TouchableOpacity
          onPress={onOpenModal}
          style={styles.addItemBtn}
        >
          <View style={styles.addItemBtnInner}>
            <View style={styles.addItemBtnIconCircle}>
              <Ionicons name="add" size={22} color={theme.white} />
            </View>
            <View>
              <Text style={styles.addItemBtnTitle}>Add New Item</Text>
              <Text style={styles.addItemBtnSub}>Tap to list a new dish on your menu</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      ) : (
        <Card style={{ gap: 5 }}>
          <Text style={[{ color: theme.red, fontWeight: '700', fontSize: 17 }]}>
            Kitchen is Offline
          </Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>
            Go online to add items and receive orders.
          </Text>
        </Card>
      )}

      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.sectionTitle}>Your Menu ({items.length})</Text>
        {items.length > 0 && (
          <TouchableOpacity
            onPress={onToggleDeleteMode}
            style={[styles.manageBtn, isDeleteMode && { backgroundColor: theme.gray }]}
          >
            <Text style={styles.manageBtnText}>{isDeleteMode ? 'Cancel' : 'Manage'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isDeleteMode && selectedIds.length > 0 && (
        <Button
          label={`Delete Selected (${selectedIds.length})`}
          color={theme.red}
          onPress={onBulkDelete}
          style={{ marginBottom: 6 }}
        />
      )}

      {items.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="fast-food-outline" size={40} color={theme.gray} />
          <Text style={styles.emptyText}>No dishes yet. Tap "Add New Item" above!</Text>
        </View>
      )}

      <View style={styles.itemGrid}>
        {items.map((it) => (
          <View key={it.id} style={{ width: cardWidth }}>
            <SmallMenuItemCard
              item={it}
              onDelete={onDeleteItem}
              onEdit={onEdit}
              canEdit={true}
              isDeleteMode={isDeleteMode}
              isSelected={selectedIds.includes(it.id)}
              onToggle={onToggleSelect}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── AddItemModal component ───────────────────────────────────────────────────
const CATEGORY_META: { key: 'Drinks' | 'Fast-food' | 'Meal' | 'Snacks' | 'Dessert'; emoji: string; label: string }[] = [
  { key: 'Drinks', emoji: '☕', label: 'Drinks' },
  { key: 'Fast-food', emoji: '🍔', label: 'Fast Food' },
  { key: 'Meal', emoji: '🍱', label: 'Meal' },
  { key: 'Snacks', emoji: '🍟', label: 'Snacks' },
  { key: 'Dessert', emoji: '🍰', label: 'Dessert' },
];

const DIETARY_META: { key: 'Veg' | 'Non-Veg' | 'Vegan'; emoji: string; color: string }[] = [
  { key: 'Veg', emoji: '🟢', color: theme.green },
  { key: 'Non-Veg', emoji: '🔴', color: theme.red },
  { key: 'Vegan', emoji: '🌱', color: '#00C9A7' },
];

function AddItemModal({
  visible, onClose,
  n, setN, p, setP, img, setImg,
  dietary, setDietary,
  category, setCategory,
  oos, setOos,
  isEditing,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  n: string; setN: (v: string) => void;
  p: string; setP: (v: string) => void;
  img: string; setImg: (v: string) => void;
  dietary: 'Veg' | 'Non-Veg' | 'Vegan'; setDietary: (v: 'Veg' | 'Non-Veg' | 'Vegan') => void;
  category: 'Drinks' | 'Fast-food' | 'Meal' | 'Snacks' | 'Dessert';
  setCategory: (v: 'Drinks' | 'Fast-food' | 'Meal' | 'Snacks' | 'Dessert') => void;
  oos: boolean; setOos: (v: boolean) => void;
  isEditing: boolean;
  onSave: () => void;
}) {
  const isWeb = Platform.OS === 'web';

  const formContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.pageBg }}
    >
      {/* Header */}
      <View style={styles.modalFormHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalFormTitle}>{isEditing ? '📝 Edit Item' : '🍽️ Add New Item'}</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 13, marginTop: 2 }}>
            {isEditing ? 'Update the details for this menu item' : 'Fill in the details to list this dish'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
          <Ionicons name="close" size={20} color={theme.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Name */}
        <View style={{ gap: 6 }}>
          <Text style={styles.formLabel}>ITEM NAME</Text>
          <TextInput
            value={n}
            onChangeText={setN}
            placeholder="e.g. Grilled Chicken Burger"
            placeholderTextColor={theme.gray}
            style={styles.input}
          />
        </View>

        {/* Price with Rs. prefix */}
        <View style={{ gap: 6 }}>
          <Text style={styles.formLabel}>PRICE</Text>
          <View style={styles.priceInputRow}>
            <View style={styles.pricePrefixBox}>
              <Text style={styles.pricePrefixText}>Rs.</Text>
            </View>
            <TextInput
              value={p}
              onChangeText={setP}
              placeholder="150"
              keyboardType="numeric"
              placeholderTextColor={theme.gray}
              style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
            />
          </View>
        </View>

        {/* Image URL */}
        <View style={{ gap: 6 }}>
          <Text style={styles.formLabel}>IMAGE URL (optional)</Text>
          <TextInput
            value={img}
            onChangeText={setImg}
            placeholder="https://example.com/dish.jpg"
            placeholderTextColor={theme.gray}
            style={styles.input}
          />
          {img.trim().length > 0 && (
            <Image
              source={{ uri: img.trim() }}
              style={{ width: '100%', height: 140, borderRadius: 12, marginTop: 6, backgroundColor: theme.input }}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Dietary Chips */}
        <View style={{ gap: 10 }}>
          <Text style={styles.formLabel}>DIETARY TYPE</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {DIETARY_META.map(({ key, emoji, color }) => {
              const active = dietary === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setDietary(key)}
                  style={[
                    styles.dietaryChip,
                    active
                      ? { backgroundColor: color, borderColor: color }
                      : { backgroundColor: 'transparent', borderColor: theme.gray },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  <Text style={[styles.dietaryChipLabel, { color: active ? theme.white : theme.secondaryText }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Icons — horizontal scroll */}
        <View style={{ gap: 10 }}>
          <Text style={styles.formLabel}>CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          >
            {CATEGORY_META.map(({ key, emoji, label }) => {
              const active = category === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setCategory(key)}
                  style={[
                    styles.categoryChip,
                    active
                      ? { backgroundColor: theme.orange, borderColor: theme.orange }
                      : { backgroundColor: theme.card, borderColor: theme.gray },
                  ]}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  <Text style={[styles.categoryChipLabel, { color: active ? theme.white : theme.secondaryText }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Out of Stock Toggle (only when editing) */}
        {isEditing && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.card,
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: oos ? theme.red : theme.gray
          }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.white, fontWeight: '700', fontSize: 16 }}>Mark as Out of Stock</Text>
              <Text style={{ color: theme.secondaryText, fontSize: 12 }}>Hide this item from customers temporarily</Text>
            </View>
            <TouchableOpacity
              onPress={() => setOos(!oos)}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                backgroundColor: oos ? theme.red : theme.gray,
                padding: 2,
                justifyContent: 'center',
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.white,
                transform: [{ translateX: oos ? 22 : 0 }]
              }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity onPress={onSave} style={[styles.saveItemBtn, isEditing && { backgroundColor: theme.blue, shadowColor: theme.blue }]} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={22} color={theme.white} />
          <Text style={{ color: theme.white, fontSize: 16, fontWeight: '800', marginLeft: 8 }}>
            {isEditing ? 'Update Menu Item' : 'Save Menu Item'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Web: Modal with centered card overlay (like a dialog)
  // Mobile: Full-screen pageSheet
  if (isWeb) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.webModalBackdrop}>
          <View style={styles.webModalCard}>
            {formContent}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {formContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.pad,
    gap: 24,
    backgroundColor: theme.pageBg,
    paddingBottom: 100,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 15,
  },
  headerTitle: {
    color: theme.white,
    fontSize: 28,
    fontWeight: '800',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: theme.text,
    marginBottom: 5,
    paddingLeft: 4,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.gray,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: theme.secondaryText,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.input,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  locationInput: {
    flex: 1,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  smallItemContainer: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallItemImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.gray,
    overflow: 'hidden',
  },
  smallItemImage: {
    width: '100%',
    height: '100%',
  },
  smallItemTitle: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  smallItemMeta: {
    color: theme.secondaryText,
    fontSize: 12,
  },
  smallItemPrice: {
    color: theme.orange,
    fontWeight: '800',
    fontSize: 15,
  },
  dietaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  // Add Item Button
  addItemBtn: {
    backgroundColor: theme.orange,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.orange,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addItemBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  addItemBtnIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtnTitle: {
    color: theme.white,
    fontWeight: '800',
    fontSize: 16,
  },
  addItemBtnSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  // Modal Form
  webModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webModalCard: {
    backgroundColor: theme.pageBg,
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    height: '85%' as any,
    overflow: 'hidden' as any,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  modalFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.input,
  },
  modalFormTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.white,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    color: theme.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricePrefixBox: {
    backgroundColor: theme.orange,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePrefixText: {
    color: theme.white,
    fontWeight: '800',
    fontSize: 15,
  },
  dietaryChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    gap: 4,
  },
  dietaryChipLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  categoryChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    minWidth: 80,
    gap: 4,
  },
  categoryChipLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  saveItemBtn: {
    backgroundColor: theme.green,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.green,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginTop: 4,
  },
  inputLabel: {
    color: theme.secondaryText,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -4,
    paddingLeft: 4,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingTop: 10,
    // paddingBottom applied dynamically via useSafeAreaInsets
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: theme.secondaryText,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: '25%',
    backgroundColor: theme.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemTitle: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 17,
  },
  itemMeta: {
    color: theme.secondaryText,
    fontSize: 14,
  },
  remarksHighlight: {
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: theme.yellow,
    padding: 8,
    borderRadius: 4,
    color: theme.white,
    fontSize: 13,
    marginTop: 4,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.white,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtn: {
    backgroundColor: theme.red,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  manageBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 12,
  },
  miniBill: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
  },
  billHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: 8,
  },
  billDivider: {
    height: 1,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  billText: {
    color: '#000',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gray,
  },
  filterChipActive: {
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  filterChipText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: theme.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: theme.pad,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    gap: 12,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: theme.shadow.offset,
    elevation: 10,
  },
  modalTitle: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '800',
  },
  modalMeta: {
    color: theme.secondaryText,
    fontSize: 14,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  outOfStockText: {
    color: theme.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: theme.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    transform: [{ rotate: '-10deg' }]
  },
});
