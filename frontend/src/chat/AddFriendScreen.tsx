import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Header } from '../trips/tripUi';
import { c, Icon, s, Sheet, u } from './chatUi';
export default function AddFriendScreen({ user, onBack, onRequests }: { user: { displayName: string; email: string }; onBack: () => void; onRequests: () => void }) {
  const [modal, setModal] = useState<'phone' | 'scanner' | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const search = () => {
    const clean = phone.replace(/\s/g, '');
    setError(/^\+?\d{9,15}$/.test(clean) ? 'Tìm bạn qua số điện thoại hiện chưa khả dụng.' : 'Vui lòng nhập số điện thoại hợp lệ.');
  };
  return <View style={u.screen}><Header title="Thêm bạn" onBack={onBack} /><ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
    {([{ label: 'Lời mời kết bạn', icon: 'account-group-outline', action: onRequests }, { label: 'Nhập số điện thoại', icon: 'phone-outline', action: () => { setError(''); setPhone(''); setModal('phone'); } }, { label: 'Quét mã QR của bạn bè', icon: 'qrcode-scan', action: () => setModal('scanner') }] as const).map(row => <Pressable key={row.label} accessibilityRole="button" onPress={row.action} style={({ pressed }) => [u.listRow, pressed && { backgroundColor: c.pale }]}><View style={{ width: 40, height: 40, backgroundColor: c.pale, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Icon name={row.icon} color={c.ink} size={20} /></View><Text style={[s.title, s.grow]}>{row.label}</Text><Icon name="chevron-right" color={c.muted} /></Pressable>)}
    <View style={{ alignItems: 'center', padding: 24, gap: 12 }}><Text style={[s.title, { fontSize: 16 }]}>{user.displayName}</Text><Text style={s.small}>{user.email}</Text><Text style={s.small}>Mã QR kết bạn hiện chưa khả dụng.</Text></View>
  </ScrollView>
    <Sheet visible={modal === 'phone'} title="Tìm bạn qua số điện thoại" onClose={() => setModal(null)}><TextInput keyboardType="phone-pad" accessibilityLabel="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Nhập số điện thoại..." style={s.input} />{!!error && <Text style={s.error}>{error}</Text>}<Button label="Tìm kiếm" onPress={search} /></Sheet>
    <Sheet visible={modal === 'scanner'} title="Quét mã QR của bạn bè" onClose={() => setModal(null)}><View style={u.empty}><Icon name="qrcode-scan" size={64} /><Text style={s.small}>Quét mã QR hiện chưa khả dụng.</Text></View></Sheet>
  </View>;
}
