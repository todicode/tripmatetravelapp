import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, heroImage, styles } from './authStyles';
import type { AuthTab } from './authTypes';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
export function MapBackdrop() {
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

export function Hero({ activeTab }: { activeTab: AuthTab }) {
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

export function GoogleButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{ color: '#F0F0F2', borderless: false }}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="google" size={19} color="#4285F4" />
      <Text style={styles.googleText}>{label}</Text>
    </Pressable>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.divider} />
    </View>
  );
}

export function InlineError({ message }: { message: string | null }) {
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

export function InputField({
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
} & Pick<
  TextInputProps,
  'autoCapitalize' | 'autoComplete' | 'keyboardType' | 'maxLength' | 'onBlur'
>) {
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

export function PasswordField({
  placeholder,
  value,
  onChangeText,
  visible,
  onToggle,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: TextInputProps['autoComplete'];
}) {
  return (
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name="lock-outline" size={18} color="#7A7A7A" />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoComplete={autoComplete}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!visible}
        style={styles.input}
        value={value}
      />
      <Pressable
        accessibilityLabel={
          visible ? `Ẩn ${placeholder.toLowerCase()}` : `Hiện ${placeholder.toLowerCase()}`
        }
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

export function CheckToggle({
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

export function PrimaryButton({
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
      style={({ pressed }) => [
        styles.primaryButton,
        loading && styles.disabledButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{loading ? 'Đang xử lý…' : label}</Text>
    </Pressable>
  );
}
