import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auth, db } from '../src/constants/firebase';

// Dark theme similar to kitchen.tsx
const theme = {
  pageBg: '#0A0A0A',
  card: '#1C1C1E',
  input: '#2C2C2E',
  text: '#F2F2F7',
  white: '#FFFFFF',
  secondaryText: '#8E8E93',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  gray: '#48484A',
  radius: 14,
  pad: 16,
  shadow: {
    color: '#000',
    opacity: 0.3,
    radius: 10,
    offset: { width: 0, height: 5 },
  },
};

function useMountFade(delay = 0) {
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

function Card({
  children,
  delay = 0,
  style,
}: React.PropsWithChildren<{ delay?: number; style?: any }>) {
  const a = useMountFade(delay);
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
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[styles.button, { backgroundColor: color }, style]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2),
    s2 = Math.sin(dLng / 2);
  const A =
    s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(A));
}

type KitchenProfile = {
  id: string;
  preferredName?: string;
  address?: string;
  vip?: boolean;
  isOpen?: boolean;
  location?: { lat: number; lng: number };
};
type MenuItem = {
  id?: string;
  kitchenId: string;
  kitchenName: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};
type Order = {
  id: string;
  status:
    | 'requested'
    | 'accepted'
    | 'out_for_delivery'
    | 'delivered'
    | 'canceled'
    | 'rejected'
    | 'expired_reassign';
  itemName: string;
  total: number;
  kitchenName: string;
  createdAt?: any;
  acceptedAt?: any;
  outForDeliveryAt?: any;
  deliveredAt?: any;
};

