import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type AuthTab = 'login' | 'register';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const colors = {
  ink: '#1D1D1F',
  muted: '#7A7A7A',
  blue: '#0066CC',
  blueBright: '#0071E3',
  canvas: '#F5F5F7',
  field: '#F5F5F7',
  border: '#E0E0E0',
  white: '#FFFFFF',
};

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80',
};

function MapBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.mapGlow, styles.mapGlowBlue]} />
      <View style={[styles.mapGlow, styles.mapGlowGold]} />
      <View style={[styles.mapRoute, styles.mapRouteOne]} />
      <View style={[styles.mapRoute, styles.mapRouteTwo]} />
      <View style={[styles.mapCircle, styles.mapCircleOne]} />
      <View style={[styles.mapCircle, styles.mapCircleTwo]} />
      <View style={[styles.mapPin, styles.mapPinAmber]} />
      <View style={[styles.mapPin, styles.mapPinSky]} />
      <View style={[styles.mapPin, styles.mapPinRose]} />
      <View style={[styles.mapPin, styles.mapPinGreen]} />
      <Text style={styles.mapWord}>TRIP</Text>
    </View>
  );
}

function Hero({ activeTab }: { activeTab: AuthTab }) {
  const isRegister = activeTab === 'register';

  return (
    <View style={styles.hero}>
      <View accessible accessibilityLabel="Ảnh hành trình Việt Nam" style={styles.heroCard}>
        <Image accessibilityIgnoresInvertColors source={heroImage} style={styles.heroImage} />
        <View style={styles.heroShade} />
        <View style={styles.heroCaption}>
          <Text style={styles.heroEyebrow}>HÀNH TRÌNH KHÁM PHÁ</Text>
          <Text style={styles.heroCaptionTitle}>Việt Nam diệu kỳ</Text>
        </View>
      </View>

      <Text style={styles.brand}>
        TripMate<Text style={styles.brandDot}>.</Text>
      </Text>
      {isRegister ? (
        <Text style={styles.heroTitle}>Tạo tài khoản mới</Text>
      ) : (
        <Text style={styles.heroTitle}>
          Khám phá & Lưu lại{`\n`}
          <Text style={styles.heroTitleAccent}>địa điểm yêu thích</Text>
        </Text>
      )}
      <Text style={styles.heroSubtitle}>
        {isRegister
          ? 'Bắt đầu hành trình khám phá và chia sẻ điểm đến cùng TripMate.'
          : 'Lên lịch trình thông minh, cùng bạn bè trên mọi nẻo đường.'}
      </Text>
    </View>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{ color: '#F0F0F2', borderless: false }}
      onPress={() => Alert.alert('Google', 'Đăng nhập Google sẽ được tích hợp sau.')}
      style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="google" size={19} color="#4285F4" />
      <Text style={styles.googleText}>{label}</Text>
    </Pressable>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.divider} />
    </View>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  ...props
}: {
  icon: IconName;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
} & Pick<TextInputProps, 'autoCapitalize' | 'autoComplete' | 'keyboardType'>) {
  return (
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name={icon} size={18} color="#7A7A7A" />
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
        {...props}
      />
    </View>
  );
}

function PasswordField({
  placeholder,
  value,
  onChangeText,
  visible,
  onToggle,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name="lock-outline" size={18} color="#7A7A7A" />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!visible}
        style={styles.input}
        value={value}
      />
      <Pressable
        accessibilityLabel={visible ? `Ẩn ${placeholder.toLowerCase()}` : `Hiện ${placeholder.toLowerCase()}`}
        accessibilityRole="button"
        hitSlop={10}
        onPress={onToggle}
        style={styles.eyeButton}
      >
        <MaterialCommunityIcons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={18}
          color={colors.muted}
        />
      </Pressable>
    </View>
  );
}

