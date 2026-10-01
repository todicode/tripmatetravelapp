import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Header, Icon, useTripUi } from './trips/tripUi';
import { useToast } from './theme/Toast';
import { useEditProfileViewModel } from './profile/useEditProfileViewModel';

export default function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const { c, s } = useTripUi();
  const toast = useToast();
  const form = useEditProfileViewModel(onBack, () => toast('Đã cập nhật hồ sơ'));
  const handleBack = useCallback(() => {
    if (form.requestBack() === 'confirm') Alert.alert('Bỏ thay đổi?', 'Tên vừa nhập chưa được lưu.', [
      { text: 'Tiếp tục sửa', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: form.discard },
    ]);
  }, [form.requestBack, form.discard]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { handleBack(); return true; });
    return () => sub.remove();
  }, [handleBack]);
  return <View style={s.screen}>
    <Header title="Chỉnh sửa hồ sơ" onBack={handleBack} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={[s.card, { alignItems: 'center', padding: 20, gap: 12 }]}>
          <View accessibilityLabel="Ảnh đại diện" style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.onBlue, fontSize: 24, fontWeight: '600' }}>{Array.from(form.name.trim()).slice(-1).join('').toUpperCase()}</Text>
            <View style={{ position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera-outline" size={16} color={c.muted} /></View>
          </View>
          <Text style={s.small}>Thay ảnh đại diện sẽ được hỗ trợ sau.</Text>
        </View>
        <View style={[s.card, { gap: 16 }]}>
          <Text style={[s.title, { fontSize: 14 }]}>Tên hiển thị</Text>
          <TextInput accessibilityLabel="Tên hiển thị" value={form.name} onChangeText={form.setName} editable={!form.isSaving}
            autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => { void form.save(); }}
            style={[s.input, { fontSize: 16, borderWidth: 0, borderRadius: 8 }]} />
          {!!form.fieldError && <Text accessibilityLiveRegion="polite" style={s.error}>{form.fieldError}</Text>}
          <Text style={[s.title, { fontSize: 14 }]}>Email</Text>
          <TextInput accessibilityLabel="Email, chỉ đọc" value={form.email} editable={false} style={[s.input, { fontSize: 16, borderWidth: 0, borderRadius: 8 }]} />
        </View>
        <Text style={s.small}>Tên hiển thị tối đa 100 ký tự. Email không thể chỉnh sửa tại đây.</Text>
        {!!form.errorMessage && <Text accessibilityRole="alert" style={s.error}>{form.errorMessage}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !form.canSave, busy: form.isSaving }} disabled={!form.canSave}
          onPress={() => { void form.save(); }} style={[s.button, !form.canSave && { opacity: 0.6 }]}>
          {form.isSaving ? <View style={s.row}><ActivityIndicator color={c.onBlue} /><Text style={s.buttonText}>Đang lưu…</Text></View> : <Text style={s.buttonText}>Lưu thay đổi</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
