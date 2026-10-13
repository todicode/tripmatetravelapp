import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineError, InputField, PrimaryButton } from './AuthComponents';
import { colors, styles } from './authStyles';
import { usePhoneCompletionViewModel } from './usePhoneCompletionViewModel';
export default function CompletePhoneDialog({
  onComplete,
  onLogout,
  sessionError,
}: {
  onComplete: (phone: string) => Promise<void>;
  onLogout: () => Promise<void>;
  sessionError: string | null;
}) {
  const { phone, setPhone, setTouched, submitting, error, invalid, submit } =
    usePhoneCompletionViewModel(onComplete);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <SafeAreaView style={styles.phoneOverlay} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.phoneDialogScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.phoneDialog}>
              <View accessible={false} style={styles.phoneDialogIcon}>
                <MaterialCommunityIcons name="phone-outline" size={24} color={colors.blue} />
              </View>
              <Text style={styles.phoneDialogTitle}>Vui lòng nhập SĐT của bạn</Text>
              <Text style={styles.phoneDialogDescription}>
                Bạn cần thêm số điện thoại trước khi tiếp tục vào TripMate.
              </Text>
              <Text style={styles.phoneDialogLabel}>Số điện thoại (bắt buộc)</Text>
              <InputField
                icon="phone-outline"
                placeholder="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                onBlur={() => setTouched(true)}
                autoComplete="tel"
                keyboardType="phone-pad"
                maxLength={32}
              />
              {invalid && (
                <Text accessibilityRole="alert" style={styles.phoneFieldError}>
                  Nhập số điện thoại hợp lệ từ 7 đến 32 ký tự.
                </Text>
              )}
              <InlineError message={error ?? sessionError} />
              <PrimaryButton label="Lưu và tiếp tục" loading={submitting} onPress={submit} />
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => {
                  void onLogout();
                }}
                style={({ pressed }) => [styles.phoneLogout, pressed && styles.subtlePressed]}
              >
                <Text style={styles.link}>Đăng xuất</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