function CheckToggle({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.checkRow, pressed && styles.subtlePressed]}
    >
      <MaterialCommunityIcons
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={18}
        color={checked ? colors.blue : colors.border}
      />
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function ForgotPasswordSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('nguyenvana@gmail.com');

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityLabel="Đóng khôi phục mật khẩu" onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.forgotSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.forgotHeader}>
              <View style={styles.forgotTitleRow}>
                <View style={styles.forgotIconCircle}>
                  <MaterialCommunityIcons name="email-outline" size={18} color={colors.blue} />
                </View>
                <View>
                  <Text style={styles.forgotTitle}>Khôi phục mật khẩu</Text>
                  <Text style={styles.forgotStep}>Bước 1/3: Nhập email</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.subtlePressed]}
              >
                <MaterialCommunityIcons name="close" size={17} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.forgotDescription}>
              Nhập địa chỉ email đăng ký tài khoản TripMate. Tính năng khôi phục sẽ được kết nối cùng API sau.
            </Text>
            <Text style={styles.forgotLabel}>EMAIL ĐĂNG KÝ</Text>
            <InputField
              icon="email-outline"
              placeholder="nguyenvana@gmail.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Gửi mã xác thực"
                accessibilityRole="button"
                onPress={() => Alert.alert('Khôi phục mật khẩu', 'API khôi phục mật khẩu chưa được tích hợp.')}
                style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.modalPrimaryText}>Gửi mã xác thực</Text>
                <MaterialCommunityIcons name="arrow-right" size={17} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function LoginPanel({ onRegister }: { onRegister: () => void }) {
  const [email, setEmail] = useState('nguyenvana@gmail.com');
  const [password, setPassword] = useState('TripMate2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotVisible, setForgotVisible] = useState(false);

  const submit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    Alert.alert('Đăng nhập', 'Kết nối API sẽ được tích hợp ở bước tiếp theo.');
  };

  return (
    <View style={styles.panelContent}>
      <GoogleButton label="Tiếp tục với Google" />
      <Divider label="hoặc dùng email" />

      <InputField
        icon="email-outline"
        placeholder="Địa chỉ email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <PasswordField
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />

      <View style={styles.loginOptions}>
        <CheckToggle checked={rememberMe} label="Ghi nhớ tôi" onPress={() => setRememberMe((value) => !value)} />
        <Pressable
          accessibilityRole="button"
          onPress={() => setForgotVisible(true)}
          style={({ pressed }) => [styles.forgotLinkButton, pressed && styles.subtlePressed]}
        >
          <Text style={styles.link}>Quên mật khẩu?</Text>
        </Pressable>
      </View>

      <PrimaryButton label="Đăng nhập" onPress={submit} />
      <View style={styles.switchPrompt}>
        <Text style={styles.promptText}>Chưa có tài khoản? </Text>
        <Pressable accessibilityRole="link" onPress={onRegister}>
          <Text style={styles.link}>Đăng ký ngay</Text>
        </Pressable>
      </View>

      <ForgotPasswordSheet visible={forgotVisible} onClose={() => setForgotVisible(false)} />
    </View>
  );
}

