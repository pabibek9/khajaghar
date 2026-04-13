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
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auth, db } from '../src/constants/firebase';

type Item = {
  id: string; // 🔥 always Firestore doc id
  name: string;
  price: number;
  imageUrl?: string | null;
  createdAt?: any;
};

type Order = {
  id: string;
  itemName: string;
  total: number;
  status:
    | 'requested'
    | 'accepted'
    | 'out_for_delivery'
    | 'delivered'
    | 'canceled'
    | 'rejected'
    | 'expired_reassign';
  userId: string;
  createdAt?: any;
  acceptedAt?: any;
  outForDeliveryAt?: any;
  deliveredAt?: any;
};

// ENHANCED THEME FOR MODERN DARK MODE
const theme = {
  pageBg: '#0A0A0A',
  card: '#1C1C1E',
  input: '#2C2C2E',
  white: '#FFFFFF',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  gray: '#48484A',
  yellow: '#FFCC00',
  text: '#F2F2F7',
  secondaryText: '#8E8E93',
  radius: 14,
  pad: 16,
  shadow: {
    color: '#000',
    opacity: 0.3,
    radius: 10,
    offset: { width: 0, height: 5 },
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
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <Pressable
        onPressIn={inP}
        onPressOut={ouP}
        onPress={onPress}
        style={[styles.button, { backgroundColor: color }, style]}
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

// SMALL MENU CARD
function SmallMenuItemCard({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: (itemId: string) => void;
}) {
  const defaultImage =
    'https://via.placeholder.com/100/2C2C2E/8E8E93?text=Dish';

  return (
    <View style={styles.smallItemContainer}>
      {/* Delete Button */}
      <Pressable
        onPress={() => {
          console.log('Trash pressed for item:', item.id);
          onDelete(item.id);
        }}
        style={styles.deleteButton}
        hitSlop={8}
      >
        <Ionicons name="trash" size={16} color={theme.white} />
      </Pressable>

      <Image
        source={{ uri: item.imageUrl || defaultImage }}
        style={styles.smallItemImage}
      />
      <View style={{ padding: 8 }}>
        <Text numberOfLines={1} style={styles.smallItemTitle}>
          {item.name}
        </Text>
        <Text style={styles.smallItemMeta}>Rs. {item.price}</Text>
      </View>
    </View>
  );
}

// ORDER CARD
function OrderCard({
  order,
  onAccept,
  onReject,
  onStartDelivery,
  onMarkDelivered,
}: {
  order: Order;
  onAccept: (o: Order) => void;
  onReject: (o: Order) => void;
  onStartDelivery: (o: Order) => void;
  onMarkDelivered: (o: Order) => void;
}) {
  const statusColor =
    order.status === 'requested'
      ? theme.yellow
      : order.status === 'accepted'
      ? theme.blue
      : order.status === 'out_for_delivery'
      ? theme.green
      : order.status === 'delivered'
      ? theme.secondaryText
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
        <Button
          label="Start delivery"
          color={theme.blue}
          onPress={() => onStartDelivery(order)}
        />
      )}

      {order.status === 'out_for_delivery' && (
        <Button
          label="Mark delivered"
          color={theme.green}
          onPress={() => onMarkDelivered(order)}
        />
      )}
    </Card>
  );
}

