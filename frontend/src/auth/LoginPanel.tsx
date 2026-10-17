import { Alert, Pressable, Text, View } from 'react-native';
import {
  CheckToggle,
  Divider,
  GoogleButton,
  InlineError,
  InputField,
  PasswordField,
  PrimaryButton,
} from './AuthComponents';
import { styles } from './authStyles';
import type { OnAuthenticated } from './authTypes';
import ForgotPasswordSheet from './ForgotPasswordSheet';
import { useLoginViewModel } from './useLoginViewModel';
export default function LoginPanel({
  onRegister,
  onAuthenticated,
}: {
  onRegister: () => void;
  onAuthenticated: OnAuthenticated;
}) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    forgotVisible,
    setForgotVisible,
    isSubmitting,
    apiError,
    submit,
    submitGoogle,
  } = useLoginViewModel(onAuthenticated, Alert.alert);
  return (
    <View style={styles.panelContent}>
      <GoogleButton label="Tiếp tục với Google" onPress={submitGoogle} disabled={isSubmitting} />
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
        <CheckToggle
          checked={rememberMe}
          label="Ghi nhớ tôi"
          onPress={() => setRememberMe((value) => !value)}
        />
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