function RegisterPanel({ onLogin }: { onLogin: () => void }) {
  const [name, setName] = useState('Nguyễn Văn A');
  const [email, setEmail] = useState('nguyenvana@gmail.com');
  const [phone, setPhone] = useState('0912345678');
  const [password, setPassword] = useState('TripMate2026@');
  const [confirmPassword, setConfirmPassword] = useState('TripMate2026@');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const submit = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin đăng ký.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Thông báo', 'Vui lòng đồng ý với điều khoản sử dụng.');
      return;
    }
    Alert.alert('Đăng ký', 'Kết nối API đăng ký sẽ được tích hợp ở bước tiếp theo.');
  };

  return (
    <View style={styles.panelContent}>
      <GoogleButton label="Đăng ký với Google" />
      <Divider label="hoặc đăng ký với email" />

      <InputField icon="account-outline" placeholder="Họ và tên" value={name} onChangeText={setName} />
      <InputField
        icon="email-outline"
        placeholder="Địa chỉ email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <InputField
        icon="phone-outline"
        placeholder="Số điện thoại"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <PasswordField
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />
      <PasswordField
        placeholder="Xác nhận mật khẩu"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        visible={showConfirmPassword}
        onToggle={() => setShowConfirmPassword((value) => !value)}
      />

      <View style={styles.termsRow}>
        <Pressable
          accessibilityLabel="Đồng ý với điều khoản TripMate"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreeTerms }}
          hitSlop={6}
          onPress={() => setAgreeTerms((value) => !value)}
          style={({ pressed }) => [styles.termsCheck, pressed && styles.subtlePressed]}
        >
          <MaterialCommunityIcons
            name={agreeTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={18}
            color={agreeTerms ? colors.blue : colors.border}
          />
        </Pressable>
        <Text style={styles.termsText}>
          Đồng ý với <Text style={styles.link}>Điều khoản</Text> TripMate
        </Text>
      </View>

      <PrimaryButton label="Đăng ký tài khoản" onPress={submit} />
      <View style={styles.switchPromptRegister}>
        <Text style={styles.promptText}>Đã có tài khoản? </Text>
        <Pressable accessibilityRole="link" onPress={onLogin}>
          <Text style={styles.link}>Đăng nhập</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{ color: colors.blueBright }}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function AuthSheet({ activeTab, onChangeTab }: { activeTab: AuthTab; onChangeTab: (tab: AuthTab) => void }) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.segmentedControl}>
        <View style={[styles.segmentIndicator, activeTab === 'register' && styles.segmentIndicatorRegister]} />
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'login' }}
          onPress={() => onChangeTab('login')}
          style={styles.segmentButton}
        >
          <Text style={[styles.segmentText, activeTab === 'login' && styles.segmentTextActive]}>Đăng nhập</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'register' }}
          onPress={() => onChangeTab('register')}
          style={styles.segmentButton}
        >
          <Text style={[styles.segmentText, activeTab === 'register' && styles.segmentTextActive]}>Đăng ký</Text>
        </Pressable>
      </View>

      {activeTab === 'login' ? (
        <LoginPanel onRegister={() => onChangeTab('register')} />
      ) : (
        <RegisterPanel onLogin={() => onChangeTab('login')} />
      )}
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <MapBackdrop />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Hero activeTab={activeTab} />
            <AuthSheet activeTab={activeTab} onChangeTab={setActiveTab} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: colors.canvas, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingBottom: 5, paddingHorizontal: 20, paddingTop: 16 },
  heroCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 150,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: '100%',
  },
  heroImage: { height: '100%', width: '100%' },
  heroShade: { backgroundColor: 'rgba(0,0,0,0.34)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  heroCaption: { bottom: 13, left: 14, position: 'absolute' },
  heroEyebrow: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  heroCaptionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 2 },
  brand: { color: colors.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.6, marginTop: 12 },
  brandDot: { color: colors.blue, fontSize: 24 },
  heroTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', lineHeight: 28, marginTop: 4, textAlign: 'center' },
  heroTitleAccent: { color: colors.blue },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2, maxWidth: 280, textAlign: 'center' },
  sheet: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    marginTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 3, height: 4, marginBottom: 12, width: 36 },
  segmentedControl: { backgroundColor: colors.canvas, borderColor: colors.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', height: 42, marginBottom: 12, padding: 3, position: 'relative' },
  segmentIndicator: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 20, borderWidth: 1, bottom: 3, left: 3, position: 'absolute', top: 3, width: '50%' },
  segmentIndicatorRegister: { left: '50%' },
  segmentButton: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 36, zIndex: 1 },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '400' },
  segmentTextActive: { color: colors.ink, fontWeight: '600' },
  panelContent: { paddingHorizontal: 0 },
  googleButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', height: 44, justifyContent: 'center', minHeight: 44 },
  googleText: { color: colors.ink, fontSize: 13, fontWeight: '400', marginLeft: 9 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', marginVertical: 11 },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerLabel: { backgroundColor: colors.white, color: colors.muted, fontSize: 11, marginHorizontal: 10, paddingHorizontal: 2 },
  inputWrap: { alignItems: 'center', backgroundColor: colors.field, borderColor: colors.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', height: 44, marginBottom: 9, paddingHorizontal: 15 },
  input: { color: colors.ink, flex: 1, fontSize: 13, marginLeft: 9, paddingVertical: 0 },
  eyeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, marginRight: -12 },
  loginOptions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 34, paddingHorizontal: 2 },
  checkRow: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  checkLabel: { color: colors.muted, fontSize: 12, marginLeft: 6 },
  termsCheck: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 32 },
  forgotLinkButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingLeft: 10 },
  link: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: 22, flexDirection: 'row', height: 44, justifyContent: 'center', marginTop: 4, minHeight: 44 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '400' },
  switchPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 11 },
  switchPromptRegister: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 9 },
  promptText: { color: colors.muted, fontSize: 12 },
  termsRow: { alignItems: 'center', flexDirection: 'row', minHeight: 42, paddingHorizontal: 1 },
  termsText: { color: colors.muted, flex: 1, fontSize: 11, marginLeft: -2 },
  pressed: { opacity: 0.78 },
  subtlePressed: { opacity: 0.62 },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.42)', flex: 1, justifyContent: 'flex-end' },
  forgotSheet: { backgroundColor: colors.white, borderColor: colors.border, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 12 },
  forgotHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  forgotTitleRow: { alignItems: 'center', flexDirection: 'row' },
  forgotIconCircle: { alignItems: 'center', backgroundColor: '#EAF2FF', borderRadius: 17, height: 34, justifyContent: 'center', marginRight: 9, width: 34 },
  forgotTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  forgotStep: { color: colors.muted, fontSize: 11, marginTop: 2 },
  closeButton: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  forgotDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 14, marginTop: 14 },
  forgotLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 5 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 5 },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 21, flex: 1, height: 42, justifyContent: 'center', minHeight: 42 },
  secondaryButtonText: { color: colors.ink, fontSize: 13, fontWeight: '500' },
  modalPrimaryButton: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: 21, flex: 1.5, flexDirection: 'row', height: 42, justifyContent: 'center', minHeight: 42 },
  modalPrimaryText: { color: colors.white, fontSize: 13, fontWeight: '600', marginRight: 5 },
  mapGlow: { borderRadius: 200, position: 'absolute' },
  mapGlowBlue: { backgroundColor: 'rgba(191,219,254,0.38)', height: 300, right: -80, top: -50, width: 300 },
  mapGlowGold: { backgroundColor: 'rgba(253,230,138,0.28)', bottom: 100, height: 330, left: -130, width: 330 },
  mapRoute: { borderColor: 'rgba(148,163,184,0.28)', borderRadius: 180, borderWidth: 2, height: 380, position: 'absolute', width: 580 },
  mapRouteOne: { left: -260, top: 90, transform: [{ rotate: '-18deg' }] },
  mapRouteTwo: { left: -80, top: -90, transform: [{ rotate: '38deg' }] },
  mapCircle: { borderColor: 'rgba(148,163,184,0.2)', borderRadius: 100, borderWidth: 1.5, position: 'absolute' },
  mapCircleOne: { height: 180, left: 70, top: 160, width: 180 },
  mapCircleTwo: { height: 100, right: 10, top: 100, width: 100 },
  mapPin: { borderRadius: 8, height: 12, position: 'absolute', width: 12 },
  mapPinAmber: { backgroundColor: '#F59E0B', left: 34, top: 130 },
  mapPinSky: { backgroundColor: '#0EA5E9', right: 62, top: 168 },
  mapPinRose: { backgroundColor: '#FB7185', left: 96, top: 250 },
  mapPinGreen: { backgroundColor: '#10B981', right: 26, top: 280 },
  mapWord: { color: 'rgba(168,162,158,0.22)', fontSize: 64, fontWeight: '900', left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 190 },
});
