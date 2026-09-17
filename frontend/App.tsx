import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  ink: '#17181A',
  muted: '#6F7277',
  blue: '#2F80ED',
  blueDark: '#216AD0',
  surface: '#FAF9F5',
  field: '#F1F2F3',
};

function AmbientMap() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowBlue]} />
      <View style={[styles.glow, styles.glowGold]} />
      <View style={[styles.route, styles.routeOne]} />
      <View style={[styles.route, styles.routeTwo]} />
      <View style={[styles.mapCircle, styles.circleOne]} />
      <View style={[styles.mapCircle, styles.circleTwo]} />
      <View style={[styles.pin, styles.pinAmber]} />
      <View style={[styles.pin, styles.pinSky]} />
      <View style={[styles.pin, styles.pinRose]} />
      <View style={[styles.pin, styles.pinGreen]} />
      <Text style={styles.rom}>TRIP</Text>
    </View>
  );
}

function LoginScreen({ onRegister }: { onRegister: () => void }) {
  const [email, setEmail] = useState('alex.traveler@gmail.com');
  const [password, setPassword] = useState('tripmate123');
  const [showPassword, setShowPassword] = useState(false);

  const submit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    Alert.alert('Đăng nhập', 'Kết nối API sẽ được tích hợp ở bước tiếp theo.');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <AmbientMap />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.brandPill} accessible accessibilityRole="header">
              <Text style={styles.brand}>TripMate</Text>
              <View style={styles.brandDot} />
            </View>
            <Text style={styles.title}>
              Khám phá & Lưu lại{`\n`}
              <Text style={styles.titleAccent}>địa điểm yêu thích</Text>
            </Text>
            <Text style={styles.subtitle}>
              Lên lịch trình, ghi dấu các quán cà phê, góc phố và chia sẻ ngay với nhóm bạn.
            </Text>
          </View>

          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Pressable
              accessibilityLabel="Tiếp tục với Google"
              accessibilityRole="button"
              onPress={() => Alert.alert('Google', 'Đăng nhập Google sẽ được tích hợp sau.')}
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            >
              <Text style={styles.googleMark}>G</Text>
              <Text style={styles.googleText}>Tiếp tục với Google</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerLabel}>hoặc email</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#92969B" />
              <TextInput
                accessibilityLabel="Tên đăng nhập hoặc email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Tên đăng nhập hoặc email"
                placeholderTextColor="#92969B"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#92969B" />
              <TextInput
                accessibilityLabel="Mật khẩu"
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Mật khẩu"
                placeholderTextColor="#92969B"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setShowPassword((visible) => !visible)}
                style={styles.eyeButton}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#92969B"
                />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => Alert.alert('Quên mật khẩu', 'Tính năng khôi phục sẽ được tích hợp sau.')}
              style={styles.forgot}
            >
              <Text style={styles.link}>Quên mật khẩu?</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Đăng nhập"
              accessibilityRole="button"
              onPress={submit}
              style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
            >
              <Text style={styles.loginText}>Đăng nhập</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </Pressable>

            <Text style={styles.registerText}>
              Chưa có tài khoản?{' '}
              <Text
                accessibilityRole="link"
                onPress={onRegister}
                style={styles.link}
              >
                Đăng ký ngay
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RegisterScreen({ onLogin }: { onLogin: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submit = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin đăng ký.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu chưa khớp', 'Vui lòng kiểm tra lại hai ô mật khẩu.');
      return;
    }
    Alert.alert('Đăng ký', 'Tài khoản sẽ được tạo khi API xác thực được tích hợp.');
  };

  const field = (icon: keyof typeof MaterialCommunityIcons.glyphMap, placeholder: string, value: string, setValue: (value: string) => void, props = {}) => (
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name={icon} size={20} color="#92969B" />
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#92969B"
        style={styles.input}
        value={value}
        {...props}
      />
    </View>
  );

  const passwordField = (placeholder: string, value: string, setValue: (value: string) => void, visible: boolean, toggle: () => void) => (
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name="lock-outline" size={20} color="#92969B" />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#92969B"
        secureTextEntry={!visible}
        style={styles.input}
        value={value}
      />
      <Pressable accessibilityLabel={visible ? `Ẩn ${placeholder.toLowerCase()}` : `Hiện ${placeholder.toLowerCase()}`} accessibilityRole="button" hitSlop={10} onPress={toggle} style={styles.eyeButton}>
        <MaterialCommunityIcons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#92969B" />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <AmbientMap />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.brandPill} accessible accessibilityRole="header"><Text style={styles.brand}>TripMate</Text><View style={styles.brandDot} /></View>
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>Bắt đầu hành trình khám phá và chia sẻ điểm đến cùng TripMate.</Text>
          </View>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Pressable accessibilityLabel="Tiếp tục với Google" accessibilityRole="button" onPress={() => Alert.alert('Google', 'Đăng nhập Google sẽ được tích hợp sau.')} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
              <Text style={styles.googleMark}>G</Text><Text style={styles.googleText}>Tiếp tục với Google</Text>
            </Pressable>
            <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerLabel}>hoặc đăng ký với email</Text><View style={styles.divider} /></View>
            {field('account-outline', 'Nguyễn Văn A', name, setName)}
            {field('email-outline', 'alex.traveler@gmail.com', email, setEmail, { autoCapitalize: 'none', autoComplete: 'email', keyboardType: 'email-address' })}
            {field('phone-outline', 'Số điện thoại', phone, setPhone, { keyboardType: 'phone-pad' })}
            {passwordField('Mật khẩu', password, setPassword, showPassword, () => setShowPassword((value) => !value))}
            {passwordField('Xác nhận mật khẩu', confirmPassword, setConfirmPassword, showConfirm, () => setShowConfirm((value) => !value))}
            <Text style={styles.terms}>Bằng việc đăng ký, bạn đồng ý với <Text style={styles.link} onPress={() => Alert.alert('Điều khoản', 'Nội dung điều khoản sẽ được cập nhật sau.')}>Điều khoản</Text> & <Text style={styles.link} onPress={() => Alert.alert('Chính sách', 'Nội dung chính sách sẽ được cập nhật sau.')}>Chính sách</Text> của TripMate.</Text>
            <Pressable accessibilityLabel="Đăng ký ngay" accessibilityRole="button" onPress={submit} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}><Text style={styles.loginText}>Đăng ký ngay</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" /></Pressable>
            <Text style={styles.registerText}>Đã có tài khoản? <Text accessibilityRole="link" onPress={onLogin} style={styles.link}>Đăng nhập ngay</Text></Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'login' | 'register'>('login');
  return (
    <SafeAreaProvider>
      {screen === 'login' ? <LoginScreen onRegister={() => setScreen('register')} /> : <RegisterScreen onLogin={() => setScreen('login')} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  brandPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  brand: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  brandDot: { backgroundColor: '#3B82F6', borderRadius: 5, height: 8, marginLeft: 6, marginTop: 10, width: 8 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '800', lineHeight: 34, textAlign: 'center' },
  titleAccent: { color: '#2563EB' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '500', lineHeight: 20, marginTop: 8, maxWidth: 290, textAlign: 'center' },
  sheet: { backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(255,255,255,0.9)', borderTopLeftRadius: 34, borderTopRightRadius: 34, borderWidth: 1, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 20 },
  handle: { alignSelf: 'center', backgroundColor: '#D1D3D5', borderRadius: 3, height: 5, marginBottom: 18, width: 42 },
  googleButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E3E5', borderRadius: 16, borderWidth: 1, flexDirection: 'row', height: 48, justifyContent: 'center' },
  googleMark: { color: '#4285F4', fontSize: 18, fontWeight: '800', marginRight: 10 },
  googleText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  dividerRow: { alignItems: 'center', flexDirection: 'row', marginVertical: 16 },
  divider: { backgroundColor: '#E4E5E7', flex: 1, height: 1 },
  dividerLabel: { color: '#92969B', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginHorizontal: 12, textTransform: 'uppercase' },
  inputWrap: { alignItems: 'center', backgroundColor: colors.field, borderColor: 'transparent', borderRadius: 16, borderWidth: 1, flexDirection: 'row', height: 48, marginBottom: 10, paddingHorizontal: 14 },
  input: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '600', marginLeft: 10, paddingVertical: 0 },
  eyeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, marginRight: -10 },
  forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  link: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  loginButton: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: 16, flexDirection: 'row', height: 48, justifyContent: 'center', marginTop: 2 },
  loginText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginRight: 6 },
  registerText: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 18, textAlign: 'center' },
  terms: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8, textAlign: 'center' },
  pressed: { opacity: 0.78 },
  glow: { borderRadius: 200, position: 'absolute' },
  glowBlue: { backgroundColor: 'rgba(191,219,254,0.45)', height: 300, right: -80, top: -50, width: 300 },
  glowGold: { backgroundColor: 'rgba(253,230,138,0.34)', bottom: 100, height: 330, left: -130, width: 330 },
  route: { borderColor: 'rgba(148,163,184,0.35)', borderRadius: 180, borderWidth: 2, height: 380, position: 'absolute', width: 580 },
  routeOne: { left: -260, top: 90, transform: [{ rotate: '-18deg' }] },
  routeTwo: { left: -80, top: -90, transform: [{ rotate: '38deg' }] },
  mapCircle: { borderColor: 'rgba(148,163,184,0.25)', borderRadius: 100, borderWidth: 1.5, position: 'absolute' },
  circleOne: { height: 180, left: 70, top: 160, width: 180 },
  circleTwo: { height: 100, right: 10, top: 100, width: 100 },
  pin: { borderRadius: 8, height: 12, position: 'absolute', width: 12 },
  pinAmber: { backgroundColor: '#F59E0B', left: 34, top: 130 },
  pinSky: { backgroundColor: '#0EA5E9', right: 62, top: 168 },
  pinRose: { backgroundColor: '#FB7185', left: 96, top: 250 },
  pinGreen: { backgroundColor: '#10B981', right: 26, top: 280 },
  rom: { color: 'rgba(168,162,158,0.28)', fontSize: 64, fontWeight: '900', left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 190 },
});
