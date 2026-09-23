import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
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

const authApiBaseUrl = process.env.EXPO_PUBLIC_GOOGLE_AUTH_API_URL
  ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1');
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const installationId = '00000000-0000-4000-8000-000000000002';

type SessionResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
  deviceId: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
};

type RegistrationChallenge = {
  verificationId: string;
  expiresAt: string;
  resendAvailableAt: string;
};

class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

async function apiRequest<T>(
  baseUrl: string,
  serviceName: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', `Không thể kết nối ${serviceName} tại ${baseUrl}.`, 0);
  }

  const payload = await response.json().catch(() => ({})) as {
    data?: T;
    error?: { code?: string; message?: string };
  };

  if (!response.ok || payload.error) {
    throw new ApiRequestError(
      payload.error?.code ?? 'REQUEST_FAILED',
      payload.error?.message ?? `${serviceName} trả về HTTP ${response.status}.`,
      response.status,
    );
  }

  return payload.data as T;
}

async function authRequest<T>(path: string, body: Record<string, unknown>) {
  return apiRequest<T>(authApiBaseUrl, 'Backend API', path, body);
}

function configureGoogleSignIn() {
  if (!googleWebClientId) {
    throw new ApiRequestError(
      'GOOGLE_CONFIG_MISSING',
      'Chưa có EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong frontend/.env.local.',
      0,
    );
  }

  GoogleSignin.configure({ webClientId: googleWebClientId });
}

async function googleAuthRequest(): Promise<SessionResponse> {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const result = await GoogleSignin.signIn();
  if (result.type !== 'success' || !result.data.idToken) {
    throw new ApiRequestError('GOOGLE_SIGN_IN_CANCELLED', 'Đăng nhập Google đã bị hủy.', 0);
  }

  return authRequest<SessionResponse>('/auth/google', {
    idToken: result.data.idToken,
    installationId,
  });
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Đã xảy ra lỗi không xác định.';
}

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

function GoogleButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{ color: '#F0F0F2', borderless: false }}
      onPress={onPress}
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

