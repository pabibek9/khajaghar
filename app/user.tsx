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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth, db } from '../src/constants/firebase';
import {
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

import { Platform, ActivityIndicator, Dimensions } from 'react-native';
import { googleProvider } from '../src/constants/firebase';
import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';

import { useNotifications } from '../src/components/NotificationProvider';
import NotificationBell from '../src/components/NotificationBell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { clearSession } from '../src/services/authService';
import SkeletonLoader from '../src/components/SkeletonLoader';
import ThemedLoader, { QUOTES } from '../src/components/ThemedLoader';
import EmptyState from '../src/components/EmptyState';
import { usePullToRefresh } from '../src/hooks/usePullToRefresh';

// --- New hooks and service layer ---
import { useUserProfile } from '../src/hooks/data/useUserProfile';
import { useMenu } from '../src/hooks/data/useMenu';
import { useOrders } from '../src/hooks/data/useOrders';
import { useCreateOrder, useUpdateOrder, useCancelOrder } from '../src/hooks/queries/mutations';


// Reverted to dark theme while keeping the primary accent for new UI elements
const theme = {
  pageBg: '#0A0A0A',
  card: '#1C1C1E',
  input: '#2C2C2E',
  text: '#F2F2F7',
  white: '#FFFFFF',
  secondaryText: '#8E8E93',
  primary: '#FF5C2A', // Vibrant orange accent
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  gray: '#48484A',
  dark: '#000000',
  yellow: '#FFCC00',
  radius: 14,
  pad: 16,
  shadow: {
    color: '#000',
    opacity: 0.3,
    radius: 10,
    offset: { width: 0, height: 5 },
  },
};

const CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🍴' },
  { id: 'veg', name: 'Veg', emoji: '🟢' },
  { id: 'non-veg', name: 'Non-veg', emoji: '🔴' },
  { id: 'vegan', name: 'Vegan', emoji: '🌱' },
];

const FOOD_TYPES = [
  { id: 'burger', name: 'Burger', emoji: '🍔' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'momo', name: 'Momo', emoji: '🥟' },
  { id: 'biryani', name: 'Biryani', emoji: '🍲' },
  { id: 'noodles', name: 'Noodles', emoji: '🍜' },
  { id: 'dessert', name: 'Dessert', emoji: '🍰' },
  { id: 'drinks', name: 'Drinks', emoji: '🥤' },
];


const FLIRTY_GREETINGS = [
  // English
  "Are you a pizza? Because you've got a pizza my heart 🍕",
  "Is your name Wi-Fi? Because I'm feeling a strong connection to this menu 🍔",
  "You're the mac to my cheese 🧀",
  "Hungry for love, or just hungry? 🤤",
  "You looking like a snack today! 🍟",
  "I love you from my head tomatoes 🍅",
  "Let's give 'em something to taco 'bout 🌮",
  "You guac my world 🥑",
  "You're my soy-mate 🍣",
  "I'm soy into you! 🍜",
  "You're my everything bagel 🥯",
  "I'm donuts about you 🍩",
  "You hold the ki-wi to my heart 🥝",
  "I love you berry much 🍓",
  "We make a great pear 🍐",
  "You're one in a melon 🍉",
  "I find you a-peel-ing 🍌",
  "Words can't espresso how much you mean to me ☕",
  "You're looking spicy today! 🌶️",
  "I'm kind of a big dill 🥒",
  "You're the apple of my ribeye 🥩",
  "Olive you so much 🫒",
  "You're my butter half 🧈",
  "I'm nacho average delivery app 🌮",
  "Looking sweet as honey today 🍯",
  "Are you food? Because suddenly I'm craving you more than my midnight snacks.",
  "My stomach said pizza, but my heart said you.",
  "I came for the food… but somehow you became my favorite flavor.",
  "If you were on the menu, I'd order you every day.",
  "I thought I was hungry for fries… turns out I was just hungry for you.",
  "Some people crave chocolate, I crave your attention.",
  "This food is good… but sharing it with you would make it perfect.",
  "You must be a secret ingredient, because everything feels better when you're around.",
  "Forget dessert, you're already the sweetest thing here.",
  "My diet plan failed the moment you became my favorite craving.",

  // Hindi
  "Kya aap burger ho? Kyunki aap mere dil ke paas ho 🍔",
  "Bhook lagi hai ya sirf meri yaad aayi? 😏",
  "Momo se bhi zyada hot lag rahe ho aaj 🔥",
  "Aapke bina khana feeka lagta hai 🥺",
  "Pizza se pyaar hai ya mujhse? 🍕",
  "Aapki smile jalebi ki tarah meethi hai 🥨",
  "Kya menu mein aapko order kar sakta hoon? 😉",
  "Biryani ho aap, har roz chahiye 🍲",
  "Kuch teekha ho jaye, ya aap already kaafi ho? 🌶️",
  "Mera dil butter chicken ki tarah pighal gaya 🍗",
  "Aap mere chai ki patti ho ☕",
  "Samosa bina aloo kaisa? Mai aapke bina waisa 🥟",
  "Aap ho toh har din diwali, warna khali thali 🍽️",
  "Golgappa ho tum, dekh ke mooh mein paani aa gaya 🤤",
  "Kya aap momos ki lal chutney ho? Boht teekhi ho! 🌶️",
  "Aap paneer jaisi soft ho 🧀",
  "Aap mere dil ka thikana ho, jaise pet ka khana ho 💖",
  "Rasgulla jaisi baatein hain aapki ⚪",
  "Aapko dekhte hi bhook aur badh jaati hai 😋",
  "Dil maange more, pet maange food! 🍕",
  "Aapke saath toh lauki bhi tasty lagti hai 🥒",
  "Khana toh bahana hai, asli maksad toh aapse milna hai 😉",
  "Aap mere jivan ka tadka ho 🍲", // Tadka emoji
  "Aloo paratha with makkhan, you with me! 🧈",
  "Chole bhature jaisi jodi hai hamari 🍛",
  "Jab bhi dil bhookha ho, khana Khaja se mangata hoon… par asli craving toh tumhari hai.",
  "Khaja se khana jaldi aa jata hai, kaash tum bhi meri zindagi mein aise hi delivery ho jaate.",
  "Aaj Khaja se khana order kiya hai… par dil abhi bhi tumhe add to cart karna chahta hai.",
  "Khaja se khana toh roz aata hai, par tum jaisi special delivery abhi tak nahi aayi.",
  "Khaja ka delivery boy darwaza khatkhatata hai… kaash ek din tum surprise delivery ban kar aa jao.",
  "Bhook lage toh Khaja hai… par dil lage toh bas tum ho.",
  "Khaja par khana dhoondh raha tha, lekin dil ne kaha ‘tumhe hi order kar lo.’",
  "Khaja se khana 30 minute mein mil jata hai… par tumhara reply usse bhi zyada intezaar karwata hai.",
  "Khana Khaja se aata hai… aur muskaan tumhara naam dekh kar.",
  "Khaja se khana order kiya tha, lekin dil ne kaha asli treat toh tum ho.",

  // Nepali
  "Momo bhanda mitho timi chau 🥟",
  "Bhok lagyo? Khana khane haina? 😋",
  "Suntala jasto muskan timro 🍊",
  "Chowmein ko pyala, timi chau babal 🍜",
  "Timi bina ko jindagi, chiya bina ko churot jastai ho ☕",
  "Sel roti jastai golo golo kura nagara na 😉",
  "Dal bhat power, 24 hour! Tara timi ta mero lifetime power 🍛",
  "Timro mayale malai bhokai lagdaina 😍",
  "Chatpate bhanda piro chau timi 🌶️",
  "Timi Mero Jivan ko Sekuwa ho 🍢",
  "Momo ko achar jastai spicy chau 🔥",
  "Aaba ta bhok pani badhyo timlai dekhera 🤤",
  "Baluwa ma pani, mero dil ma timi 💧",
  "Timi mero dhido ma ghyu jastai chau 🧈",
  "Yesto mitho kura na gara, cheeni lagla 🍬",
  "Kasam, timi ta gundruk ko achar bhanda ni khatra chau 🥬",
  "Timi lai herna paye pachi, thukpa pani chaindana 🍜",
  "Aalu tama ko swad, timro mayako yaad 🍲",
  "Timi lai bhetera aaja bhok nai haraayo... Haina kya, badhyo! 🍕",
  "Kaha thiyau timi yati barsa? Khaja khana mildaina? 🍽️",
  "Timro ra mero jodi ta khasi ko masu ra chiura jastai chha 🐐",
  "Sukkha roti khada pani timro yad le rasilo huncha 🫓",
  "Timlai k bhanu, sweet ki spicy? 🌶️🍫",
  "Timro lagi ta chow chow ni falame ma pakauchu 🍜",
  "Timi lai herna ta malai kaile pani bhok lagdaina, eh wait lagcha! 👀",
  "Timro yaad aauda bhok jhan badhcha… momo ra timi duita nai chahiyo malai 🥟😉",
  "Chatpate jasto piro mood cha aaja… ek plate le matra satisfy hudaina 🌶️😏",
  "Chowmein ko smell aayo ki control garna garo huncha 🤤🍜",
  "Diet bholi bata start huncha… aaja ta jhan mitho khana khanu parcha 😋🍕",
  "Momo ko achar jasto piro kura garne man cha aaja 🔥🥟",
  "Late night bhok sabai bhanda dangerous huncha… ekdam mitho khana chahiyo 🌙🍔",
  "Timi jasto mitho kura, ani mitho dessert… perfect combo ho 🍰😉",
  "Bhok lagyo bhane simple khana hudaina… ali piro, ali juicy chahiyo 😏🍗",
  "Panipuri jasto surprise bhari khana… ek patak khaye pachi roknai garo huncha 🤤🥙",
  "Mitho khana dekhe pachi control hudaina… dil le bhanchha ‘aaja cheat day ho’ 😋🔥",

];

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

