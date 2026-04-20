// client/app/admin.tsx
import { AntDesign, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  SafeAreaView, StatusBar, Linking, Image
} from 'react-native';
import { auth, db } from '../src/constants/firebase';
import { useNotifications } from '../src/components/NotificationProvider';
import NotificationBell from '../src/components/NotificationBell';
import { clearSession } from '../src/services/authService';

// --- ENTERPRISE THEME TOKENS ---
// --- ENTERPRISE THEME TOKENS ---
const theme = {
  bg: '#0A0A0B',
  sidebar: '#121214',
  card: '#18181B',
  header: '#121214',
  border: '#27272A',
  text: '#FAFAFA',
  textDim: '#A1A1AA',
  primary: '#3B82F6', // Modern Blue
  success: '#10B981', // Emerald
  warning: '#F59E0B', // Amber
  danger: '#EF4444',  // Rose
  accent: '#8B5CF6',  // Violet
  radius: 12,
};

const SIDEBAR_WIDTH = 260;
const IS_DESKTOP = Platform.OS === 'web' && Dimensions.get('window').width > 1000;

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, backgroundColor: theme.sidebar, borderRightWidth: 1, borderRightColor: theme.border },
  sidebarCollapsed: { width: 70 },
  logoRow: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 12, height: 80 },
  logoText: { color: theme.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  navScroll: { flex: 1 },
  navGroup: { paddingHorizontal: 16, marginBottom: 24 },
  navGroupTitle: { color: theme.textDim, fontSize: 10, fontWeight: '800', marginBottom: 12, marginLeft: 12, letterSpacing: 0.5 },
  navBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: theme.radius, gap: 12, marginBottom: 4 },
  navBtnActive: { backgroundColor: theme.primary + '15' },
  navBtnText: { color: theme.textDim, fontSize: 14, fontWeight: '600' },
  navBtnTextActive: { color: theme.primary },
  sidebarFooter: { padding: 16, borderTopWidth: 1, borderTopColor: theme.border, gap: 12 },
  sidebarToggle: { alignSelf: 'center', padding: 8, borderRadius: 8, backgroundColor: theme.card },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  logoutText: { color: theme.danger, fontWeight: '700', fontSize: 14 },
  mainArea: { flex: 1 },
  header: { height: 80, backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  headerTitle: { color: theme.text, fontSize: 24, fontWeight: '800' },
  headerSub: { color: theme.textDim, fontSize: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  headerIconBtn: { position: 'relative' },
  notifBadge: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.danger, borderWidth: 1, borderColor: theme.header },
  adminProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  adminAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  adminName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  adminRole: { color: theme.textDim, fontSize: 10 },
  scrollContent: { padding: 24 },
  moduleContent: { gap: 24 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  moduleTitle: { color: theme.text, fontSize: 20, fontWeight: '700' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success },
  liveText: { color: theme.success, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { flex: 1, minWidth: 200, backgroundColor: theme.card, borderRadius: theme.radius, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: theme.border },
  statIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statTitle: { color: theme.textDim, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  statValue: { color: theme.text, fontSize: 24, fontWeight: '800' },
  statSub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  alertItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border + '50' },
  alertText: { color: theme.textDim, fontSize: 13 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  healthLabel: { color: theme.textDim, fontSize: 14 },
  healthStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthStatusText: { fontSize: 12, fontWeight: '700' },
  searchBar: { flex: 1, height: 44, backgroundColor: theme.card, borderRadius: 22, paddingHorizontal: 20, color: theme.text, borderWidth: 1, borderColor: theme.border, maxWidth: 350 },
  filterRow: { marginVertical: 16, height: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.card, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterChipText: { color: theme.textDim, fontSize: 11, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  orderTable: { backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 16, backgroundColor: theme.bg + '50', borderBottomWidth: 1, borderBottomColor: theme.border },
  tableCol: { color: theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border + '50' },
  tableText: { color: theme.text, fontSize: 13, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  placeholderCard: { height: 200, borderRadius: theme.radius, borderStyle: 'dashed', borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  placeholderText: { color: theme.textDim, fontSize: 14 },
  placeholderModule: { flex: 1, height: 500, alignItems: 'center', justifyContent: 'center', gap: 16 },
  placeholderModuleTitle: { color: theme.text, fontSize: 22, fontWeight: '800' },
  placeholderModuleSub: { color: theme.textDim, textAlign: 'center', maxWidth: 400 },
});

// --- TYPES ---
type NavItem = 'dashboard' | 'orders' | 'restaurants' | 'riders' | 'customers' | 'finance' | 'marketing' | 'analytics' | 'support' | 'security' | 'ai';

// --- MODULES ---
const FinanceModule = ({ stats }: { stats: any }) => (
  <View style={styles.moduleContent}>
    <View style={styles.moduleHeader}>
      <View>
        <Text style={styles.moduleTitle}>Financial Ledger</Text>
        <Text style={styles.headerSub}>Revenue, Commissions & Payouts</Text>
      </View>
      <TouchableOpacity style={[styles.filterChip, { backgroundColor: theme.primary }]}>
        <Text style={styles.filterChipTextActive}>GENERATE REPORT (PDF)</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.statsGrid}>
      <StatCard title="Net Platform Revenue" value={`Rs. ${stats.revenue.toLocaleString()}`} sub="Gross Volume" icon="account-balance" color={theme.success} />
      <StatCard title="Commission (15%)" value={`Rs. ${(stats.revenue * 0.15).toLocaleString()}`} sub="Net Profit" icon="trending-up" color={theme.primary} />
      <StatCard title="Vendor Payouts" value={`Rs. ${(stats.revenue * 0.85).toLocaleString()}`} sub="Pending 24h" icon="outbox" color={theme.warning} />
    </View>

    <View style={[styles.card, { padding: 24 }]}>
      <Text style={styles.cardTitle}>Recent Financial Activity</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCol, { flex: 1 }]}>TYPE</Text>
        <Text style={[styles.tableCol, { flex: 3 }]}>ENTITY</Text>
        <Text style={[styles.tableCol, { flex: 1 }]}>AMOUNT</Text>
        <Text style={[styles.tableCol, { flex: 1 }]}>STATUS</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableText, { flex: 1 }]}>Payout</Text>
        <Text style={[styles.tableText, { flex: 3 }]}>Kitchen Central Plaza</Text>
        <Text style={[styles.tableText, { flex: 1 }]}>Rs. 8,200</Text>
        <Text style={[styles.badgeText, { color: theme.success, flex: 1 }]}>COMPLETED</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableText, { flex: 1 }]}>Refund</Text>
        <Text style={[styles.tableText, { flex: 3 }]}>Order #A2891 (Customer: John)</Text>
        <Text style={[styles.tableText, { flex: 1 }]}>Rs. 450</Text>
        <Text style={[styles.badgeText, { color: theme.danger, flex: 1 }]}>DEBITED</Text>
      </View>
    </View>
  </View>
);
const DashboardModule = ({ stats }: { stats: any }) => (
  <View style={styles.moduleContent}>
    <View style={styles.moduleHeader}>
      <View>
        <Text style={styles.moduleTitle}>System Command Center</Text>
        <Text style={styles.headerSub}>Real-time monitoring & platform health</Text>
      </View>
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE UPDATES</Text>
      </View>
    </View>

    <View style={styles.statsGrid}>
      <StatCard
        title="Total Orders"
        value={stats.totalOrders.toString()}
        sub="+12% today"
        icon="shopping-bag"
        color={theme.primary}
      />
      <StatCard
        title="Revenue (Daily)"
        value={`Rs. ${stats.revenue.toLocaleString()}`}
        sub="+8% vs avg"
        icon="payments"
        color={theme.success}
      />
      <StatCard
        title="Active Riders"
        value={stats.activeRiders.toString()}
        sub="Wait: ~5m"
        icon="moped"
        color={theme.warning}
      />
      <StatCard
        title="Online Kitchens"
        value={stats.onlineKitchens.toString()}
        sub="Capacity: 84%"
        icon="restaurant"
        color={theme.accent}
      />
    </View>

    {/* Real-time Order Stream / Alerts Section */}
    <View style={{ flexDirection: 'row', gap: 24 }}>
      <View style={[styles.card, { flex: 2, padding: 20 }]}>
        <Text style={styles.cardTitle}>Recent Anomalies / Alerts</Text>
        <View style={styles.alertItem}>
          <MaterialIcons name="error-outline" size={20} color={theme.danger} />
          <Text style={styles.alertText}>Order #829A delayed (Prep time {'>'} 25m)</Text>
        </View>
        <View style={styles.alertItem}>
          <MaterialIcons name="warning-amber" size={20} color={theme.warning} />
          <Text style={styles.alertText}>Rider shortage detected in Kathmandu Central</Text>
        </View>
      </View>

      <View style={[styles.card, { flex: 1, padding: 20 }]}>
        <Text style={styles.cardTitle}>System Health</Text>
        <HealthRow label="API Gateway" status="Operational" color={theme.success} />
        <HealthRow label="Database (Firestore)" status="Stable" color={theme.success} />
        <HealthRow label="Dispatch Engine" status="Scaling" color={theme.primary} />
      </View>
    </View>

    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderText}>Revenue Growth (Victory Charts) & AI Demand Forecasting (Phase 5)</Text>
    </View>
  </View>
);

