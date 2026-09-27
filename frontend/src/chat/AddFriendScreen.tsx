import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Header } from '../trips/tripUi';
import { useChatUi, Icon,  Sheet, } from './chatUi';
export default function AddFriendScreen({ user, onBack, onRequests }: { user: { displayName: string; email: string }; onBack: () => void; onRequests: () => void }) {
  const { c, s, u } = useChatUi();
  const [modal, setModal] = useState<'phone' | 'scanner' | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const search = () => {
    const clean = phone.replace(/\s/g, '');
    setError(/^\+?\d{9,15}$/.test(clean) ? 'Tìm bạn qua số điện thoại hiện chưa khả dụng.' : 'Vui lòng nhập số điện thoại hợp lệ.');
  };
  return <View style={u.screen}><Header title="Thêm bạn" subtitle="Tìm bạn đồng hành cho chuyến đi tiếp theo." onBack={onBack} /><ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
    {([{ label: 'Lời mời kết bạn', icon: 'account-group-outline', action: onRequests }, { label: 'Nhập số điện thoại', icon: 'phone-outline', action: () => { setError(''); setPhone(''); setModal('phone'); } }, { label: 'Quét mã QR của bạn bè', icon: 'qrcode-scan', action: () => setModal('scanner') }] as const).map(row => <Pressable key={row.label} accessibilityRole="button" onPress={row.action} style={({ pressed }) => [u.listRow, pressed && { backgroundColor: c.pale }]}><View style={{ width: 44, height: 44, borderWidth: 1, borderColor: c.border, backgroundColor: c.white, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Icon name={row.icon} color={c.ink} size={20} /></View><Text style={[s.title, s.grow, { fontWeight: '400' }]}>{row.label}</Text><Icon name="chevron-right" color={c.muted} /></Pressable>)}
    <View style={{ alignItems: 'center', padding: 24, gap: 12 }}><Text style={[s.title, { fontSize: 22 }]}>{user.displayName}</Text><Text style={s.small}>{user.email}</Text><View style={{ padding: 24, borderWidth: 1, borderColor: c.border, borderRadius: 18, backgroundColor: c.white }}><View style={{ width: 192, height: 192, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: c.pale, borderRadius: 11 }}><Icon name="qrcode" size={64} color={c.muted} /><Text style={[s.text, { textAlign: 'center', paddingHorizontal: 12 }]}>Mã QR kết bạn hiện chưa khả dụng.</Text></View></View><Text style={s.text}>Mã QR cá nhân</Text></View>
  </ScrollView>
    <Sheet visible={modal === 'phone'} title="Tìm bạn qua số điện thoại" onClose={() => setModal(null)}><TextInput keyboardType="phone-pad" accessibilityLabel="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Nhập số điện thoại..." style={[s.input, { fontSize: 16 }]} />{!!error && <Text style={s.error}>{error}</Text>}<Button label="Tìm kiếm" onPress={search} /></Sheet>
    <Sheet visible={modal === 'scanner'} title="Quét mã QR của bạn bè" onClose={() => setModal(null)}><Text style={s.text}>Đưa mã QR của bạn bè vào trong khung để kết nối.</Text><View style={{ aspectRatio: 1, backgroundColor: '#111', borderRadius: 18, padding: 32, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: '100%', aspectRatio: 1, borderWidth: 2, borderColor: c.onBlue, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera-outline" size={48} color={c.onBlue} /></View></View><Text style={[s.text, { textAlign: 'center' }]}>Quét mã QR hiện chưa khả dụng.</Text><View style={s.row}><View style={s.grow}><Button label="Quét mã" onPress={() => Alert.alert('Chưa hỗ trợ', 'Chức năng quét QR sẽ được bổ sung sau.')} /></View><View style={s.grow}><Button outline label="Chọn ảnh" onPress={() => Alert.alert('Chưa hỗ trợ', 'Chức năng đọc QR từ ảnh sẽ được bổ sung sau.')} /></View></View></Sheet>
  </View>;
}