function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={styles.errorBanner}>
      <MaterialCommunityIcons name="alert-circle-outline" size={17} color="#B42318" />
      <Text style={styles.errorText}>{message}</Text>
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
} & Pick<TextInputProps, 'autoCapitalize' | 'autoComplete' | 'keyboardType' | 'maxLength'>) {
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const showSession = (session: SessionResponse) => {
    Alert.alert('Đăng nhập thành công', `Phiên đăng nhập đã cấp cho ${session.user.email}.`);
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setApiError(null);
    setIsSubmitting(true);
    try {
      const session = await authRequest<SessionResponse>('/auth/login', {
        email: email.trim(),
        installationId,
        password,
      });
      showSession(session);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitGoogle = async () => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const session = await googleAuthRequest();
      showSession(session);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.panelContent}>
      <GoogleButton label="Tiếp tục với Google" onPress={submitGoogle} />
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

      <InlineError message={apiError} />
      <PrimaryButton label="Đăng nhập" loading={isSubmitting} onPress={submit} />
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const pendingVerificationRef = useRef<string | null>(null);

  const cancelPendingRegistration = () => {
    const pendingId = pendingVerificationRef.current;
    pendingVerificationRef.current = null;
    setVerificationId('');
    setChallenge(null);
    setOtp('');
    setApiError(null);
    setRegisterStep('form');
    if (pendingId) {
      void authRequest<void>('/auth/register/cancel', { verificationId: pendingId }).catch(() => {});
    }
  };

  useEffect(() => () => {
    const pendingId = pendingVerificationRef.current;
    if (pendingId) {
      void authRequest<void>('/auth/register/cancel', { verificationId: pendingId }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (registerStep !== 'otp') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isSubmitting) cancelPendingRegistration();
      return true;
    });
    return () => subscription.remove();
  }, [registerStep, isSubmitting]);

  const showSession = (session: SessionResponse) => {
    Alert.alert('Đăng ký thành công', `Phiên đăng nhập đã cấp cho ${session.user.email}.`);
  };

  const submit = async () => {
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

    setApiError(null);
    setIsSubmitting(true);
    try {
      const nextChallenge = await authRequest<RegistrationChallenge>('/auth/register', {
        displayName: name.trim(),
        email: email.trim(),
        installationId,
        password,
        phone: phone.trim(),
      });
      setChallenge(nextChallenge);
      setVerificationId(nextChallenge.verificationId);
      pendingVerificationRef.current = nextChallenge.verificationId;
      setOtp('');
      setRegisterStep('otp');
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setApiError('OTP_INVALID: Vui lòng nhập đủ 6 chữ số.');
      return;
    }

    setApiError(null);
    setIsSubmitting(true);
    try {
      const session = await authRequest<SessionResponse>('/auth/register/verify', {
        otp,
        verificationId,
      });
      pendingVerificationRef.current = null;
      showSession(session);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const nextChallenge = await authRequest<RegistrationChallenge>('/auth/register/resend', {
        verificationId,
      });
      setChallenge(nextChallenge);
      setOtp('');
      Alert.alert('Đã gửi lại mã', 'Vui lòng kiểm tra hộp thư email của bạn.');
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitGoogle = async () => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const session = await googleAuthRequest();
      showSession(session);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registerStep === 'otp') {
    return (
      <View style={styles.panelContent}>
        <View style={styles.otpHeader}>
          <View style={styles.otpIconCircle}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.blue} />
          </View>
          <View>
            <Text style={styles.otpTitle}>Xác thực mã OTP</Text>
            <Text style={styles.otpStep}>Bước 2/2: Kiểm tra email</Text>
          </View>
        </View>
        <Text style={styles.otpDescription}>
          Nhập mã 6 chữ số đã gửi tới <Text style={styles.strongText}>{email}</Text>.
        </Text>
        <View style={styles.mockNotice}>
          <Text style={styles.mockNoticeTitle}>EMAIL OTP</Text>
          <Text style={styles.mockNoticeText}>Mã có hiệu lực trong 3 phút. Kiểm tra email hoặc log backend nếu chưa bật SMTP.</Text>
          {challenge && <Text style={styles.mockNoticeMeta}>Challenge: {challenge.verificationId.slice(0, 8)}…</Text>}
        </View>
        <InputField
          icon="key-variant"
          placeholder="Mã OTP 6 chữ số"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        <InlineError message={apiError} />
        <PrimaryButton label="Xác thực OTP" loading={isSubmitting} onPress={verifyOtp} />
        <View style={styles.otpActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={cancelPendingRegistration}
            style={({ pressed }) => [styles.otpBackButton, pressed && styles.subtlePressed]}
          >
            <Text style={styles.otpBackText}>Quay lại</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={resendOtp}
            style={({ pressed }) => [styles.otpResendButton, pressed && styles.subtlePressed]}
          >
            <MaterialCommunityIcons name="refresh" size={15} color={colors.blue} />
            <Text style={styles.link}>Gửi lại mã</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.panelContent}>
      <GoogleButton label="Đăng ký với Google" onPress={submitGoogle} />
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

      <InlineError message={apiError} />
      <PrimaryButton label="Đăng ký tài khoản" loading={isSubmitting} onPress={submit} />
      <View style={styles.switchPromptRegister}>
        <Text style={styles.promptText}>Đã có tài khoản? </Text>
        <Pressable accessibilityRole="link" onPress={onLogin}>
          <Text style={styles.link}>Đăng nhập</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  loading = false,
  onPress,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      android_ripple={{ color: colors.blueBright }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, loading && styles.disabledButton, pressed && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{loading ? 'Đang xử lý…' : label}</Text>
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
  errorBanner: { alignItems: 'center', backgroundColor: '#FFF4F2', borderColor: '#FECACA', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginTop: 8, paddingHorizontal: 12, paddingVertical: 9 },
  errorText: { color: '#B42318', flex: 1, fontSize: 12, lineHeight: 17, marginLeft: 7 },
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
  disabledButton: { backgroundColor: '#8DB5E5' },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '400' },
  switchPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 11 },
  switchPromptRegister: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 9 },
  promptText: { color: colors.muted, fontSize: 12 },
  termsRow: { alignItems: 'center', flexDirection: 'row', minHeight: 42, paddingHorizontal: 1 },
  termsText: { color: colors.muted, flex: 1, fontSize: 11, marginLeft: -2 },
  otpHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  otpIconCircle: { alignItems: 'center', backgroundColor: '#EAF2FF', borderRadius: 19, height: 38, justifyContent: 'center', marginRight: 10, width: 38 },
  otpTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  otpStep: { color: colors.muted, fontSize: 11, marginTop: 2 },
  otpDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  strongText: { color: colors.ink, fontWeight: '600' },
  mockNotice: { backgroundColor: '#EAF2FF', borderColor: '#B9D4F8', borderRadius: 14, borderWidth: 1, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10 },
  mockNoticeTitle: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  mockNoticeText: { color: '#335B86', fontSize: 12, marginTop: 3 },
  mockNoticeMeta: { color: '#6B86A2', fontSize: 10, marginTop: 4 },
  otpActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  otpBackButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  otpBackText: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  otpResendButton: { alignItems: 'center', flexDirection: 'row', minHeight: 44, paddingHorizontal: 10 },
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
