import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Header, Icon, useTripUi } from './trips/tripUi';
import { useToast } from './theme/Toast';
import { useEditProfileViewModel } from './profile/useEditProfileViewModel';

export default function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const { c, s } = useTripUi();
  const toast = useToast();
  const form = useEditProfileViewModel(onBack, () => toast('Đã cập nhật hồ sơ'));
  const handleBack = useCallback(() => {
    if (form.requestBack() === 'confirm') Alert.alert('Bỏ thay đổi?', 'Các thay đổi hồ sơ chưa được lưu.', [
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={[s.card, { alignItems: 'center', padding: 20, gap: 12 }]}>
          <Pressable accessibilityLabel="Thay ảnh đại diện" disabled={form.isSaving || form.isPicking} onPress={() => { void form.chooseAvatar(); }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}>
            {form.avatarUri ? <Image source={{ uri: form.avatarUri }} style={{ width: 80, height: 80, borderRadius: 40 }} /> : <Text style={{ color: c.onBlue, fontSize: 24, fontWeight: '600' }}>{Array.from(form.name.trim()).slice(-1).join('').toUpperCase()}</Text>}
            <View style={{ position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera-outline" size={16} color={c.muted} /></View>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={form.isSaving || form.isPicking} onPress={() => { void form.chooseAvatar(); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>{form.isPicking ? 'Đang chọn ảnh…' : 'Thay ảnh đại diện'}</Text></Pressable>
          {form.canRemoveAvatar && <Pressable accessibilityRole="button" disabled={form.isSaving || form.isPicking} onPress={() => Alert.alert('Xóa ảnh đại diện?', 'Ảnh sẽ được xóa khi bạn lưu thay đổi.', [
            { text: 'Hủy', style: 'cancel' }, { text: 'Xóa ảnh', style: 'destructive', onPress: () => { void form.removeAvatar(); } },
          ])} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.red }}>Xóa ảnh đại diện</Text></Pressable>}
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
        <View style={[s.card, { gap: 12 }]}>
          <Text style={[s.title, { fontSize: 16 }]}>Sở thích du lịch</Text>
          <Text style={s.small}>Chọn những trải nghiệm bạn yêu thích. Bạn có thể thay đổi hoặc bỏ chọn tất cả.</Text>
          {form.isLoadingInterests && <View style={s.row}><ActivityIndicator color={c.blue} /><Text style={s.small}>Đang tải sở thích…</Text></View>}
          {!!form.interestsError && <Text accessibilityRole="alert" style={s.error}>{form.interestsError}</Text>}
          {!form.interestsReady && !form.isLoadingInterests && <Pressable accessibilityRole="button" disabled={form.isSaving} onPress={() => { void form.retryInterests(); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>Thử lại</Text></Pressable>}
          {form.interestsReady && form.interests.length === 0 && <Text style={s.small}>Chưa có danh mục sở thích.</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {form.interests.map(item => {
              const selected = form.interestCodes.includes(item.code);
              return <Pressable key={item.code} accessibilityRole="checkbox" accessibilityLabel={item.label}
                accessibilityState={{ checked: selected, disabled: form.isSaving }} disabled={form.isSaving}
                onPress={() => form.toggleInterest(item.code)}
                style={{ minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 12,
                  borderColor: selected ? c.blue : c.border, backgroundColor: selected ? c.primaryLight : c.white,
                  flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name={selected ? 'checkbox-marked-outline' : 'checkbox-blank-outline'} size={20} color={selected ? c.blue : c.muted} />
                <Text style={{ color: selected ? c.blue : c.ink }}>{item.label}</Text>
              </Pressable>;
            })}
          </View>
        </View>
        <Text style={s.small}>Tên hiển thị tối đa 100 ký tự. Email không thể chỉnh sửa tại đây.</Text>
      </ScrollView>
      <View style={[s.footer, { gap: 8 }]}>
        {!!form.errorMessage && <Text accessibilityRole="alert" style={s.error}>{form.errorMessage}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !form.canSave, busy: form.isSaving }} disabled={!form.canSave}
          onPress={() => { void form.save(); }} style={[s.button, !form.canSave && { opacity: 0.6 }]}>
          {form.isSaving ? <View style={s.row}><ActivityIndicator color={c.onBlue} /><Text style={s.buttonText}>Đang lưu…</Text></View> : <Text style={s.buttonText}>Lưu thay đổi</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </View>;
}
