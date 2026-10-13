import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { InlineError, InputField, PasswordField } from './AuthComponents';
import { colors, styles } from './authStyles';
import { usePasswordResetViewModel } from './usePasswordResetViewModel';
export default function ForgotPasswordSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    email,
    setEmail,
    step,
    challenge,
    cooldown,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    isSubmitting,
    apiError,
    requestCode,
    continueToPassword,
    resetPassword,
    back,
  } = usePasswordResetViewModel(onClose, Alert.alert);
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="Đóng khôi phục mật khẩu"
          disabled={isSubmitting}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.forgotKeyboard}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.forgotScroll}
            contentContainerStyle={styles.forgotSheet}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.forgotHeader}>
              <View style={styles.forgotTitleRow}>
                <View style={styles.forgotIconCircle}>
                  <MaterialCommunityIcons name="email-outline" size={18} color={colors.blue} />
                </View>
                <View>
                  <Text style={styles.forgotTitle}>Khôi phục mật khẩu</Text>
                  <Text style={styles.forgotStep}>
                    Bước {step === 'email' ? 1 : step === 'otp' ? 2 : 3}/3
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                hitSlop={8}
                disabled={isSubmitting}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.subtlePressed]}
              >
                <MaterialCommunityIcons name="close" size={17} color={colors.muted} />
              </Pressable>
            </View>

            {step === 'email' && (
              <>
                <Text style={styles.forgotDescription}>
                  Nhập email đã đăng ký để nhận mã đặt lại mật khẩu.
                </Text>
                <Text style={styles.forgotLabel}>EMAIL ĐĂNG KÝ</Text>
                <InputField
                  icon="email-outline"
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
              </>
            )}
            {step === 'otp' && (
              <>
                <Text style={styles.forgotDescription}>
                  Nhập mã 6 chữ số đã gửi tới <Text style={styles.strongText}>{email.trim()}</Text>.
                  {challenge &&
                    ` Mã có hiệu lực đến ${new Date(challenge.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`}
                </Text>
                <Text style={styles.forgotLabel}>MÃ OTP</Text>
                <InputField
                  icon="key-variant"
                  placeholder="Mã OTP 6 chữ số"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting || cooldown.seconds > 0}
                  onPress={requestCode}
                  style={({ pressed }) => [styles.otpResendButton, pressed && styles.subtlePressed]}
                >
                  <MaterialCommunityIcons name="refresh" size={15} color={colors.blue} />
                  <Text style={styles.link}>
                    {cooldown.seconds > 0 ? `Gửi lại sau ${cooldown.seconds}s` : 'Gửi lại mã'}
                  </Text>
                </Pressable>
              </>
            )}
            {step === 'password' && (
              <>
                <Text style={styles.forgotDescription}>
                  Tạo mật khẩu mới cho tài khoản {email.trim()}.
                </Text>
                <Text style={styles.forgotLabel}>MẬT KHẨU MỚI</Text>
                <PasswordField
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  autoComplete="new-password"
                />
                <Text style={styles.forgotLabel}>XÁC NHẬN MẬT KHẨU</Text>
                <PasswordField
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  autoComplete="new-password"
                />
              </>
            )}
            <InlineError message={apiError} />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={back}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>
                  {step === 'email' ? 'Hủy' : 'Quay lại'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={
                  step === 'email' ? 'Gửi mã OTP' : step === 'otp' ? 'Tiếp tục' : 'Đặt lại mật khẩu'
                }
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSubmitting,
                  disabled: isSubmitting || (step === 'email' && cooldown.seconds > 0),
                }}
                disabled={isSubmitting || (step === 'email' && cooldown.seconds > 0)}
                onPress={
                  step === 'email'
                    ? requestCode
                    : step === 'otp'
                      ? continueToPassword
                      : resetPassword
                }
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  isSubmitting && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalPrimaryText}>
                  {isSubmitting
                    ? 'Đang xử lý…'
                    : step === 'email'
                      ? cooldown.seconds > 0
                        ? `Gửi lại sau ${cooldown.seconds}s`
                        : 'Gửi mã OTP'
                      : step === 'otp'
                        ? 'Tiếp tục'
                        : 'Đổi mật khẩu'}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={17} color={colors.white} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