export default function Kitchen() {
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [vip, setVip] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [loc, setLoc] = useState<{ lat?: string; lng?: string }>({});
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<'requests' | 'active' | 'history'>(
    'requests',
  );

  const [requests, setRequests] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);

  const canOperate = vip && isOpen;

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
      setName(
        udata?.preferredName || u.email?.split('@')[0] || 'Kitchen',
      );

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
          list.push({
            ...d,
            id: docx.id, // 🔥 always use Firestore doc ID
          });
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
              o.status === 'out_for_delivery',
          ),
        );
        setHistory(
          all.filter((o) =>
            [
              'delivered',
              'canceled',
              'rejected',
              'expired_reassign',
            ].includes(o.status),
          ),
        );
      });
    });

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
        Alert.alert('Not VIP', 'Admin must grant VIP first.');
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
      }).catch(() => {});
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to toggle');
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
    }).catch(() => {});
    Alert.alert('Saved', 'Kitchen profile updated');
  };

  const [n, setN] = useState('');
  const [p, setP] = useState('');
  const [img, setImg] = useState('');

  const addItem = async () => {
    if (!canOperate) {
      Alert.alert('Closed', 'You must be VIP and Online to add items.');
      return;
    }
    if (!n.trim() || !p.trim()) {
      Alert.alert('Missing', 'Name and price required.');
      return;
    }
    const price = Number(p);
    if (Number.isNaN(price) || price <= 0) {
      Alert.alert('Invalid', 'Price must be a positive number.');
      return;
    }
    await addDoc(collection(db, 'kitchens', uid, 'items'), {
      name: n.trim(),
      price,
      imageUrl: img.trim() || null,
      createdAt: serverTimestamp(),
    });
    setN('');
    setP('');
    setImg('');
  };

  // 🔥 delete item (logs, confirms, updates Firestore + local state)
  const deleteItem = async(itemId: string) => {
    if (!itemId || !uid) {
      Alert.alert('Error', 'Unable to remove this item right now.');
      return;
    }

    const pathInfo = `kitchens/${uid}/items/${itemId}`;
    console.log('Attempting to delete item at:', pathInfo);

    const actuallyDelete = async () => {
      try {
        await deleteDoc(doc(db, 'kitchens', uid, 'items', itemId));
        setItems((prev) => prev.filter((it) => it.id !== itemId));
        console.log('Item deleted:', pathInfo);
      } catch (e: any) {
        console.error('Delete item failed:', e);
        Alert.alert('Error', e?.message || 'Failed to remove item');
      }
    };

    Alert.alert(
      'Remove item?',
      'This will remove the dish from your menu for all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void actuallyDelete();
          },
        },
      ],
    );
  };

  const acceptOrder = async (o: Order) => {
    if (!canOperate) {
      Alert.alert('Closed', 'Go online first.');
      return;
    }
    try {
      await updateDoc(doc(db, 'orders', o.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept order');
    }
  };

  const rejectOrder = async (o: Order) => {
    await updateDoc(doc(db, 'orders', o.id), {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <Card style={{ gap: 10 }}>
        <Text style={styles.headerTitle}>
          Hi {name}{' '}
          <Ionicons
            name="restaurant-outline"
            size={28}
            color={theme.yellow}
          />
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <Text style={[styles.statusText, { color: theme.yellow }]}>
            VIP: true
          </Text>
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
                color: isOpen
                  ? theme.green
                  : theme.secondaryText,
              },
            ]}
          >
            Status: {isOpen ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 10 }]}>
          <Button
            label={isOpen ? 'Stop kitchen' : 'Start kitchen'}
            color={isOpen ? theme.gray : theme.green}
            onPress={toggleOpen}
            style={{ flex: 1 }}
          />
          <Button
            label="Logout"
            color={theme.red}
            onPress={logout}
            style={{ minWidth: 100 }}
          />
        </View>
      </Card>

      {/* Items List */}
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionTitle}>
          Your Menu Items ({items.length})
        </Text>
        {items.length === 0 && (
          <Text style={styles.empty}>
            No items yet. Add something delicious!
          </Text>
        )}

        <View style={styles.itemGrid}>
          {items.map((it) => (
            <SmallMenuItemCard
              key={it.id}
              item={it}
              onDelete={deleteItem}
            />
          ))}
        </View>
      </View>

      {/* Add item */}
      {isOpen ? (
        <Card style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>Add New Menu Item</Text>
          <TextInput
            value={n}
            onChangeText={setN}
            placeholder="Item name"
            placeholderTextColor={theme.secondaryText}
            style={styles.input}
          />
          <TextInput
            value={p}
            onChangeText={setP}
            placeholder="Price (in Rs.)"
            keyboardType="numeric"
            placeholderTextColor={theme.secondaryText}
            style={styles.input}
          />
          <TextInput
            value={img}
            onChangeText={setImg}
            placeholder="Image URL (optional)"
            placeholderTextColor={theme.secondaryText}
            style={styles.input}
          />
          <Button
            label="Add Item to Menu"
            color={theme.green}
            onPress={addItem}
          />
        </Card>
      ) : (
        <Card style={{ gap: 5 }}>
          <Text style={[styles.itemTitle, { color: theme.red }]}>
            Kitchen is Offline
          </Text>
          <Text style={styles.itemMeta}>
            Go online to add items and receive orders.
          </Text>
        </Card>
      )}

      {/* Kitchen profile */}
      <Card style={{ gap: 10 }}>
        <Text style={styles.sectionTitle}>Update Kitchen Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="e.g., Itahari-5, Main Street"
          placeholderTextColor={theme.secondaryText}
          style={styles.input}
        />
        <View style={styles.locationRow}>
          <TextInput
            value={loc.lat ?? ''}
            onChangeText={(t) =>
              setLoc((s) => ({ ...s, lat: t }))
            }
            placeholder="Lat (optional)"
            keyboardType="numeric"
            placeholderTextColor={theme.secondaryText}
            style={[styles.input, styles.locationInput]}
          />
          <TextInput
            value={loc.lng ?? ''}
            onChangeText={(t) =>
              setLoc((s) => ({ ...s, lng: t }))
            }
            placeholder="Lng (optional)"
            keyboardType="numeric"
            placeholderTextColor={theme.secondaryText}
            style={[styles.input, styles.locationInput]}
          />
        </View>
        <Button
          label="Save Profile"
          color={theme.blue}
          onPress={saveProfile}
        />
      </Card>

      {/* Orders tabs */}
      <View
        style={[
          styles.row,
          { justifyContent: 'space-between', marginTop: 10 },
        ]}
      >
        {(['requests', 'active', 'history'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              {
                backgroundColor:
                  tab === t ? theme.blue : theme.gray,
              },
            ]}
          >
            <Text style={styles.tabText}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {/* Orders Content */}
      <View style={{ gap: 10 }}>
        {tab === 'requests' && (
          <>
            <Text style={styles.sectionTitle}>
              Incoming Requests
            </Text>
            {requests.length === 0 && (
              <Text style={styles.empty}>
                No new requests.
              </Text>
            )}
            {requests.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onAccept={acceptOrder}
                onReject={rejectOrder}
                onStartDelivery={startDelivery}
                onMarkDelivered={markDelivered}
              />
            ))}
          </>
        )}

        {tab === 'active' && (
          <>
            <Text style={styles.sectionTitle}>
              Active Orders (Prep/Delivery)
            </Text>
            {active.length === 0 && (
              <Text style={styles.empty}>
                No active orders.
              </Text>
            )}
            {active.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onAccept={acceptOrder}
                onReject={rejectOrder}
                onStartDelivery={startDelivery}
                onMarkDelivered={markDelivered}
              />
            ))}
          </>
        )}

        {tab === 'history' && (
          <>
            <Text style={styles.sectionTitle}>Order History</Text>
            {history.length === 0 && (
              <Text style={styles.empty}>
                No past orders.
              </Text>
            )}
            {history.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onAccept={acceptOrder}
                onReject={rejectOrder}
                onStartDelivery={startDelivery}
                onMarkDelivered={markDelivered}
              />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Global and Structure
  container: {
    padding: theme.pad,
    gap: 24,
    backgroundColor: theme.pageBg,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // Buttons
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // Headings
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
  empty: {
    color: theme.secondaryText,
    padding: theme.pad,
    textAlign: 'center',
    fontStyle: 'italic',
    backgroundColor: theme.card,
    borderRadius: theme.radius,
  },

  // Inputs
  input: {
    backgroundColor: theme.input,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.input,
    fontSize: 15,
  },

  // Location row
  locationRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  locationInput: {
    flex: 1,
    minWidth: 0,
  },

  // Menu grid
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  smallItemContainer: {
    position: 'relative',
    maxWidth: 150,
    backgroundColor: theme.card,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
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
  smallItemImage: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
    backgroundColor: theme.gray,
  },
  smallItemTitle: {
    color: theme.white,
    fontWeight: '600',
    fontSize: 14,
  },
  smallItemMeta: {
    color: theme.secondaryText,
    fontSize: 12,
  },

  // Item listings
  itemTitle: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 17,
  },
  itemMeta: {
    color: theme.secondaryText,
    fontSize: 14,
  },

  // Tabs
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    flex: 1,
    alignItems: 'center',
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  tabText: {
    color: theme.white,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});