function AnimatedCheckmark() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const circleScale = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1.2, 1],
  });

  const shortWidth = progress.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [0, 0, 14, 14],
  });

  const longHeight = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 24],
  });

  return (
    <Animated.View style={[styles.tickCircle, { transform: [{ scale: circleScale }] }]}>
      <View style={{ width: 14, height: 24, transform: [{ translateY: -4 }, { translateX: -1 }, { rotate: '45deg' }] }}>
        {/* Short part of check (draws from left tip towards vertex) */}
        <Animated.View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 5,
          width: shortWidth,
          backgroundColor: theme.white,
          borderTopLeftRadius: 2.5,
          borderBottomLeftRadius: 2.5,
        }} />
        {/* Long part of check (draws from vertex towards top right) */}
        <Animated.View style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 5,
          height: longHeight,
          backgroundColor: theme.white,
          borderTopRightRadius: 2.5,
          borderTopLeftRadius: 2.5,
          borderBottomRightRadius: 2.5,
        }} />
      </View>
    </Animated.View>
  );
}

function CelebrationSuccess({ children }: any) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center' }}>
      {children}
    </Animated.View>
  );
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
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[styles.button, { backgroundColor: color, width: '100%' }]}
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

function getStatusColor(status: string) {
  switch (status) {
    case 'requested':
    case 'pending': return theme.blue;
    case 'accepted':
    case 'kitchen_preparing': return theme.blue;
    case 'waiting_rider': return theme.blue;
    case 'rider_assigned':
    case 'assigned_to_rider':
    case 'picked_up':
    case 'on_the_way':
    case 'out_for_delivery': return theme.green;
    case 'rider_cancel_requested':
    case 'rider_cancel_approved':
    case 'rider_reported_not_returned': return theme.yellow;
    case 'delivered': return theme.secondaryText;
    case 'canceled':
    case 'rejected': return theme.red;
    case 'expired_reassign': return theme.gray;
    default: return theme.secondaryText;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'requested':
    case 'pending': return 'PENDING';
    case 'accepted': return 'ACCEPTED';
    case 'kitchen_preparing': return 'PREPARING FOOD';
    case 'waiting_rider': return 'WAITING FOR RIDER';
    case 'rider_assigned':
    case 'assigned_to_rider': return 'RIDER ASSIGNED';
    case 'rider_cancel_requested':
    case 'rider_cancel_approved':
    case 'rider_reported_not_returned': return 'RIDER DELAYED';
    case 'picked_up': return 'PICKED UP';
    case 'on_the_way': return 'RIDER IS ON THE WAY!';
    case 'out_for_delivery': return 'OUT FOR DELIVERY';
    default: return status.replace(/_/g, ' ').toUpperCase();
  }
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
  dietary?: string;
  outOfStock?: boolean;
  totalRating?: number;
  ratingCount?: number;
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
  itemId?: string;
  itemName: string;
  total: number;
  kitchenId: string;
  kitchenName: string;
  createdAt?: any;
  acceptedAt?: any;
  outForDeliveryAt?: any;
  deliveredAt?: any;
  autoCanceled?: boolean;
  autoCanceledReason?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  userNotifiedOfReport?: boolean;
  userDismissedRejection?: boolean;
  userConfirmedReceived?: boolean;
  userDidNotReceiveReported?: boolean;
  rating?: number;
  ratingComment?: string;
  updatedAt?: any;
};