const OrdersModule = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const rows: any[] = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      setOrders(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const term = search.toLowerCase();
      const matchSearch = !term ||
        o.id.toLowerCase().includes(term) ||
        (o.customerName || '').toLowerCase().includes(term) ||
        (o.kitchenName || '').toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus, updatedAt: serverTimestamp() });
    } catch (e) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  return (
    <View style={styles.moduleContent}>
      <View style={styles.moduleHeader}>
        <View>
          <Text style={styles.moduleTitle}>Order Control Center</Text>
          <Text style={styles.headerSub}>Manage all platform orders and logic</Text>
        </View>
        <TextInput
          style={styles.searchBar}
          placeholder="Search by ID, User, Kitchen..."
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['all', 'requested', 'accepted', 'preparing', 'waiting_rider', 'picked_up', 'on_the_way', 'delivered', 'canceled'].map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s.toUpperCase().replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.orderTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCol, { flex: 1.5 }]}>ORDER ID</Text>
          <Text style={[styles.tableCol, { flex: 2 }]}>CUSTOMER</Text>
          <Text style={[styles.tableCol, { flex: 2 }]}>KITCHEN</Text>
          <Text style={[styles.tableCol, { flex: 1.5 }]}>STATUS</Text>
          <Text style={[styles.tableCol, { flex: 1 }]}>TOTAL</Text>
          <Text style={[styles.tableCol, { flex: 1.5 }]}>ACTIONS</Text>
        </View>

        {loading ? <ActivityIndicator style={{ margin: 40 }} /> : filtered.map(o => (
          <View key={o.id} style={styles.tableRow}>
            <Text style={[styles.tableText, { flex: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>#{o.id.slice(-6).toUpperCase()}</Text>
            <Text style={[styles.tableText, { flex: 2 }]}>{o.customerName || 'Guest'}</Text>
            <Text style={[styles.tableText, { flex: 2 }]}>{o.kitchenName}</Text>
            <View style={{ flex: 1.5 }}>
              <View style={[styles.badge, { backgroundColor: getStatusColor(o.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(o.status) }]}>{o.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.tableText, { flex: 1, fontWeight: '700' }]}>Rs. {o.total}</Text>
            <View style={{ flex: 1.5, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => updateStatus(o.id, 'canceled')}>
                <MaterialIcons name="cancel" size={20} color={theme.danger} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('History', 'Timeline coming soon')}>
                <MaterialIcons name="history" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const getStatusColor = (s: string) => {
  switch (s) {
    case 'requested': return theme.primary;
    case 'accepted': return theme.accent;
    case 'preparing': return theme.warning;
    case 'delivered': return theme.success;
    case 'canceled':
    case 'rejected': return theme.danger;
    default: return theme.textDim;
  }
};

const HealthRow = ({ label, status, color }: { label: string, status: string, color: string }) => (
  <View style={styles.healthRow}>
    <Text style={styles.healthLabel}>{label}</Text>
    <View style={styles.healthStatus}>
      <View style={[styles.liveDot, { backgroundColor: color }]} />
      <Text style={[styles.healthStatusText, { color }]}>{status}</Text>
    </View>
  </View>
);

const StatCard = ({ title, value, sub, icon, color }: { title: string, value: string, sub: string, icon: any, color: string }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
      <MaterialIcons name={icon} size={24} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statSub, { color }]}>{sub}</Text>
    </View>
  </View>
);

const RestaurantsModule = () => (
  <View style={styles.placeholderModule}>
    <MaterialIcons name="restaurant" size={64} color={theme.border} />
    <Text style={styles.placeholderModuleTitle}>Restaurant Management</Text>
    <Text style={styles.placeholderModuleSub}>Approval flow & performance tracking coming in Phase 4.</Text>
  </View>
);

const RidersFleetModule = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'riders'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setRiders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return riders.filter(r => {
      const matchFilter = filter === 'all' || 
        (filter === 'pending' && !r.approved) || 
        (filter === 'approved' && r.approved);
      const term = search.toLowerCase();
      const matchSearch = !term || 
        (r.name || '').toLowerCase().includes(term) || 
        (r.email || '').toLowerCase().includes(term) || 
        (r.phone || '').toLowerCase().includes(term);
      return matchFilter && matchSearch;
    });
  }, [riders, search, filter]);

  const approveRider = async (riderId: string) => {
    try {
      await updateDoc(doc(db, 'users', riderId), { 
        approved: true, 
        riderStatus: 'active', 
        updatedAt: serverTimestamp() 
      });
      await updateDoc(doc(db, 'riders', riderId), { 
        approved: true, 
        riderStatus: 'active', 
        updatedAt: serverTimestamp() 
      });
      Alert.alert('Success', 'Rider approved successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to approve rider');
    }
  };

  return (
    <View style={styles.moduleContent}>
      <View style={styles.moduleHeader}>
        <View>
          <Text style={styles.moduleTitle}>Rider & Fleet Management</Text>
          <Text style={styles.headerSub}>Manage driver verification and performance</Text>
        </View>
        <TextInput
          style={styles.searchBar}
          placeholder="Search riders..."
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {['all', 'pending', 'approved'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f as any)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.orderTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCol, { flex: 2 }]}>RIDER</Text>
          <Text style={[styles.tableCol, { flex: 1.5 }]}>VEHICLE</Text>
          <Text style={[styles.tableCol, { flex: 1.5 }]}>STATUS</Text>
          <Text style={[styles.tableCol, { flex: 2 }]}>DOCUMENTS</Text>
          <Text style={[styles.tableCol, { flex: 1.5 }]}>ACTIONS</Text>
        </View>

        {loading ? <ActivityIndicator style={{ margin: 40 }} /> : filtered.map(r => (
          <View key={r.id} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.tableText}>{r.name || 'N/A'}</Text>
              <Text style={[styles.tableText, { fontSize: 11, color: theme.textDim }]}>{r.email}</Text>
            </View>
            <Text style={[styles.tableText, { flex: 1.5 }]}>{r.vehicleType || 'N/A'}</Text>
            <View style={{ flex: 1.5 }}>
              <View style={[styles.badge, { backgroundColor: (r.approved ? theme.success : theme.warning) + '20' }]}>
                <Text style={[styles.badgeText, { color: r.approved ? theme.success : theme.warning }]}>
                  {r.approved ? 'APPROVED' : 'PENDING'}
                </Text>
              </View>
            </View>
            <View style={{ flex: 2, flexDirection: 'row', gap: 12 }}>
              {r.licenseUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(r.licenseUrl)}>
                  <MaterialIcons name="assignment-ind" size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
              {r.citizenshipIdUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(r.citizenshipIdUrl)}>
                  <MaterialIcons name="badge" size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1.5, flexDirection: 'row', gap: 12 }}>
              {!r.approved && (
                <TouchableOpacity onPress={() => approveRider(r.id)}>
                  <MaterialIcons name="check-circle" size={24} color={theme.success} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => Alert.alert('Rider Details', `Phone: ${r.phone}\nVehicle: ${r.vehicleType}`)}>
                <MaterialIcons name="info" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {filtered.length === 0 && !loading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: theme.textDim }}>No riders found matching your criteria.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- MAIN ADMIN PANEL ---
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<NavItem>('dashboard');
  const { unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!IS_DESKTOP);

  // Platform Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    activeRiders: 0,
    onlineKitchens: 0
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check for Admin Role
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));

      if (snap.empty) {
        Alert.alert('Access Denied', 'Admin profile not found.');
        clearSession().then(() => signOut(auth));
        return;
      }

      const userData = snap.docs[0].data();
      if (userData.role !== 'admin') {
        Alert.alert('Access Denied', 'This panel is for administrators only.');
        clearSession().then(() => signOut(auth));
        return;
      }

      setIsAdmin(true);
      setLoading(false);

      // Start Stats Listeners
      setupStatsListeners();
    });
    return () => unsub();
  }, []);

  const setupStatsListeners = () => {
    // 1. Orders Count (All time for now, can be daily)
    const ordersUnsub = onSnapshot(collection(db, 'orders'), (snap) => {
      let revenue = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.status === 'delivered') revenue += (data.total || 0);
      });
      setStats(prev => ({
        ...prev,
        totalOrders: snap.size,
        revenue: revenue
      }));
    });

    // 2. Active Riders
    const ridersUnsub = onSnapshot(query(collection(db, 'users'), where('role', '==', 'rider'), where('approved', '==', true), where('banned', '==', false)), (snap) => {
      setStats(prev => ({ ...prev, activeRiders: snap.size }));
    });

    // 3. Online Kitchens
    const kitchensUnsub = onSnapshot(query(collection(db, 'users'), where('role', '==', 'kitchen'), where('isOpen', '==', true)), (snap) => {
      setStats(prev => ({ ...prev, onlineKitchens: snap.size }));
    });
  };

  const handleLogout = async () => {
    try {
      await clearSession();
      await signOut(auth);
      router.replace('/login');
    } catch (e) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textDim, marginTop: 12 }}>Securing Command Center...</Text>
      </View>
    );
  }

  const NavButton = ({ id, label, icon, group = false }: { id: NavItem, label: string, icon: any, group?: boolean }) => {
    const active = activeTab === id;
    return (
      <TouchableOpacity
        style={[styles.navBtn, active && styles.navBtnActive]}
        onPress={() => setActiveTab(id)}
      >
        <MaterialIcons name={icon} size={22} color={active ? theme.primary : theme.textDim} />
        {!sidebarCollapsed && <Text style={[styles.navBtnText, active && styles.navBtnTextActive]}>{label}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- SIDEBAR --- */}
      <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
        <View style={styles.logoRow}>
          <Image
            source={require('../assets/images/no bg .png')}
            style={{ width: 36, height: 36, resizeMode: 'contain' }}
          />
          {!sidebarCollapsed && <Text style={styles.logoText}>KHAJAGHAR <Text style={{ color: theme.primary }}>ADMIN</Text></Text>}
        </View>

        <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.navGroup}>
            {!sidebarCollapsed && <Text style={styles.navGroupTitle}>CORE OPERATIONS</Text>}
            <NavButton id="dashboard" label="Dashboard" icon="dashboard" />
            <NavButton id="orders" label="Live Orders" icon="shopping-cart" />
            <NavButton id="restaurants" label="Restaurants" icon="restaurant" />
            <NavButton id="riders" label="Rider Approval" icon="moped" />
          </View>

          <View style={styles.navGroup}>
            {!sidebarCollapsed && <Text style={styles.navGroupTitle}>BUSINESS TOOLS</Text>}
            <NavButton id="finance" label="Finance & Payouts" icon="payments" />
            <NavButton id="marketing" label="Marketing" icon="campaign" />
            <NavButton id="analytics" label="Market Insights" icon="bar-chart" />
          </View>

          <View style={styles.navGroup}>
            {!sidebarCollapsed && <Text style={styles.navGroupTitle}>MANAGEMENT</Text>}
            <NavButton id="customers" label="Customers" icon="people" />
            <NavButton id="support" label="Support Hub" icon="support-agent" />
            <NavButton id="security" label="Security & Logs" icon="admin-panel-settings" />
            <NavButton id="ai" label="AI Automation" icon="auto-awesome" />
          </View>
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={styles.sidebarToggle}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <MaterialIcons name={sidebarCollapsed ? "chevron-right" : "chevron-left"} size={20} color={theme.textDim} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={theme.danger} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Logout</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* --- MAIN CONTENT AREA --- */}
      <View style={styles.mainArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</Text>
            <Text style={styles.headerSub}>Platform Management • Real-time</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell 
              count={unreadCount} 
              onPress={() => setActiveTab('orders')} 
              color={theme.textDim}
            />
            <View style={styles.adminProfile}>
              <View style={styles.adminAvatar}>
                <Text style={styles.adminAvatarText}>AD</Text>
              </View>
              {IS_DESKTOP && (
                <View>
                  <Text style={styles.adminName}>Super Admin</Text>
                  <Text style={styles.adminRole}>Master Access</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Content Module Switcher */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'dashboard' && <DashboardModule stats={stats} />}
          {activeTab === 'orders' && <OrdersModule />}
          {activeTab === 'restaurants' && <RestaurantsModule />}
          {activeTab === 'riders' && <RidersFleetModule />}
          {activeTab === 'finance' && <FinanceModule stats={stats} />}
          {!['dashboard', 'orders', 'restaurants', 'riders', 'finance'].includes(activeTab) && (
            <View style={styles.placeholderModule}>
              <Ionicons name="construct-outline" size={64} color={theme.border} />
              <Text style={styles.placeholderModuleTitle}>Module Under Construction</Text>
              <Text style={styles.placeholderModuleSub}>The {activeTab} system is scheduled for implementation in Phase 5.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
