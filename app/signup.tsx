// app/signup.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../src/constants/firebase';
import { clearSession } from '../src/services/authService';

type Role = 'user' | 'kitchen' | 'rider' | null;

const ROLES: { id: Role; label: string; emoji: string; color: string; desc: string }[] = [
  { id: 'user',    label: 'Customer',  emoji: '😋', color: '#34C759', desc: 'Order delicious food' },
  { id: 'kitchen', label: 'Kitchen',   emoji: '👨‍🍳', color: '#2C7CF8', desc: 'Manage your restaurant' },
  { id: 'rider',   label: 'Rider',     emoji: '🚴', color: '#FF9500', desc: 'Deliver orders & earn' },
];

const VEHICLE_TYPES = [
  { id: 'Bike',    emoji: '🏍️' },
  { id: 'Scooter', emoji: '🛵' },
  { id: 'Bicycle', emoji: '🚲' },
];

const theme = {
  bg: '#000000',
  card: '#111114',
  input: '#1A1A1D',
  inputBorder: '#2A2A2E',
  text: '#FFFFFF',
  secondaryText: '#6E6E73',
  error: '#FF3B30',
};

// ─── Reusable input row ─────────────────────────────────────────────────────
function InputField({
  label, placeholder, value, onChangeText, icon, keyboardType = 'default',
  secureTextEntry = false, rightEl, focused, onFocus, onBlur, accentColor = '#2C7CF8',
}: {
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; icon: any;
  keyboardType?: any; secureTextEntry?: boolean;
  rightEl?: React.ReactNode; focused: boolean;
  onFocus: () => void; onBlur: () => void; accentColor?: string;
}) {
  return (
    <View style={sf.fieldGroup}>
      <Text style={sf.label}>{label}</Text>
      <View style={[sf.inputBox, focused && { borderColor: accentColor, backgroundColor: '#15151A' }]}>
        <Ionicons name={icon} size={19} color={focused ? accentColor : theme.secondaryText} />
        <TextInput
          style={[sf.inputField, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={theme.secondaryText}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType={keyboardType}
          autoCapitalize="none"
          secureTextEntry={secureTextEntry}
        />
        {rightEl}
      </View>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Signup() {
  const insets = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // ── shared fields ──
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole,    setSelectedRole]    = useState<Role>(null);
  const [loading,         setLoading]         = useState(false);
  const [showSuccess,     setShowSuccess]     = useState(false);

  // ── customer / kitchen extra ──
  const [preferredName, setPreferredName] = useState('');
  const [phone,         setPhone]         = useState('');

  // ── rider-specific ──
  const [fullName,    setFullName]    = useState('');
  const [riderPhone,  setRiderPhone]  = useState('');
  const [vehicle,     setVehicle]     = useState('Bike');
  const [citizenId,   setCitizenId]   = useState('');
  const [licenseUrl,  setLicenseUrl]  = useState('');
  const [photoUrl,    setPhotoUrl]    = useState('');

  // ── focus tracking ──
  const [focused, setFocused] = useState<string | null>(null);
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [showRiderPw, setShowRiderPw] = useState(false);

  const f = (id: string) => ({ focused: focused === id, onFocus: () => setFocused(id), onBlur: () => setFocused(null) });

  const isRider = selectedRole === 'rider';
  const accentColor = selectedRole
    ? ROLES.find(r => r.id === selectedRole)?.color ?? '#2C7CF8'
    : '#2C7CF8';

  const passwordMatch = password === confirmPassword;

  // ── validation ──
  const canSubmit = isRider
    ? fullName.trim().length > 0 && riderPhone.trim().length > 7 &&
      email.trim().length > 0 && password.length >= 6
    : email.trim().length > 0 && preferredName.trim().length > 0 &&
      phone.trim().length > 7 && password.length >= 6 &&
      passwordMatch && selectedRole !== null;

  // ── success animation ──
  const showSuccessModal = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6,   useNativeDriver: true }),
    ]).start();
  };

  // ── submit ──
  const handleSignup = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      if (isRider) {
        // ── Rider flow (mirrors rider-signup.tsx logic) ──
        let uid = auth.currentUser?.uid;
        if (!uid) {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          uid = cred.user.uid;
        } else if (auth.currentUser?.email !== email.trim()) {
          await clearSession();
          await signOut(auth);
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          uid = cred.user.uid;
        }

        await setDoc(doc(db, 'users', uid), {
          email:         email.trim(),
          role:          'rider',
          approved:      false,
          riderStatus:   'pending',
          banned:        false,
          preferredName: fullName.trim(),
          phone:         riderPhone.trim(),
          createdAt:     serverTimestamp(),
          updatedAt:     serverTimestamp(),
        });

        await setDoc(doc(db, 'riders', uid), {
          uid,
          name:              fullName.trim(),
          phone:             riderPhone.trim(),
          email:             email.trim(),
          vehicleType:       vehicle,
          citizenshipIdUrl:  citizenId.trim()  || null,
          licenseUrl:        licenseUrl.trim()  || null,
          photoUrl:          photoUrl.trim()    || null,
          approved:          false,
          riderStatus:       'pending',
          totalDeliveries:   0,
          totalEarnings:     0,
          liveLocation:      null,
          createdAt:         serverTimestamp(),
          updatedAt:         serverTimestamp(),
        });

        showSuccessModal();
        setTimeout(async () => {
          await clearSession();
          await signOut(auth);
          router.replace('/login');
        }, 3000);

      } else {
        // ── Customer / Kitchen flow ──
        if (!passwordMatch) {
          Alert.alert('Password Mismatch', 'Passwords do not match.');
          setLoading(false);
          return;
        }
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(res.user);

        await setDoc(doc(db, 'users', res.user.uid), {
          email:         email.trim(),
          phone:         phone.trim(),
          preferredName: preferredName.trim(),
          role:          selectedRole,
          vip:           false,
          isOpen:        false,
          banned:        false,
          emailVerified: false,
          createdAt:     serverTimestamp(),
        });

        Alert.alert(
          'Almost there! ✅',
          'A verification link was sent to your email. Please verify within 3 days to keep your account active.',
          [{ text: 'OK', onPress: () => router.replace(selectedRole === 'kitchen' ? '/kitchen' : '/user') }]
        );
      }
    } catch (e: any) {
      Alert.alert('Sign Up Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView
        contentContainerStyle={[sf.container, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={sf.header}>
          <TouchableOpacity onPress={() => router.back()} style={sf.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={sf.headerCenter}>
            <Text style={sf.title}>Create Account</Text>
            <Text style={sf.subtitle}>Join Khaja today 🍱</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Role Cards ── */}
        <Text style={sf.sectionHeader}>I want to…</Text>
        <View style={sf.roleGrid}>
          {ROLES.map(role => {
            const isSelected = selectedRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[sf.roleCard, isSelected && { borderColor: role.color, backgroundColor: `${role.color}18` }]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.8}
              >
                <View style={[sf.roleCheck, isSelected && { backgroundColor: role.color, borderColor: role.color }]}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={sf.roleEmoji}>{role.emoji}</Text>
                <Text style={[sf.roleLabel, isSelected && { color: role.color }]}>{role.label}</Text>
                <Text style={sf.roleDesc}>{role.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ══════════════════════════════════════════
            CUSTOMER / KITCHEN FORM
        ══════════════════════════════════════════ */}
        {selectedRole !== null && !isRider && (
          <>
            <View style={sf.card}>
              <Text style={sf.cardTitle}>Your Details</Text>

              <InputField label="PREFERRED NAME" placeholder="What should we call you?" value={preferredName}
                onChangeText={setPreferredName} icon="person-outline" {...f('name')} accentColor={accentColor} />

              <InputField label="PHONE NUMBER" placeholder="+977 98XXXXXXXX" value={phone}
                onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" {...f('phone')} accentColor={accentColor} />

              <InputField label="EMAIL ADDRESS" placeholder="your@email.com" value={email}
                onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" {...f('email')} accentColor={accentColor} />

              <InputField label="PASSWORD" placeholder="Min. 6 characters" value={password}
                onChangeText={setPassword} icon="lock-closed-outline"
                secureTextEntry={!showPw}
                rightEl={
                  <Pressable onPress={() => setShowPw(v => !v)} hitSlop={8}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.secondaryText} />
                  </Pressable>
                }
                {...f('password')} accentColor={accentColor}
              />

              <View style={sf.fieldGroup}>
                <Text style={sf.label}>CONFIRM PASSWORD</Text>
                <View style={[
                  sf.inputBox,
                  focused === 'confirm' && { borderColor: accentColor, backgroundColor: '#15151A' },
                  confirmPassword.length > 0 && !passwordMatch && { borderColor: theme.error },
                ]}>
                  <Ionicons
                    name="shield-checkmark-outline" size={19}
                    color={confirmPassword.length > 0 && !passwordMatch ? theme.error : focused === 'confirm' ? accentColor : theme.secondaryText}
                  />
                  <TextInput
                    style={[sf.inputField, { flex: 1 }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={theme.secondaryText}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                    secureTextEntry={!showConf}
                  />
                  <Pressable onPress={() => setShowConf(v => !v)} hitSlop={8}>
                    <Ionicons name={showConf ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.secondaryText} />
                  </Pressable>
                </View>
                {confirmPassword.length > 0 && !passwordMatch && (
                  <Text style={sf.errorText}>Passwords don't match</Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* ══════════════════════════════════════════
            RIDER FORM (full identity)
        ══════════════════════════════════════════ */}
        {isRider && (
          <>
            {/* Personal Info */}
            <View style={sf.card}>
              <Text style={sf.cardTitle}>Personal Information</Text>

              <InputField label="FULL NAME" placeholder="Your legal full name" value={fullName}
                onChangeText={setFullName} icon="person-outline" {...f('rname')} accentColor="#FF9500" />

              <InputField label="PHONE NUMBER" placeholder="+977 98XXXXXXXX" value={riderPhone}
                onChangeText={setRiderPhone} icon="call-outline" keyboardType="phone-pad" {...f('rphone')} accentColor="#FF9500" />

              <InputField label="EMAIL ADDRESS" placeholder="rider@example.com" value={email}
                onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" {...f('remail')} accentColor="#FF9500" />

              <InputField label="PASSWORD" placeholder="At least 6 characters" value={password}
                onChangeText={setPassword} icon="lock-closed-outline"
                secureTextEntry={!showRiderPw}
                rightEl={
                  <Pressable onPress={() => setShowRiderPw(v => !v)} hitSlop={8}>
                    <Ionicons name={showRiderPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.secondaryText} />
                  </Pressable>
                }
                {...f('rpw')} accentColor="#FF9500"
              />
            </View>

            {/* Vehicle Type */}
            <View style={sf.card}>
              <Text style={sf.cardTitle}>Vehicle Type</Text>
              <View style={sf.vehicleRow}>
                {VEHICLE_TYPES.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[sf.vehicleBtn, vehicle === v.id && sf.vehicleBtnActive]}
                    onPress={() => setVehicle(v.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 26, marginBottom: 4 }}>{v.emoji}</Text>
                    <Text style={[sf.vehicleLabel, vehicle === v.id && { color: '#FF9500' }]}>{v.id}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Identity Documents */}
            <View style={sf.card}>
              <Text style={sf.cardTitle}>Identity Documents</Text>
              <Text style={sf.docHint}>
                Upload documents to Google Drive, Imgur, or any public host and paste the link below.
                These are reviewed by admin before activating your account.
              </Text>

              <InputField label="PROFILE PHOTO URL" placeholder="https://..." value={photoUrl}
                onChangeText={setPhotoUrl} icon="camera-outline" {...f('rphoto')} accentColor="#FF9500" />

              <InputField label="CITIZENSHIP ID URL" placeholder="https://..." value={citizenId}
                onChangeText={setCitizenId} icon="card-outline" {...f('rcid')} accentColor="#FF9500" />

              {vehicle !== 'Bicycle' && (
                <InputField label="DRIVING LICENSE URL" placeholder="https://..." value={licenseUrl}
                  onChangeText={setLicenseUrl} icon="document-outline" {...f('rlicense')} accentColor="#FF9500" />
              )}
            </View>

            {/* Info banner */}
            <View style={sf.riderInfoBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#FF9500" />
              <Text style={sf.riderInfoText}>
                After registration, your account will be reviewed by admin before you can start accepting deliveries.
              </Text>
            </View>
          </>
        )}

        {/* ── Submit Button ── */}
        {selectedRole !== null && (
          <TouchableOpacity
            style={[sf.submitBtn, { backgroundColor: accentColor }, !canSubmit && sf.submitBtnDisabled]}
            onPress={handleSignup}
            disabled={loading || !canSubmit}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name={isRider ? 'bicycle-outline' : 'checkmark-circle-outline'} size={22} color="#fff" />
                  <Text style={sf.submitBtnText}>
                    {isRider ? 'Register as Rider' : 'Create Account'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* ── Login link ── */}
        <View style={sf.loginRow}>
          <Text style={sf.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={sf.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Rider Success Modal ── */}
      <Modal transparent visible={showSuccess} animationType="fade">
        <View style={sf.modalOverlay}>
          <Animated.View style={[sf.successCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={sf.successIconCircle}>
              <Ionicons name="checkmark" size={50} color="#fff" />
            </View>
            <Text style={sf.successTitle}>Registration Sent! 🚴</Text>
            <Text style={sf.successMsg}>
              Your application is now being reviewed by our team. We'll notify you once approved.
            </Text>
            <View style={sf.loadingBarContainer}>
              <View style={[sf.loadingBar, { width: '100%' }]} />
            </View>
            <Text style={sf.redirectText}>Redirecting to login...</Text>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const sf = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, paddingTop: 8 },
  backBtn: {
    width: 40, height: 40, backgroundColor: '#1A1A1D',
    borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2E',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title:    { fontSize: 22, fontWeight: '900', color: theme.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: theme.secondaryText, marginTop: 2 },

  // Section header
  sectionHeader: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 14, letterSpacing: -0.2 },

  // Role cards
  roleGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleCard: {
    flex: 1, backgroundColor: theme.card, borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#2A2A2E', position: 'relative',
  },
  roleCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#3A3A3E',
    justifyContent: 'center', alignItems: 'center',
  },
  roleEmoji: { fontSize: 28, marginBottom: 6 },
  roleLabel: { fontSize: 13, fontWeight: '800', color: theme.text, marginBottom: 3 },
  roleDesc:  { fontSize: 9, color: theme.secondaryText, textAlign: 'center', lineHeight: 13 },

  // Card
  card: {
    backgroundColor: theme.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#1E1E22', marginBottom: 16, gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 8 },

  // InputField
  fieldGroup:  { marginBottom: 10 },
  label:       { color: theme.secondaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 7 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.input, borderRadius: 14,
    paddingHorizontal: 14, height: 54,
    borderWidth: 1, borderColor: theme.inputBorder, gap: 10,
  },
  inputField:  { flex: 1, color: theme.text, fontSize: 15, fontWeight: '500' },
  errorText:   { color: theme.error, fontSize: 12, marginTop: 5, fontWeight: '600' },

  // Vehicle
  vehicleRow: { flexDirection: 'row', gap: 10 },
  vehicleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: theme.input, borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent', gap: 4,
  },
  vehicleBtnActive: { borderColor: '#FF9500', backgroundColor: 'rgba(255,149,0,0.1)' },
  vehicleLabel: { color: theme.secondaryText, fontSize: 13, fontWeight: '700' },

  // Doc hint
  docHint: { color: theme.secondaryText, fontSize: 12, lineHeight: 18, marginBottom: 8 },

  // Rider info banner
  riderInfoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(255,149,0,0.10)', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  riderInfoText: { color: '#FF9500', fontSize: 13, flex: 1, lineHeight: 20 },

  // Submit
  submitBtn: {
    borderRadius: 16, height: 58,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Login link
  loginRow:    { flexDirection: 'row', justifyContent: 'center', paddingBottom: 8 },
  loginPrompt: { color: theme.secondaryText, fontSize: 14 },
  loginLink:   { color: '#2C7CF8', fontSize: 14, fontWeight: '700' },

  // Rider success modal
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard:   { backgroundColor: '#111114', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', maxWidth: 340, borderWidth: 1, borderColor: '#222' },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#34C759', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle:  { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10, textAlign: 'center' },
  successMsg:    { fontSize: 14, color: '#6E6E73', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  loadingBarContainer: { width: '100%', height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  loadingBar:    { height: '100%', backgroundColor: '#FF9500' },
  redirectText:  { fontSize: 13, color: '#6E6E73', fontWeight: '600' },
});