// ─── Stagger animation helper ────────────────────────────────────────────────
function useStaggerFadeIn(index: number) {
  const delay = Math.min(index * 80, 400);
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [a, delay]);
  const style = {
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };
  return style;
}

// ─── Staggered Pick Card (memoized) ──────────────────────────────────────────
const StaggeredPickCard = React.memo(function StaggeredPickCard({
  it,
  index,
  onPress,
}: {
  it: MenuItem;
  index: number;
  onPress: (item: MenuItem) => void;
}) {
  const staggerStyle = useStaggerFadeIn(index);
  return (
    <Animated.View style={staggerStyle}>
      <Pressable onPress={() => onPress(it)} style={styles.pickCard}>
        <View style={styles.pickImageContainer}>
          <Image
            source={{ uri: it.imageUrl || 'https://via.placeholder.com/300' }}
            style={[styles.pickImage, it.outOfStock && { opacity: 0.5 }]}
          />
          {it.outOfStock && (
            <View style={styles.userOutOfStockBanner}>
              <Text style={styles.userOutOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
          <View style={styles.heartBtn}>
            <Ionicons name="heart-outline" size={16} color={theme.primary} />
          </View>
          {it.dietary && (
            <View style={[styles.dietaryIcon, {
              backgroundColor: it.dietary === 'Veg' ? theme.green
                : it.dietary === 'Vegan' ? '#00C9A7' : theme.red
            }]}>
              <Text style={{ fontSize: 10 }}>
                {it.dietary === 'Veg' ? '🟢' : it.dietary === 'Vegan' ? '🌱' : '🔴'}
              </Text>
            </View>
          )}
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color={theme.white} />
            <Text style={styles.timeText}>31 min</Text>
          </View>
        </View>
        <View style={styles.pickBody}>
          <Text style={styles.pickTitle} numberOfLines={1}>{it.name}</Text>
          <View style={styles.pickSubtitleRow}>
            <Ionicons name="storefront" size={12} color={theme.primary} />
            <Text style={styles.pickKitchen} numberOfLines={1}>{it.kitchenName}</Text>
          </View>
          <View style={styles.pickRatingRow}>
            <Text style={styles.pickRating}>
              {it.ratingCount && it.ratingCount > 0
                ? ((it.totalRating || 0) / it.ratingCount).toFixed(1)
                : 'New'}
            </Text>
            <Ionicons name="star" size={10} color={theme.yellow} />
            <Text style={styles.pickReviews}>({it.ratingCount || 0}+)</Text>
          </View>
          <View style={styles.pickFooterRow}>
            <Text style={styles.deliveryFee}>RS 0 Delivery fee upto RS 500</Text>
            <View style={styles.priceBtn}>
              <Text style={styles.priceText}>Rs. {it.price}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function UserHome() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = Dimensions.get('window');
  const pickCardWidth = 200; // Restoring to a larger "default" size
  const pickGap = 16;
  // Calculate the total width needed for 5 items in the horizontal scroll
  const topPicksContainerWidth = (pickCardWidth + pickGap) * 5;
  const [newMobilePassword, setNewMobilePassword] = useState('');
  const [remarks, setRemarks] = useState('');
  // --- User profile ---
  const userId = auth.currentUser?.uid || '';
  const { user, isLoading: isProfileLoading, updateProfile } = useUserProfile({ userId });
  const name = user?.preferredName || user?.email?.split('@')[0] || 'User';
  const addr = user?.address || '';
  const email = user?.email || '';
  const phone = user?.phone || '';
  const userLoc = user?.location || {};

  // --- Menu items (with filtering) ---
  const {
    items,
    isLoading: isMenuLoading,
    visibleItems,
    filters,
    setSearch,
    setDietary,
    refresh: refreshMenu,
  } = useMenu({
    userAddress: addr,
    userLat: user?.location?.lat ?? null,
    userLng: user?.location?.lng ?? null,
  });

  // --- Orders ---
  const {
    orders,
    activeOrders,
    historyOrders,
    isLoading: isOrdersLoading,
  } = useOrders({ userId });
  // UI state only (keep these)
  const [show, setShow] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [cod, setCOD] = useState(true);
  const [savedLocation, setSavedLocation] = useState(false);
  const [tab, setTab] = useState<'menu' | 'active' | 'history' | 'profile'>('menu');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeFoodType, setActiveFoodType] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | 'month'>('today');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'delivered' | 'rejected'>('all');
  const [activeRejection, setActiveRejection] = useState<any>(null);
  const [activeDelivery, setActiveDelivery] = useState<any>(null);
  const [activeReportWarning, setActiveReportWarning] = useState<any>(null);
  const [deliveryFeedback, setDeliveryFeedback] = useState<'prompt' | 'yes' | 'no'>('prompt');
  const [reviewingOrder, setReviewingOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [greeting, setGreeting] = useState('');
  const { unreadCount } = useNotifications();
  const headerFade = useMountFade(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const searchPlaceholderAnim = useRef(new Animated.Value(0)).current;
  const SEARCH_TERMS = [
    'Momo', 'C-Momo', 'Cheeseburger', 'Pepperoni Pizza', 'Chicken Biryani',
    'Buffalo Wings', 'Veg Chowmein', 'Paneer Butter Masala', 'Thukpa',
    'Mutton Sekuwa', 'Keema Noodles', 'Crispy Jalebi', 'Refreshing Lassi'
  ];

  useEffect(() => {
    const startAnimation = () => {
      // Fade out and slide up
      Animated.timing(searchPlaceholderAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }).start(() => {
        setSearchPlaceholderIndex((prev) => (prev + 1) % SEARCH_TERMS.length);
        // Reset to bottom/transparent
        searchPlaceholderAnim.setValue(-1);
        // Fade in and slide up to center
        Animated.timing(searchPlaceholderAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1)),
        }).start();
      });
    };

    const interval = setInterval(startAnimation, 3000);
    return () => clearInterval(interval);
  }, []);

  const placeholderOpacity = searchPlaceholderAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 1, 0],
  });

  const placeholderTranslateY = searchPlaceholderAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [10, 0, -10],
  });


  // -------------------------------------

  const setupMobileLoginPassword = async () => {
    if (newMobilePassword.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No active user found. Please log in again.");
      return;
    }

    const isGoogleUser = user.providerData.some(p => p.providerId === GoogleAuthProvider.PROVIDER_ID);

    try {
      if (isGoogleUser) {
        Alert.alert(
          "Security Check",
          "For your security, you may need to re-authenticate. On web, approve the sign-in popup. On mobile, you may need to sign in again if password update fails."
        );
        // signInWithPopup is web-only, skip on native platforms
        if (Platform.OS === 'web') {
          await signInWithPopup(auth, googleProvider);
        }
      }

      await updatePassword(user, newMobilePassword);
      Alert.alert("Success", "Password set! Use your email and this new password to login on the Expo Go app.");
      setNewMobilePassword('');
    } catch (e: any) {
      console.error("Password set failed:", e);
      Alert.alert(
        "Update Failed",
        "Authentication required. Please ensure you complete the Google sign-in pop-up immediately."
      );
    }
  };


  const inc = () => setQty((q) => Math.min(20, q + 1));
  const dec = () => setQty((q) => Math.max(1, q - 1));

  const fetchGreeting = async () => {
    try {
      const stored = await AsyncStorage.getItem('usedFlirtyGreetings');
      let used: number[] = stored ? JSON.parse(stored) : [];
      if (used.length >= FLIRTY_GREETINGS.length) {
        used = []; // reset if all used
      }
      const available = FLIRTY_GREETINGS.map((_, i) => i).filter(i => !used.includes(i));
      const randomIndex = available[Math.floor(Math.random() * available.length)];
      used.push(randomIndex);
      await AsyncStorage.setItem('usedFlirtyGreetings', JSON.stringify(used));
      setGreeting(FLIRTY_GREETINGS[randomIndex] || FLIRTY_GREETINGS[0]);
    } catch (e) {
      setGreeting(FLIRTY_GREETINGS[Math.floor(Math.random() * FLIRTY_GREETINGS.length)]);
    }
  };

  useEffect(() => {
    fetchGreeting();
    const interval = setInterval(fetchGreeting, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchGreeting();
  }, [tab]);

  const unsubAuthRef = useRef<(() => void) | null>(null);

  // ...existing code...

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
      orders.forEach((o) => {
        const createdAtMs = o.createdAt?.toMillis?.() ?? 0;
        if (o.status === "requested" && Date.now() - createdAtMs > tenMin) {
          updateDoc(doc(db, "orders", o.id), {
            status: "canceled",
            updatedAt: serverTimestamp(),
            autoCanceled: true,
            autoCanceledReason: "Kitchen did not accept within 10 minutes",
          }).catch(console.error);
        }
      });
    }, 30000); // check every 30 seconds
    return () => clearInterval(interval);
  }, [orders]);


  const saveAddress = async () => {
    await updateProfile({ address: addr || '' });
    setSavedLocation(true);
    setTimeout(() => setSavedLocation(false), 2000);
    Alert.alert('Saved', 'Address saved');
  };

  // Kitchen cache removed - using service layer instead

  // visibleItems comes directly from useMenu hook

  const openBuy = (it: MenuItem) => {
    if (it.outOfStock) {
      Alert.alert("Out of Stock", "Sorry, this item is currently out of stock!");
      return;
    }
    setSel(it);
    setQty(1);
    setRemarks('');
    setShow(true);
  };
  const closeBuy = () => setShow(false);

  const totalFor = async (it: MenuItem, quantity: number) => {
    let deliveryFee = 20;
    return it.price * quantity + deliveryFee;
  };

  const confirmBuy = async () => {
    if (!sel) return;
    try {
      const total = await totalFor(sel, qty);
      setShow(false);
      Alert.alert('Order Placed', `Order placed successfully for Rs. ${total}`);
    } catch (e: any) {
      console.error("Order failed:", e);
      Alert.alert('Error', e?.message || 'Failed to place order');
    }
  };





  const cancelOrder = async (orderId: string, status: string) => {
    if (status !== 'requested' && status !== 'expired_reassign') {
      Alert.alert('Cannot cancel', 'Only pending or expired requests can be canceled.');
      return;
    }

    await updateDoc(doc(db, 'orders', orderId), {
      status: 'canceled',
      updatedAt: serverTimestamp(),
    });
  };

  const reassignOrder = async (o: Order) => {
    setTab('menu');
    setSearch(o.itemName);
    Alert.alert('Reassign Order', `Looking for "${o.itemName}". Pick another kitchen from the list.`);
  };

  const logout = async () => {
    if (unsubAuthRef.current) {
      unsubAuthRef.current();
      unsubAuthRef.current = null;
    }
    // Clear persisted session before signing out so future offline launches
    // do not mistakenly route to the dashboard without a valid token.
    await clearSession();
    await signOut(auth);
    router.replace('/login');
  };

  const dismissRejection = async () => {
    if (activeRejection) {
      await updateDoc(doc(db, 'orders', activeRejection.id), {
        userDismissedRejection: true,
      });
      setActiveRejection(null);
    }
  };

  const dismissReportWarning = async () => {
    if (activeReportWarning) {
      await updateDoc(doc(db, 'orders', activeReportWarning.id), {
        userNotifiedOfReport: true,
      });
      setActiveReportWarning(null);
    }
  };

  const submitReview = async () => {
    if (!reviewingOrder || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const orderRef = doc(db, 'orders', reviewingOrder.id);
      await updateDoc(orderRef, {
        rating: reviewRating,
        ratingComment: reviewComment,
        updatedAt: serverTimestamp(),
      });

      // Update item rating in kitchen's collection
      // item ID in order is retrieved as itemId
      const itemRef = doc(db, 'kitchens', reviewingOrder.kitchenId, 'items', (reviewingOrder as any).itemId);
      const itemSnap = await getDoc(itemRef);
      if (itemSnap.exists()) {
        const itemData = itemSnap.data();
        await updateDoc(itemRef, {
          totalRating: (itemData.totalRating || 0) + reviewRating,
          ratingCount: (itemData.ratingCount || 0) + 1,
        });
      }

      setReviewingOrder(null);
      setReviewRating(5);
      setReviewComment('');
      Alert.alert('Thank you!', 'Your review has been submitted.');
    } catch (e: any) {
      console.error('Review failed:', e);
      Alert.alert('Error', 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const deliverYes = async () => {
    if (activeDelivery) {
      await updateDoc(doc(db, 'orders', activeDelivery.id), {
        userConfirmedReceived: true,
      });
      setDeliveryFeedback('yes');
      // Auto close after 3s
      setTimeout(() => {
        setActiveDelivery(null);
      }, 3000);
    }
  };

  const deliverNo = async () => {
    if (activeDelivery) {
      await updateDoc(doc(db, 'orders', activeDelivery.id), {
        userDidNotReceiveReported: true,
        kitchenNotifiedOfReport: false,
      });
      setDeliveryFeedback('no');

      try {
        // Increment kitchen missing food report count
        const kref = doc(db, 'kitchens', activeDelivery.kitchenId);
        const kSnap = await getDoc(kref);
        const kData = kSnap.data();
        let kEmail = 'pabibha@gmail.com';

        if (kSnap.exists() && kData) {
          kEmail = kData.email || kEmail;
          const newCount = (kData.missing_food_reports || 0) + 1;
          await updateDoc(kref, {
            missing_food_reports: newCount,
            banned: newCount >= 5 ? true : (kData.banned || false),
            isOpen: newCount >= 5 ? false : (kData.isOpen || false),
          });

          if (newCount >= 5) {
            // also ban the user profile of the kitchen
            await updateDoc(doc(db, 'users', activeDelivery.kitchenId), {
              banned: true,
              isOpen: false
            });
          }
        }

        const userE = email || auth.currentUser?.email || '';

        // Email to User
        await addDoc(collection(db, 'mail'), {
          to: userE,
          message: {
            subject: 'We are so sorry!',
            text: `Hi ${name},\n\nWe apologize that you did not receive your food order (${activeDelivery.itemName}) from ${activeDelivery.kitchenName}.\n\nWe are investigating this with the kitchen immediately and will be in touch resolving this issue right away.\n\nThank you,\nThe Food Delivery Team`,
          }
        });

        // Email to Kitchen (Warning)
        await addDoc(collection(db, 'mail'), {
          to: kEmail,
          message: {
            subject: 'WARNING: Missing Food Report',
            text: `URGENT Warning for ${activeDelivery.kitchenName},\n\nA user (${name}) has reported that they did NOT receive their order (${activeDelivery.itemName}) which was marked as "Delivered".\n\nOrder ID: ${activeDelivery.id}\nPlease investigate this immediately to prevent account suspension.\n\nThank you,\nThe Food Delivery Team`,
          }
        });

        // Save report to database
        await addDoc(collection(db, 'reports'), {
          type: 'missing_food',
          orderId: activeDelivery.id,
          userId: auth.currentUser?.uid,
          userEmail: email || auth.currentUser?.email,
          kitchenId: activeDelivery.kitchenId,
          kitchenName: activeDelivery.kitchenName,
          itemName: activeDelivery.itemName,
          total: activeDelivery.total,
          createdAt: serverTimestamp(),
          status: 'pending_investigation'
        });
      } catch (err) {
        console.error("Failed to submit report:", err);
      }
    }
  };

  const closeDeliveryModal = () => {
    setActiveDelivery(null);
  };

  // Use new hooks for active/history orders
  const historyOrdersList = historyOrders;

  // Pull-to-refresh handler using the new scroll-aware hook
  const ptr = usePullToRefresh({
    quotes: QUOTES.home,
    onRefresh: async () => {
      // Data refreshes automatically via Firestore listeners,
      // but we wait a tiny bit to satisfy the spinner
      await new Promise(r => setTimeout(r, 400));
    }
  });

  // Memoized renderItem for FlatList - active orders
  const renderActiveOrderItem = useCallback(({ item: o, index: idx }: { item: Order; index: number }) => {
    const canCancel = o.status === 'requested' || o.status === 'expired_reassign';
    const canReassign = o.status === 'expired_reassign';
    const staggerStyle = {
      opacity: 1,
      transform: [{ translateY: 0 }] as any,
    };
    return (
      <Animated.View style={staggerStyle}>
        <Card key={o.id} delay={Math.min(idx * 80, 400)} style={{ gap: 6, marginBottom: 10 }}>
          <Text style={styles.itemTitle}>{o.itemName}</Text>
          <Text style={styles.itemMeta}>
            {o.kitchenName} • Rs. {o.total}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(o.status) }]} />
            <Text style={[styles.itemMeta, { color: getStatusColor(o.status), fontWeight: '700' }]}>
              {getStatusText(o.status)}
            </Text>
          </View>
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
      </Animated.View>
    );
  }, [cancelOrder, reassignOrder]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>

      <ScrollView
        style={{ backgroundColor: theme.pageBg }}
        onScroll={ptr.handleScroll}
        scrollEventThrottle={ptr.scrollEventThrottle}
        refreshControl={ptr.refreshControl}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 120, // Enough room to clear the floating tab bar
          }
        ]}
      >
        {/* HEADER */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => router.push('/location_map' as any)}>
            <Ionicons name="location" size={24} color={theme.primary} />
            <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600' }} numberOfLines={1}>
              {addr ? `${addr.split(',')[0]}..` : 'Set Delivery Location'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.secondaryText} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <NotificationBell
              count={unreadCount}
              onPress={() => setTab('active')}
              color={theme.text}
            />
            <TouchableOpacity style={styles.settingsBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={24} color={theme.red} />
            </TouchableOpacity>
          </View>
        </Animated.View>


        {tab === 'profile' && (
          <View style={{ gap: 20 }}>
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

              <Text style={{ color: theme.secondaryText, fontSize: 13, marginBottom: 8 }}>
                {addr || 'No address set'}
              </Text>

              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => router.push('/location_map' as any)}
              >
                <Ionicons name="map-outline" size={20} color={theme.white} />
                <Text style={styles.mapBtnText}>Pick from Map / Use GPS</Text>
              </TouchableOpacity>

              <Button label="Save Address" color={theme.blue} onPress={saveAddress} />
            </Card>

            <Card delay={100} style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Update Password</Text>
              <Text style={{ color: theme.secondaryText, fontSize: 13, marginBottom: 8 }}>
                Set a password to login on your mobile app using your email address.
              </Text>
              <TextInput
                value={newMobilePassword}
                onChangeText={setNewMobilePassword}
                placeholder="New mobile password (min. 6 chars)"
                placeholderTextColor={theme.secondaryText}
                secureTextEntry
                style={styles.input}
              />
              <Button label="Set Password" color={theme.gray} onPress={setupMobileLoginPassword} />
            </Card>

            <Card delay={150} style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Rider Mode</Text>
              <Text style={{ color: theme.secondaryText, fontSize: 13, marginBottom: 8 }}>
                Switch to rider mode to start delivering orders and earning money.
              </Text>
              <Button
                label="Switch to Rider Mode"
                color={theme.primary}
                onPress={() => router.push('/rider')}
              />
            </Card>
          </View>
        )}

        {tab === 'menu' && (
          <View style={{ gap: 24, paddingBottom: 20 }}>
            {/* GREETING SECTION — always visible */}
            <View style={{ marginBottom: -10, paddingHorizontal: 4 }}>
              <Text style={styles.hi}>Hi {name}!</Text>
              <Text style={{ color: theme.secondaryText, fontSize: 14, marginTop: 4 }}>
                {greeting}
              </Text>
            </View>

            {/* SEARCH */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={theme.secondaryText} />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  {(!isSearchFocused && filters.search.length === 0) && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 10,
                        right: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: theme.secondaryText, fontSize: 15 }}>
                        Search "
                      </Text>
                      <Animated.Text
                        style={{
                          color: theme.secondaryText,
                          fontSize: 15,
                          opacity: placeholderOpacity,
                          transform: [{ translateY: placeholderTranslateY }],
                        }}
                        numberOfLines={1}
                      >
                        {SEARCH_TERMS[searchPlaceholderIndex]}
                      </Animated.Text>
                      <Text style={{ color: theme.secondaryText, fontSize: 15 }}>
                        "
                      </Text>
                    </View>
                  )}
                  <TextInput
                    style={[styles.searchInputText, { marginLeft: 0, paddingLeft: 10 }]}
                    placeholder=""
                    placeholderTextColor={theme.secondaryText}
                    value={filters.search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                </View>
                {filters.search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={20} color={theme.secondaryText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* PROMO BANNER */}
            <View style={styles.banner}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerSub}>
                  Use code <Text style={styles.promoCode}>FIRST50</Text> at checkout. Hurry, offer ends soon!
                </Text>
                <Text style={styles.bannerTitle}>Get 20% Off Your First Order!</Text>
                <Pressable style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnText}>Order Now</Text>
                </Pressable>
              </View>
              <Ionicons
                name="fast-food"
                size={110}
                color="rgba(255,255,255,0.2)"
                style={styles.bannerBgIcon}
              />
            </View>

            {/* CATEGORIES ROW 1: DIETARY */}
            <View style={{ gap: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map(c => {
                  const isActive = activeCategory === c.id;
                  return (
                    <Pressable key={c.id} style={styles.categoryItem} onPress={() => {
                      if (isActive) {
                        setActiveCategory('all');
                      } else {
                        setActiveCategory(c.id);
                      }
                    }}>
                      <View style={[styles.categoryIcon, isActive ? { backgroundColor: theme.primary } : { backgroundColor: theme.input }]}>
                        <Text style={{ fontSize: 24 }}>{c.emoji}</Text>
                      </View>
                      <Text style={[styles.categoryText, isActive && { color: theme.primary, fontWeight: '700' }]}>{c.name}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* CATEGORIES ROW 2: FOOD TYPES */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {FOOD_TYPES.map(c => {
                  const isActive = activeFoodType === c.id;
                  return (
                    <Pressable key={c.id} style={styles.categoryItem} onPress={() => {
                      if (isActive) {
                        setActiveFoodType('');
                        setSearch('');
                      } else {
                        setActiveFoodType(c.id);
                        setSearch(c.name);
                      }
                    }}>
                      <View style={[styles.categoryIcon, isActive ? { backgroundColor: theme.primary } : { backgroundColor: theme.input }, { width: 44, height: 44, borderRadius: 12 }]}>
                        <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                      </View>
                      <Text style={[styles.categoryText, isActive && { color: theme.primary, fontWeight: '700' }, { fontSize: 11 }]}>{c.name}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* TOP PICKS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Top picks on Khajaghar™</Text>
              <Pressable style={styles.seeAllBtn} onPress={() => {
                setActiveCategory('all');
                setActiveFoodType('');
                setSearch('');
              }}>
                <Text style={styles.seeAllText}>See all</Text>
              </Pressable>
            </View>

            {/* ITEMS AREA: loader → content → empty state */}
            {isMenuLoading ? (
              // Momo spinner + skeletons appear here, below the categories
              <View style={{ paddingTop: 8 }}>
                <ThemedLoader variant="momo" fullScreen={false} />
                <SkeletonLoader variant="menuItem" count={4} />
              </View>
            ) : visibleItems.length === 0 ? (
              <EmptyState variant="no-restaurants" />
            ) : (
              <View style={{ gap: 20 }}>
                {Array.from({ length: Math.ceil(visibleItems.length / 5) }).map((_, rowIndex) => (
                  <ScrollView
                    key={`row-${rowIndex}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 16, paddingRight: 20 }}
                  >
                    {visibleItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((it, itemIdx) => {
                      const globalIdx = rowIndex * 5 + itemIdx;
                      return (
                        <StaggeredPickCard
                          key={it.id}
                          it={it}
                          index={globalIdx}
                          onPress={openBuy}
                        />
                      );
                    })}
                  </ScrollView>
                ))}
              </View>
            )}
          </View>
        )}

        {tab === 'active' && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            {activeOrders.length === 0 ? (
              <EmptyState variant="empty-cart" />
            ) : (
              <FlatList
                data={activeOrders as any}
                keyExtractor={(o) => o.id}
                renderItem={renderActiveOrderItem}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {tab === 'history' && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <TextInput
                style={[styles.input, { paddingHorizontal: 16, height: 44 }]}
                placeholder="Search history..."
                placeholderTextColor={theme.secondaryText}
                value={historySearch}
                onChangeText={setHistorySearch}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(['all', 'today', 'month'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, historyDateFilter === f && styles.filterChipActive]}
                    onPress={() => setHistoryDateFilter(f)}
                  >
                    <Text style={[styles.filterChipText, historyDateFilter === f && styles.filterChipTextActive]}>
                      {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : 'This Month'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {(['all', 'delivered', 'rejected'] as const).map(f => (
                  <TouchableOpacity
                    key={`status-${f}`}
                    style={[styles.filterChip, historyStatusFilter === f && styles.filterChipActive]}
                    onPress={() => setHistoryStatusFilter(f)}
                  >
                    <Text style={[styles.filterChipText, historyStatusFilter === f && styles.filterChipTextActive]}>
                      {f === 'all' ? 'All Status' : f === 'delivered' ? 'Delivered' : 'Canceled/Rejected'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {(() => {
              const q = historySearch.toLowerCase();
              const now = new Date();
              now.setHours(0, 0, 0, 0);

              const filtered = historyOrdersList.filter(o => {
                // Search filter
                if (q && !(o.itemName?.toLowerCase().includes(q) || o.kitchenName?.toLowerCase().includes(q))) return false;

                // Date filter
                const oDate = o.createdAt ? new Date(o.createdAt?.toMillis?.() ?? 0) : new Date(0);
                if (historyDateFilter === 'today') {
                  const oDateStart = new Date(oDate);
                  oDateStart.setHours(0, 0, 0, 0);
                  if (oDateStart.getTime() !== now.getTime()) return false;
                } else if (historyDateFilter === 'month') {
                  if (oDate.getMonth() !== now.getMonth() || oDate.getFullYear() !== now.getFullYear()) return false;
                }

                // Status filter
                if (historyStatusFilter === 'delivered' && o.status !== 'delivered') return false;
                if (historyStatusFilter === 'rejected' && o.status !== 'rejected' && o.status !== 'canceled') return false;

                return true;
              });

              if (filtered.length === 0) {
                return (
                  <EmptyState variant="no-history" style={{ marginTop: 20 }} />
                );
              }

              return filtered.map((o, idx) => (
                <View key={o.id} style={styles.miniBill}>
                  <Text style={styles.billHeader}>RECEIPT</Text>
                  <Text style={styles.billText}>Order ID: {o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.billText}>Date: {o.createdAt ? new Date(o.createdAt?.toMillis?.() ?? 0).toLocaleString() : 'N/A'}</Text>
                  <Text style={styles.billText}>Kitchen: {o.kitchenName}</Text>
                  <View style={styles.billDivider} />

                  <View style={styles.row}>
                    <Text style={[styles.billText, { flex: 1 }]}>1x {o.itemName}</Text>
                    <Text style={styles.billText}>Rs. {o.total}</Text>
                  </View>
                  <View style={styles.billDivider} />

                  <View style={[styles.row, { justifyContent: 'space-between', marginTop: 4 }]}>
                    <Text style={[styles.billText, { fontSize: 16, fontWeight: 'bold' }]}>TOTAL</Text>
                    <Text style={[styles.billText, { fontSize: 16, fontWeight: 'bold' }]}>Rs. {o.total}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(o.status) }]} />
                    <Text style={[styles.itemMeta, { color: getStatusColor(o.status), fontWeight: '700' }]}>
                      {getStatusText(o.status)}
                    </Text>
                  </View>

                  {o.status === 'delivered' && !o.rating && (
                    <TouchableOpacity
                      onPress={() => {
                        setReviewingOrder(o);
                        setReviewRating(5);
                        setReviewComment('');
                      }}
                      style={{
                        marginTop: 12,
                        backgroundColor: theme.blue,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: theme.white, fontWeight: 'bold' }}>Rate this Meal</Text>
                    </TouchableOpacity>
                  )}

                  {o.rating ? (
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <Ionicons name="star" size={16} color={theme.yellow} />
                      <Text style={{ color: theme.yellow, fontWeight: 'bold' }}>{o.rating} / 5</Text>
                    </View>
                  ) : null}
                </View>
              ));
            })()}
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      {/* BOTTOM NAVIGATION */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('menu')}>
          <Ionicons
            name={tab === 'menu' ? 'fast-food' : 'fast-food-outline'}
            size={24}
            color={tab === 'menu' ? theme.primary : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'menu' && { color: theme.primary }]}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('active')}>
          <View style={{ position: 'relative' }}>
            <Ionicons
              name={tab === 'active' ? 'receipt' : 'receipt-outline'}
              size={24}
              color={tab === 'active' ? theme.primary : theme.secondaryText}
            />
            {activeOrders.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeOrders.length}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, tab === 'active' && { color: theme.primary }]}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('history')}>
          <Ionicons
            name={tab === 'history' ? 'time' : 'time-outline'}
            size={24}
            color={tab === 'history' ? theme.primary : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'history' && { color: theme.primary }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('profile')}>
          <Ionicons
            name={tab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={tab === 'profile' ? theme.primary : theme.secondaryText}
          />
          <Text style={[styles.tabLabel, tab === 'profile' && { color: theme.primary }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* FIXED BUY MODAL */}
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
            {/* REMARKS INPUT */}
            <Text style={styles.modalLabel}>Remarks / Special Instructions</Text>

            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="e.g. extra cheese, no onion, spicy, etc."
              placeholderTextColor={theme.secondaryText}
              style={[
                styles.input,
                {
                  height: 80,
                  textAlignVertical: 'top',
                  marginBottom: 10,
                },
              ]}
              multiline
            />


            <Button
              label="Place order"
              color={theme.blue}
              onPress={confirmBuy}
            />
            <Button label="Close" color={theme.gray} onPress={closeBuy} />
          </Animated.View>
        </View>
      </Modal>

      {/* REJECTION FEEDBACK MODAL */}
      <Modal visible={!!activeRejection} transparent animationType="fade" onRequestClose={dismissRejection}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={styles.crossCircle}>
              <Ionicons name="close" size={48} color={theme.white} />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 22, color: theme.red, marginTop: 10 }]}>Order Rejected</Text>
            <Text style={[styles.modalMeta, { textAlign: 'center', fontSize: 16 }]}>
              {activeRejection?.kitchenName} rejected your order for {activeRejection?.itemName}.
            </Text>
            {activeRejection?.rejectionReason ? (
              <View style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: 12, borderRadius: 8, marginTop: 8, width: '100%' }}>
                <Text style={{ color: theme.white, fontStyle: 'italic', textAlign: 'center' }}>
                  "{activeRejection.rejectionReason}"
                </Text>
              </View>
            ) : null}
            <Button label="Okay" color={theme.gray} onPress={dismissRejection} style={{ width: '100%', marginTop: 10 }} />
          </Animated.View>
        </View>
      </Modal>

      {/* KITCHEN REPORT WARNING MODAL */}
      <Modal visible={!!activeReportWarning} transparent animationType="fade" onRequestClose={dismissReportWarning}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={{ backgroundColor: 'rgba(255, 204, 0, 0.15)', padding: 16, borderRadius: 50 }}>
              <Ionicons name="warning" size={48} color={theme.yellow || '#FFCC00'} />
            </View>
            <Text style={[styles.modalMeta, { textAlign: 'center', fontSize: 13, color: theme.red, marginTop: 10 }]}>
              Note: Multiple delivery reports may result in account suspension.
            </Text>
            <ScrollView style={{ maxHeight: 300, width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
              <Text style={[styles.modalMeta, { textAlign: 'center', fontSize: 16 }]}>
                {activeReportWarning?.kitchenName} reported an issue delivering your order for {activeReportWarning?.itemName}.
              </Text>
              {activeReportWarning?.cancellationReason ? (
                <View style={{ backgroundColor: 'rgba(255, 204, 0, 0.1)', padding: 12, borderRadius: 8, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: theme.white, fontStyle: 'italic', textAlign: 'center' }}>
                    Reason: "{activeReportWarning.cancellationReason}"
                  </Text>
                </View>
              ) : null}
            </ScrollView>
            <Button label="I understand" color={theme.gray} onPress={dismissReportWarning} style={{ width: '100%', marginTop: 10 }} />
          </Animated.View>
        </View>
      </Modal>

      {/* DELIVERY FEEDBACK MODAL */}
      <Modal visible={!!activeDelivery} transparent animationType="fade" onRequestClose={closeDeliveryModal}>
        <BlurView intensity={30} tint="dark" style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { alignItems: 'center' }]}>
            {deliveryFeedback === 'prompt' && (
              <>
                <View style={styles.promptCircle}>
                  <Ionicons name="fast-food" size={48} color={theme.white} />
                </View>
                <Text style={[styles.modalTitle, { fontSize: 20, textAlign: 'center', marginTop: 10 }]}>Food Delivered?</Text>
                <Text style={[styles.modalMeta, { textAlign: 'center', marginBottom: 10 }]}>
                  {activeDelivery?.kitchenName} marked your order for {activeDelivery?.itemName} as delivered. Did you receive your food?
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  <Button label="No" color={theme.red} onPress={deliverNo} style={{ flex: 1 }} />
                  <Button label="Yes" color={theme.green} onPress={deliverYes} style={{ flex: 1 }} />
                </View>
              </>
            )}

            {deliveryFeedback === 'yes' && (
              <CelebrationSuccess>
                <AnimatedCheckmark />
                <Text style={[styles.modalTitle, { fontSize: 24, color: theme.green, marginTop: 15, textAlign: 'center' }]}>🎉 Delivered Successfully! 🎉</Text>
                <Text style={[styles.modalMeta, { textAlign: 'center', marginTop: 5 }]}>Your order is complete. Enjoy your food!</Text>
              </CelebrationSuccess>
            )}

            {deliveryFeedback === 'no' && (
              <>
                <View style={styles.warningCircle}>
                  <Ionicons name="alert-circle" size={48} color={theme.white} />
                </View>
                <Text style={[styles.modalTitle, { fontSize: 20, color: theme.red, marginTop: 10 }]}>Report Submitted</Text>
                <Text style={[styles.modalMeta, { textAlign: 'center' }]}>
                  We've recorded that you didn't receive your order from {activeDelivery?.kitchenName}.
                  An email has been sent to our support team and the kitchen to investigate immediately.
                </Text>
                <Button label="Close" color={theme.gray} onPress={closeDeliveryModal} style={{ width: '100%', marginTop: 10 }} />
              </>
            )}
          </Animated.View>
        </BlurView>
      </Modal>

      {/* REVIEW MODAL */}
      <Modal visible={!!reviewingOrder} transparent animationType="slide" onRequestClose={() => setReviewingOrder(null)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { width: '90%' }]}>
            <Text style={styles.modalTitle}>Rate your meal</Text>
            <Text style={[styles.modalMeta, { textAlign: 'center' }]}>
              How was your {reviewingOrder?.itemName} from {reviewingOrder?.kitchenName}?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                  <Ionicons
                    name={s <= reviewRating ? "star" : "star-outline"}
                    size={40}
                    color={theme.yellow}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="What did you think of the food? (Optional)"
              placeholderTextColor={theme.secondaryText}
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Button label="Back" color={theme.gray} onPress={() => setReviewingOrder(null)} style={{ flex: 1 }} />
              <Button
                label={isSubmittingReview ? "..." : "Submit"}
                color={theme.green}
                onPress={submitReview}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Global and Structure
  container: {
    padding: theme.pad,
    gap: 24,
    backgroundColor: theme.pageBg,
    paddingBottom: 40,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  hi: {
    color: theme.white,
    fontSize: 24,
    fontWeight: '800',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    gap: 16,
    justifyContent: 'flex-start',
  },
  itemCard: {
    width: Platform.OS === 'web' ? 230 : '47%',
    minWidth: 150,
    backgroundColor: theme.card,
    borderRadius: 12,
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  crossCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.red,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  tickCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  promptCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.blue,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  warningCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.gray,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.gray,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 100,
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
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
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
  userOutOfStockBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userOutOfStockText: {
    color: theme.white,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
    borderWidth: 2,
    borderColor: theme.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    transform: [{ rotate: '-15deg' }]
  },
  dietaryIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.gray,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  mapBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14,
  },
  // NEW MENU STYLES matching screenshot
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: theme.gray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: 10,
    elevation: 4,
  },
  searchInputText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: theme.text,
  },
  micBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 92, 42, 0.15)', // Dark mode compliant orange tint
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  banner: {
    backgroundColor: theme.primary,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 10,
  },
  bannerContent: {
    flex: 1,
    zIndex: 2,
  },
  bannerSub: {
    color: theme.white,
    fontSize: 12,
    marginBottom: 8,
  },
  promoCode: {
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    borderRadius: 6,
    color: theme.primary,
    overflow: 'hidden',
  },
  bannerTitle: {
    color: theme.white,
    fontSize: 24,
    fontWeight: '800',
    width: '70%',
    marginBottom: 16,
  },
  bannerBtn: {
    backgroundColor: theme.dark,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14,
  },
  bannerBgIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }]
  },
  categoryScroll: {
    paddingVertical: 8,
    gap: 16,
    paddingRight: 20,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '500',
  },
  topPicksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  seeAllBtn: {
    backgroundColor: theme.yellow,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  seeAllText: {
    color: theme.dark,
    fontWeight: '700',
    fontSize: 13,
  },
  pickCard: {
    width: 240,
    backgroundColor: theme.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: 15,
    elevation: 4,
  },
  pickImageContainer: {
    height: 140,
    width: '100%',
    backgroundColor: theme.gray,
  },
  pickImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: theme.white,
    fontSize: 12,
    fontWeight: '700',
  },
  pickBody: {
    padding: 12,
    gap: 6,
  },
  pickTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  pickSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  pickKitchen: {
    color: theme.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  pickRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickRating: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  pickReviews: {
    color: theme.secondaryText,
    fontSize: 12,
  },
  pickFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deliveryFee: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  priceBtn: {
    backgroundColor: theme.dark,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  priceText: {
    color: theme.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
