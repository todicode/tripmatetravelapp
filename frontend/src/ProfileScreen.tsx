import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import SecurityScreen from './SecurityScreen';
import SettingsScreen from './SettingsScreen';
import EditProfileScreen from './EditProfileScreen';
import { Icon, useTripUi } from './trips/tripUi';
import { useProfileViewModel } from './profile/useProfileViewModel';

type Props = { user: { displayName: string; email: string }; onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>; onTrips: () => void; onLogout: () => void; onRequests: () => void; onSavedPlaces: () => void; onDetailChange: (detail: boolean) => void; requestsCount?: number };
export default function ProfileScreen({ user, onChangePassword, onLogout, onRequests, onSavedPlaces, onDetailChange, requestsCount = 0 }: Props) {
  const { c, s } = useTripUi();
  const { isLoading, errorMessage, profile, avatarUri, retry } = useProfileViewModel();
  const [security, setSecurity] = useState(false);
  const [settings, setSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => { onDetailChange(security || settings || editing); return () => onDetailChange(false); }, [security, settings, editing, onDetailChange]);
  if (security) return <SecurityScreen onBack={() => setSecurity(false)} onChangePassword={onChangePassword} />;
  if (settings) return <SettingsScreen onBack={() => setSettings(false)} onSecurity={() => setSecurity(true)} />;
  if (editing) return <EditProfileScreen onBack={() => setEditing(false)} />;
  const name = user.displayName.trim() || user.email;
  return <View style={s.screen}>
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.chrome, minHeight: 68, justifyContent: 'center' }}><Text style={[s.title, { fontSize: 20, lineHeight: 26 }]}>Cá nhân</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20 }}>
      {isLoading && <Text accessibilityLiveRegion="polite" style={s.small}>Đang tải hồ sơ…</Text>}
      {!!errorMessage && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{errorMessage}</Text><Pressable accessibilityRole="button" onPress={() => { void retry(); }} style={s.button}><Text style={s.buttonText}>Thử lại</Text></Pressable></View>}
      <Pressable accessibilityLabel="Chỉnh sửa hồ sơ cá nhân" disabled={!profile || isLoading} accessibilityState={{ disabled: !profile || isLoading }} onPress={() => setEditing(true)} style={({ pressed }) => [s.card, { alignItems: 'center', gap: 8 }, (!profile || isLoading) && { opacity: 0.6 }, pressed && { opacity: 0.88 }]}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}>{avatarUri ? <Image accessibilityLabel="Ảnh đại diện" source={{ uri: avatarUri }} style={{ width: 56, height: 56, borderRadius: 28 }} /> : <Text style={{ color: c.onBlue, fontSize: 22, fontWeight: '600' }}>{Array.from(name).slice(-1).join('').toUpperCase()}</Text>}</View>
        <Text numberOfLines={1} style={s.title}>{name}</Text><Text numberOfLines={1} style={s.small}>{user.email}</Text><View style={[s.row, { marginTop: 12 }]}><Icon name="pencil-outline" size={14} /><Text style={{ color: c.blue, fontSize: 14 }}>Chỉnh sửa hồ sơ</Text></View>
      </Pressable>
      <View style={{ backgroundColor: c.white, borderRadius: 18, overflow: 'hidden' }}>{([{ label: 'Địa điểm đã lưu', icon: 'bookmark-outline', action: onSavedPlaces }, { label: 'Lời mời kết bạn', icon: 'account-outline', action: onRequests }, { label: 'Cài đặt', icon: 'cog-outline', action: () => setSettings(true) }] as const).map((item, index) => <Pressable key={item.label} onPress={item.action} style={({ pressed }) => [{ minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: index < 2 ? 1 : 0, borderColor: c.border }, pressed && { backgroundColor: c.pale }]}><View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} size={16} /></View><Text style={[s.text, s.grow]}>{item.label}</Text>{item.label === 'Lời mời kết bạn' && requestsCount > 0 && <Text style={{ color: c.onBlue, fontSize: 12, fontWeight: '600', backgroundColor: c.blue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>{requestsCount}</Text>}<Icon name="chevron-right" size={16} color={c.muted} /></Pressable>)}</View>
      <Pressable onPress={onLogout} style={({ pressed }) => [{ minHeight: 48, borderRadius: 18, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, pressed && { opacity: 0.88 }]}><View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${c.red}1a`, alignItems: 'center', justifyContent: 'center' }}><Icon name="logout" size={16} color={c.red} /></View><Text style={{ fontSize: 14, color: c.red, fontWeight: '600' }}>Đăng xuất</Text></Pressable>
    </ScrollView>
  </View>;
}