export default function UserHome() {
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [userLoc, setUserLoc] = useState<{ lat?: string; lng?: string }>({});
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const unsubItems = useRef<(() => void)[]>([]);
  const [show, setShow] = useState(false);
  const [sel, setSel] = useState<MenuItem | null>(null);
  const [qty, setQty] = useState(1);
  const [cod, setCOD] = useState(true);
  const headerFade = useMountFade(0);
  const [savedLocation, setSavedLocation] = useState(false);

  const inc = () => setQty((q) => Math.min(20, q + 1));
  const dec = () => setQty((q) => Math.max(1, q - 1));

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace('/login');
        return;
      }
      setUid(u.uid);

      const uref = doc(db, 'users', u.uid);
      const usnap = await getDoc(uref);
      const d = usnap.data() as any;
      setName(d?.preferredName || u.email?.split('@')[0] || 'User');
      setAddr(d?.address || '');
      if (d?.location?.lat && d?.location?.lng) {
        setUserLoc({
          lat: String(d.location.lat),
          lng: String(d.location.lng),
        });
      }

      const oq = query(
        collection(db, 'orders'),
        where('userId', '==', u.uid),
        orderBy('createdAt', 'desc'),
      );
      const unsubOrders = onSnapshot(oq, (snap) => {
        const list: Order[] = [];
        snap.forEach((docx) => {
          const o = docx.data() as any;
          list.push({
            id: docx.id,
            status: o.status,
            itemName: o.itemName,
            total: o.total,
            kitchenName: o.kitchenName,
            createdAt: o.createdAt,
            acceptedAt: o.acceptedAt,
            outForDeliveryAt: o.outForDeliveryAt,
            deliveredAt: o.deliveredAt,
          });
        });
        setOrders(list);
      });

      const kq = query(
        collection(db, 'kitchens'),
        where('vip', '==', true),
        where('isOpen', '==', true),
      );
      const unsubK = onSnapshot(kq, (snap) => {
        unsubItems.current.forEach((fn) => fn());
        unsubItems.current = [];
        const kitchens: KitchenProfile[] = [];
        snap.forEach((k) => kitchens.push({ id: k.id, ...(k.data() as any) }));

        kitchens.forEach((k) => {
          const iq = query(
            collection(db, 'kitchens', k.id, 'items'),
            orderBy('createdAt', 'desc'),
          );
          const ufn = onSnapshot(iq, (isnap) => {
            const fresh: MenuItem[] = [];
            isnap.forEach((i) => {
              const d = i.data() as any;
              fresh.push({
                id: `${k.id}_${i.id}`,
                kitchenId: k.id,
                kitchenName: k.preferredName || 'Kitchen',
                name: d.name,
                price: d.price,
                imageUrl: d.imageUrl || null,
              });
            });
            setItems((prev) => {
              const others = prev.filter((x) => x.kitchenId !== k.id);
              return [...others, ...fresh];
            });
          });
          unsubItems.current.push(ufn);
        });
      });

      return () => {
        unsubOrders();
        unsubK();
        unsubItems.current.forEach((fn) => fn());
        unsubItems.current = [];
      };
    });

    return () => unsubAuth();
  }, []);

  // REFRESH ON FOREGROUND
  useEffect(() => {
    const handleStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        fetchAll();
        fetchKitchens();
      }
    };
    const subscription = AppState.addEventListener('change', handleStateChange);
    return () => subscription.remove();
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAll(), fetchKitchens()]);
    setIsRefreshing(false);
  };

  const fetchAll = async () => {
    const u = auth.currentUser;
    if (u) {
      try {
        const [profile, orderList, menuItems] = await Promise.all([
          api.getUserProfile(u.uid),
          api.getUserOrders(u.uid),
          api.getMenuItems(),
        ]);
        if (profile) {
          setName(profile.preferredName || '');
          setAddr(profile.address || '');
          setUserLoc({ lat: profile.location?.lat?.toString() || '', lng: profile.location?.lng?.toString() || '' });
        }
        setOrders(orderList || []);

        const list = orderList || [];
        const newReject = list.find(o => o.status === 'rejected' && !o.userDismissedRejection);
        const newDelivery = list.find(o => o.status === 'delivered' && !o.userConfirmedReceived && !o.userDidNotReceiveReported);
        const newReportWarning = list.find(o => o.status === 'canceled' && o.cancellationReason && o.userNotifiedOfReport === false);

        if (newReject && !activeRejection) setActiveRejection(newReject);
        if (newReportWarning && !activeReportWarning) setActiveReportWarning(newReportWarning);
        if (newDelivery && !activeDelivery) {
          setActiveDelivery(newDelivery);
          setDeliveryFeedback('prompt');
        }

        if (menuItems) setItems(menuItems);
      } catch (_) {}
    }
  };

  const fetchKitchens = async () => {
    try {
      const ks = await api.getOpenKitchens();
      const m = new Map<string, KitchenProfile>();
      (ks || []).forEach((k: any) => m.set(k.id, k));
      setKitchensCache(m);
    } catch (_) {}
  };

  useEffect(() => {
    const interval = setInterval(fetchAll, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchKitchens, 2000);
    return () => clearInterval(interval);
  }, []);

  // AUTO DISMISS DELIVERY PROMPT (5 SECONDS)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (activeDelivery && deliveryFeedback === 'prompt') {
      timer = setTimeout(() => {
        deliverYes(); // automatically say Yes if they don't respond in 5s
      }, 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeDelivery, deliveryFeedback]);

  // AUTO CANCEL AFTER 10 MINUTES LOGIC
  useEffect(() => {
    const tenMin = 10 * 60 * 1000;
    const interval = setInterval(() => {
      orders.forEach((o: Order) => {
        const createdAtMs = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        if (o.status === "requested" && Date.now() - createdAtMs > tenMin) {
          api.updateOrder(o.id, { status: 'canceled', autoCanceled: true, autoCanceledReason: 'Kitchen did not accept within 10 minutes' }).catch(console.error);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [orders]);

  const saveAddress = async () => {
    await updateDoc(doc(db, 'users', uid), {
      address: addr || '',
      location:
        userLoc.lat && userLoc.lng
          ? { lat: parseFloat(userLoc.lat), lng: parseFloat(userLoc.lng) }
          : null,
      updatedAt: serverTimestamp(),
    });
    setSavedLocation(true);
    setTimeout(() => setSavedLocation(false), 2000);
    Alert.alert('Saved', 'Address saved');
  };

  const [kitchensCache, setKitchensCache] = useState<Map<string, KitchenProfile>>(
    new Map(),
  );
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'kitchens')), (snap) => {
      const m = new Map<string, KitchenProfile>();
      snap.forEach((d) =>
        m.set(d.id, { id: d.id, ...(d.data() as any) }),
      );
      setKitchensCache(m);
    });
    return () => unsub();
  }, []);

  const rankScore = (it: MenuItem, kitchensMap: Map<string, KitchenProfile>) => {
    const k = kitchensMap.get(it.kitchenId);
    if (!k) return 0;
    let score = 0;

    if (addr && k.address) {
      const ua = addr.toLowerCase();
      const ka = k.address.toLowerCase();
      const hit = ['itahari', 'kathmandu', 'lalitpur', 'bhaktapur', 'biratnagar', 'pokhara'].some(
        (t) => ua.includes(t) && ka.includes(t),
      );
      if (hit) score += 1000;
    }

    if (k.location?.lat && k.location?.lng && userLoc.lat && userLoc.lng) {
      const km = haversineKm(
        { lat: parseFloat(userLoc.lat!), lng: parseFloat(userLoc.lng!) },
        { lat: k.location.lat, lng: k.location.lng },
      );
      score += Math.max(0, 200 - Math.min(200, Math.round(km * 20)));
    }

    return score;
  };

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter((it) => {
      if (
        q &&
        !(
          it.name.toLowerCase().includes(q) ||
          it.kitchenName.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });

    const ranked = filtered
      .map((it) => ({ it, s: rankScore(it, kitchensCache) }))
      .sort((a, b) => b.s - a.s || a.it.name.localeCompare(b.it.name))
      .map((x) => x.it);

    if (!nearbyOnly) return ranked;
    // when nearbyOnly = true, prefer high score; basic filter
    return ranked.filter((_, idx) => idx < 60); // same items, just capped
  }, [items, search, nearbyOnly, addr, userLoc, kitchensCache]);

  const openBuy = (it: MenuItem) => {
    setSel(it);
    setQty(1);
    setCOD(true);
    setShow(true);
  };
  const closeBuy = () => setShow(false);

  const totalFor = async (it: MenuItem, quantity: number) => {
    let deliveryFee = 20;
    const kDoc =
      kitchensCache.get(it.kitchenId) ||
      (await (await getDoc(doc(db, 'kitchens', it.kitchenId))).data());
    if (kDoc?.location?.lat && kDoc.location.lng && userLoc.lat && userLoc.lng) {
      const km = haversineKm(
        { lat: parseFloat(userLoc.lat), lng: parseFloat(userLoc.lng) },
        { lat: kDoc.location.lat, lng: kDoc.location.lng },
      );
      deliveryFee = Math.max(20, Math.round(2 * km) + 10);
    }
    return it.price * quantity + deliveryFee;
  };

  const confirmBuy = async () => {
    if (!sel) return;
    try {
      const kDocSnap = await getDoc(doc(db, 'kitchens', sel.kitchenId));
      const kDoc = kDocSnap.data() as any;
      const total = await totalFor(sel, qty);
      await addDoc(collection(db, 'orders'), {
        userId: uid,
        kitchenId: sel.kitchenId,
        kitchenName: kDoc?.preferredName || sel.kitchenName,
        itemId: sel.id,
        itemName: sel.name,
        itemPrice: sel.price,
        quantity: qty,
        paymentMethod: cod ? 'cod' : 'cod',
        userAddress: addr || null,
        kitchenAddress: kDoc?.address || null,
        deliveryFee: total - sel.price * qty,
        total,
        status: 'requested',
        userConfirmedReceived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShow(false);
      Alert.alert('Order placed', 'Waiting for kitchen to accept.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to place order');
    }
  };

  const cancelOrder = async (orderId: string, status: string) => {
    if (status !== 'requested') {
      Alert.alert('Cannot cancel', 'Only pending requests can be canceled.');
      return;
    }
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'canceled',
      updatedAt: serverTimestamp(),
    });
  };

  const reassignOrder = async (o: Order) => {
    await updateDoc(doc(db, 'orders', o.id), {
      status: 'expired_reassign',
      updatedAt: serverTimestamp(),
    });
    Alert.alert('Marked for reassign', 'Pick another kitchen from the list.');
  };

  const logout = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.pageBg }}
        contentContainerStyle={styles.container}
      >
        {/* HEADER */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <Text style={styles.hi}>Hi {name} 👋</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable style={styles.settingsBtn}>
              <Ionicons name="menu" size={18} color={theme.white} />
            </Pressable>
            <Button
              label="Logout"
              color={theme.red}
              onPress={logout}
              style={{ paddingHorizontal: 14 }}
            />
          </View>
        </Animated.View>

        {/* ADDRESS CARD */}
        <Card delay={50} style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={styles.sectionTitle}>Delivery address</Text>
            {savedLocation && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={18} color={theme.green} />
                <Text style={{ color: theme.green, fontSize: 12 }}>Saved</Text>
              </View>
            )}
          </View>

          <TextInput
            value={addr}
            onChangeText={setAddr}
            placeholder="eg. Itahari-4, College Road"
            placeholderTextColor={theme.secondaryText}
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              value={userLoc.lat ?? ''}
              onChangeText={(t) => setUserLoc((s) => ({ ...s, lat: t }))}
              placeholder="Lat (optional)"
              placeholderTextColor={theme.secondaryText}
              style={[styles.input, { flex: 1, minWidth: 0 }]}
              keyboardType="numeric"
            />
            <TextInput
              value={userLoc.lng ?? ''}
              onChangeText={(t) => setUserLoc((s) => ({ ...s, lng: t }))}
              placeholder="Lng (optional)"
              placeholderTextColor={theme.secondaryText}
              style={[styles.input, { flex: 1, minWidth: 0 }]}
              keyboardType="numeric"
            />
          </View>

          <Button label="Save Address" color={theme.blue} onPress={saveAddress} />
        </Card>

        {/* SEARCH */}
        <Card delay={80} style={{ gap: 10 }}>
          <View style={styles.row}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search items or kitchens"
              placeholderTextColor={theme.secondaryText}
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable
              onPress={() => setNearbyOnly((v) => !v)}
              style={[
                styles.pill,
                { backgroundColor: nearbyOnly ? theme.green : theme.gray },
              ]}
            >
              <Text style={styles.pillText}>
                {nearbyOnly ? 'Nearby' : 'All'}
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* MENU */}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>Menu (Online VIP Kitchens)</Text>
          {visibleItems.length === 0 && (
            <Text style={styles.empty}>No items yet.</Text>
          )}

          <View style={styles.itemGrid}>
            {visibleItems.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => openBuy(it)}
                style={styles.itemCard}
              >
                <Image
                  source={{
                    uri: it.imageUrl || 'https://via.placeholder.com/100',
                  }}
                  style={styles.itemImage}
                />
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{it.name}</Text>
                  <Text style={styles.itemMeta}>
                    Rs. {it.price} • {it.kitchenName}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ORDERS */}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>My Orders</Text>
          {orders.length === 0 && (
            <Text style={styles.empty}>No orders yet.</Text>
          )}
          {orders.map((o, idx) => {
            const canCancel = o.status === 'requested';
            const canReassign =
              o.status === 'accepted' &&
              o.acceptedAt &&
              Date.now() - (o.acceptedAt?.toMillis?.() ?? 0) >
                30 * 60 * 1000;
            return (
              <Card
                key={o.id}
                delay={100 + idx * 40}
                style={{ gap: 6 }}
              >
                <Text style={styles.itemTitle}>{o.itemName}</Text>
                <Text style={styles.itemMeta}>
                  {o.kitchenName} • Rs. {o.total}
                </Text>
                <Text style={styles.itemMeta}>
                  Status: {o.status.replace(/_/g, ' ')}
                </Text>
                <View style={styles.row}>
                  {canCancel && (
                    <Button
                      label="Cancel"
                      color={theme.red}
                      onPress={() => cancelOrder(o.id, o.status)}
                    />
                  )}
                  {canReassign && (
                    <Button
                      label="Reassign"
                      color={theme.gray}
                      onPress={() => reassignOrder(o)}
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* BUY MODAL */}
      <Modal visible={show} transparent animationType="fade" onRequestClose={closeBuy}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{sel?.name}</Text>
            <Text style={styles.modalMeta}>Kitchen: {sel?.kitchenName}</Text>

            <View
              style={[
                styles.row,
                { justifyContent: 'space-between', alignItems: 'center' },
              ]}
            >
              <Text style={styles.modalLabel}>Quantity</Text>
              <View style={[styles.row, { alignItems: 'center' }]}>
                <Pressable style={styles.qtyBtn} onPress={dec}>
                  <Text style={styles.qtyText}>−</Text>
                </Pressable>
                <Text style={styles.qtyNum}>{qty}</Text>
                <Pressable style={styles.qtyBtn} onPress={inc}>
                  <Text style={styles.qtyText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View
              style={[
                styles.row,
                { justifyContent: 'space-between', alignItems: 'center' },
              ]}
            >
              <Text style={styles.modalLabel}>Cash on delivery</Text>
              <Pressable
                onPress={() => setCOD((v) => !v)}
                style={[
                  styles.pill,
                  { backgroundColor: cod ? theme.green : theme.gray },
                ]}
              >
                <Text style={styles.pillText}>{cod ? 'ON' : 'OFF'}</Text>
              </Pressable>
            </View>

            <Button
              label="Place order"
              color={theme.blue}
              onPress={confirmBuy}
            />
            <Button label="Close" color={theme.gray} onPress={closeBuy} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.pad,
    gap: 16,
    backgroundColor: theme.pageBg,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hi: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.gray,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 15,
  },
  input: {
    backgroundColor: theme.input,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: theme.text,
    paddingLeft: 4,
  },
  empty: {
    color: theme.secondaryText,
    padding: theme.pad,
    textAlign: 'center',
    fontStyle: 'italic',
    backgroundColor: theme.card,
    borderRadius: theme.radius,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  pillText: {
    color: theme.white,
    fontWeight: '700',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: 150,
    backgroundColor: theme.card,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  itemImage: {
    width: '100%',
    height: 90,
    backgroundColor: theme.gray,
    resizeMode: 'cover',
  },
  itemBody: {
    padding: 8,
  },
  itemTitle: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14,
  },
  itemMeta: {
    color: theme.secondaryText,
    fontSize: 12,
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
  },
  modalLabel: {
    color: theme.white,
    fontWeight: '700',
  },
  qtyBtn: {
    backgroundColor: theme.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qtyText: {
    color: theme.white,
    fontWeight: '800',
    fontSize: 18,
  },
  qtyNum: {
    color: theme.white,
    minWidth: 26,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});
