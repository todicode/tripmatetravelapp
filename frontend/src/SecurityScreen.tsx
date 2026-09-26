import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, Header, Icon, s } from './trips/tripUi';

export default function SecurityScreen({ onBack, onChangePassword }: { onBack: () => void; onChangePassword: (currentPassword: string, newPassword: string) => Promise<void> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (!submitting.current) onBack(); return true; });
    return () => subscription.remove();
  }, [onBack]);
  const submit = async () => {
    if (submitting.current) return;
    if (!current.trim()) return setError('Vui lòng nhập mật khẩu hiện tại.');
    if (!next.trim() || next.length < 8 || next.length > 128) return setError('Mật khẩu mới cần từ 8 đến 128 ký tự.');
    // BCrypt stores at most 72 UTF-8 bytes, including passwords containing Vietnamese characters.
    let bytes: number;
    try { bytes = encodeURIComponent(next).replace(/%[A-F\d]{2}/gi, '_').length; }
    catch { return setError('Mật khẩu chứa ký tự không hợp lệ.'); }
    if (bytes > 72) return setError('Mật khẩu mới vượt quá 72 byte UTF-8. Hãy dùng mật khẩu ngắn hơn.');
    if (next === current) return setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    if (next !== confirm) return setError('Xác nhận mật khẩu mới chưa khớp.');
    submitting.current = true;
    setBusy(true); setError('');
    try { await onChangePassword(current, next); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không đổi được mật khẩu. Vui lòng thử lại.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
    <Header title="Quyền riêng tư & Bảo mật" onBack={() => { if (!busy) onBack(); }} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
      <View style={s.card}><View style={s.row}><Icon name="lock-reset" size={24} /><Text style={[s.title, { fontSize: 16 }]}>Đổi mật khẩu</Text></View><Text style={s.small}>Sau khi đổi mật khẩu, bạn sẽ được đăng xuất trên tất cả thiết bị và cần đăng nhập lại.</Text>
        {[
          { label: 'Mật khẩu hiện tại', value: current, update: setCurrent, content: 'password' as const },
          { label: 'Mật khẩu mới', value: next, update: setNext, content: 'newPassword' as const },
          { label: 'Xác nhận mật khẩu mới', value: confirm, update: setConfirm, content: 'newPassword' as const },
        ].map(field => <View key={field.label} style={{ gap: 6 }}><Text style={s.text}>{field.label}</Text><View style={[s.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingRight: 0 }]}>
          <TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.update} secureTextEntry={!visible[field.label]} editable={!busy} autoCapitalize="none" autoCorrect={false} textContentType={field.content} maxLength={128} style={{ flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 8, color: c.ink, fontSize: 12 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${visible[field.label] ? 'Ẩn' : 'Hiện'} ${field.label.toLocaleLowerCase('vi-VN')}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setVisible(value => ({ ...value, [field.label]: !value[field.label] }))} style={({ pressed }) => [{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, (pressed || busy) && { opacity: 0.5 }]}><Icon name={visible[field.label] ? 'eye-off-outline' : 'eye-outline'} color={c.muted} size={20} /></Pressable>
        </View></View>)}
        <Text style={s.small}>Ít nhất 8 ký tự, tối đa 72 byte UTF-8.</Text>
        {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => { void submit(); }} style={({ pressed }) => [s.button, { minHeight: 44 }, (pressed || busy) && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={c.white} /> : <Text style={s.buttonText}>Đổi mật khẩu</Text>}</Pressable>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
