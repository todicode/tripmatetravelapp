import { useSettingsViewModel } from './useSettingsViewModel';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useAppTheme } from './theme/AppTheme';
import { Header, Icon, useTripUi } from './trips/tripUi';

export default function SettingsScreen({ onBack, onSecurity }: { onBack: () => void; onSecurity: () => void }) {
  const { mode, setMode } = useAppTheme();
  const { c, s } = useTripUi();
  const { busy, setBusy, prefs, toggle } = useSettingsViewModel({ onBack, notify: Alert.alert });
  const [privacyOpen, setPrivacyOpen] = useState(false);
  return <View style={s.screen}><Header title="Cài đặt" onBack={onBack} /><ScrollView contentContainerStyle={s.body}>
    <View style={s.card}><View style={s.row}><Icon name="white-balance-sunny" /><Text style={[s.title, { fontSize: 17 }]}>Giao diện</Text></View><View style={s.row}>{(['light', 'dark'] as const).map(value => <Pressable key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: mode === value, disabled: busy }} onPress={() => { setBusy(true); void setMode(value).catch(() => Alert.alert('Chưa lưu được giao diện')).finally(() => setBusy(false)); }} style={({ pressed }) => [s.card, s.row, { flex: 1, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 11 }, mode === value && { backgroundColor: c.primaryLight, borderColor: c.blue }, pressed && { opacity: 0.6 }]}><Icon name={value === 'light' ? 'white-balance-sunny' : 'moon-waning-crescent'} /><Text style={s.text}>{value === 'light' ? 'Sáng' : 'Tối'}</Text></Pressable>)}</View><Text style={s.small}>Áp dụng cho toàn bộ giao diện sau đăng nhập và lưu trên thiết bị.</Text></View>
    <View style={s.card}><View style={s.row}><Icon name="bell-outline" /><Text style={[s.title, { fontSize: 17 }]}>Thông báo & nhắc nhở</Text></View>{([{ key: 'tripReminders', label: 'Nhắc lịch chuyến đi' }, { key: 'chatNotifications', label: 'Thông báo tin nhắn' }] as const).map(item => <View key={item.key} style={[s.between, { minHeight: 56 }]}><Text style={[s.text, s.grow]}>{item.label}</Text><Switch disabled={busy} value={prefs[item.key]} onValueChange={() => { void toggle(item.key); }} accessibilityLabel={item.label} trackColor={{ true: c.blue }} /></View>)}<Text style={s.small}>Tùy chọn được lưu trên thiết bị. Thông báo thực tế sẽ có khi dịch vụ được kết nối.</Text></View>
    <View style={s.card}><Pressable onPress={() => setPrivacyOpen(!privacyOpen)} accessibilityRole="button" accessibilityState={{ expanded: privacyOpen }} style={[s.row, { minHeight: 44 }]}><Icon name="shield-outline" /><Text style={[s.title, s.grow]}>Quyền riêng tư & bảo mật</Text><Icon name={privacyOpen ? 'chevron-up' : 'chevron-down'} color={c.ink} /></Pressable>{privacyOpen && <View style={{ gap: 12, paddingTop: 12 }}><Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>Hồ sơ và email đăng nhập được lấy từ tài khoản của bạn.</Text><Pressable onPress={onSecurity} style={[s.row, { minHeight: 44 }]}><Icon name="lock-outline" /><Text style={{ color: c.blue, fontSize: 14 }}>Đổi mật khẩu</Text><Icon name="chevron-right" color={c.muted} /></Pressable></View>}</View>
  </ScrollView></View>;
}
