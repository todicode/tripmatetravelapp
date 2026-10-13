import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  Divider,
  GoogleButton,
  InlineError,
  InputField,
  PasswordField,
  PrimaryButton,
} from './AuthComponents';
import { colors, styles } from './authStyles';
import type { OnAuthenticated } from './authTypes';
import { useRegistrationViewModel } from './useRegistrationViewModel';
export default function RegisterPanel({
  onLogin,
  onAuthenticated,
}: {
  onLogin: () => void;
  onAuthenticated: OnAuthenticated;
}) {
  const {
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    agreeTerms,
    setAgreeTerms,
    registerStep,
    verificationId,
    otp,
    setOtp,
    challenge,
    cooldown,
    isSubmitting,
    apiError,
    cancelPendingRegistration,
    submit,
    verifyOtp,
    resendOtp,
    submitGoogle,
  } = useRegistrationViewModel(onAuthenticated, Alert.alert);
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
          <Text style={styles.mockNoticeText}>
            Kiểm tra hộp thư đến và thư rác để lấy mã xác minh.
          </Text>
          {challenge && (
            <Text style={styles.mockNoticeMeta}>
              Mã hết hạn lúc {new Date(challenge.expiresAt).toLocaleTimeString('vi-VN')}.
            </Text>
          )}
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
            disabled={isSubmitting || cooldown.seconds > 0}
            onPress={resendOtp}
            style={({ pressed }) => [styles.otpResendButton, pressed && styles.subtlePressed]}
          >
            <MaterialCommunityIcons name="refresh" size={15} color={colors.blue} />
            <Text style={styles.link}>
              {cooldown.seconds > 0 ? `Gửi lại sau ${cooldown.seconds}s` : 'Gửi lại mã'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panelContent}>
      <GoogleButton label="Đăng ký với Google" onPress={submitGoogle} disabled={isSubmitting} />
      <Divider label="hoặc đăng ký với email" />

      <InputField
        icon="account-outline"
        placeholder="Họ và tên"
        value={name}
        onChangeText={setName}
      />
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
