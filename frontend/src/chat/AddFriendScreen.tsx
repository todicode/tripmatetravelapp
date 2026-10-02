import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { ApiRequestError } from '../auth/session';
import { Button, Header } from '../trips/tripUi';
import { LookupResult, parseFriendQr } from './friendApi';
import { scanFriendQrImage } from './scanFriendQrImage';
import { useChatSession } from './useChatSession';
import { Avatar, Icon, Sheet, useChatUi } from './chatUi';

type Session = ReturnType<typeof useChatSession>;
export default function AddFriendScreen({ user, session, onBack, onRequests }: { user: { displayName: string; email: string }; session: Session; onBack: () => void; onRequests: () => void }) {
  const { c, s, u } = useChatUi();
  const [modal, setModal] = useState<'source' | 'permission' | 'scanner' | 'result' | null>(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [error, setError] = useState('');
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const scanLocked = useRef(false);
  useEffect(() => { session.loadFriendCode().catch(() => {}); }, [session.loadFriendCode]);
  const showError = (cause: unknown) => setError(cause instanceof ApiRequestError && cause.status === 404 ? 'Không tìm thấy tài khoản này.' : cause instanceof Error ? cause.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
  const findPhone = async () => {
    const clean = phone.replace(/\s/g, '');
    if (!/^\+?\d{9,15}$/.test(clean)) { setError('Vui lòng nhập số điện thoại hợp lệ.'); return; }
    setBusy(true); setError('');
    try { setResult(await session.lookupPhone(clean)); setModal('result'); }
    catch (cause) { showError(cause); }
    finally { setBusy(false); }
  };
  const openScanner = async () => {
    setError('');
    setModal(null);
    try {
      let access = await getPermission();
      if (!access.granted && access.canAskAgain) access = await requestPermission();
      if (access.granted) {
        scanLocked.current = false;
        setModal('scanner');
      } else setModal('permission');
    } catch (cause) { showError(cause); setModal('permission'); }
  };
  const lookupQr = async (data: string, fallback: 'source' | 'scanner') => {
    const code = parseFriendQr(data);
    if (!code) { setError('Đây không phải mã QR kết bạn của TripMate.'); setModal(fallback); return; }
    setBusy(true); setError('');
    try { setResult(await session.lookupCode(code)); setModal('result'); }
    catch (cause) { showError(cause); setModal(fallback); }
    finally { setBusy(false); }
  };
  const scan = (data: string) => {
    if (scanLocked.current) return;
    scanLocked.current = true;
    void lookupQr(data, 'scanner');
  };
  const chooseImage = async () => {
    setModal(null); setBusy(true); setError('');
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (selected.canceled) return;
      setScanningImage(true);
      const payload = await scanFriendQrImage(selected.assets[0]);
      if (!payload) { setError('Không tìm thấy mã QR kết bạn của TripMate trong ảnh.'); setModal('source'); return; }
      await lookupQr(payload, 'source');
    } catch (cause) { showError(cause); setModal('source'); }
    finally { setBusy(false); setScanningImage(false); }
  };
  const send = async () => {
    if (!result || busy) return;
    setBusy(true); setError('');
    try {
      const response = await session.sendRequest(result.user.id, message);
      setResult({ ...result, relationship: response.outcome === 'ALREADY_FRIENDS' ? 'FRIEND' : 'OUTGOING_PENDING', pendingRequestId: response.outcome === 'PENDING' ? response.request.id : null });
      setMessage('');
    } catch (cause) { showError(cause); }
    finally { setBusy(false); }
  };
  const relationship = result?.relationship;
  return <View style={u.screen}><Header title="Thêm bạn" subtitle="Tìm bạn đồng hành cho chuyến đi tiếp theo." onBack={onBack} /><ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
    <View style={{ padding: 16, gap: 12 }}><Text style={s.title}>Tìm bạn qua số điện thoại</Text><TextInput keyboardType="phone-pad" accessibilityLabel="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Nhập số điện thoại..." style={[s.input, { fontSize: 16 }]} /><Button label={busy && !scanningImage ? 'Đang tìm...' : 'Tìm kiếm'} disabled={busy} onPress={() => { void findPhone(); }} />{scanningImage && <View style={[s.row, { justifyContent: 'center' }]}><ActivityIndicator color={c.blue} /><Text style={s.text}>Đang tìm mã QR trong ảnh...</Text></View>}{!!error && modal === null && <Text style={s.error}>{error}</Text>}</View>
    {([{ label: 'Quét mã QR của bạn bè', icon: 'qrcode-scan', action: () => { setError(''); setModal('source'); } }, { label: 'Lời mời kết bạn', icon: 'account-group-outline', action: onRequests }] as const).map(row => <Pressable key={row.label} accessibilityRole="button" onPress={row.action} style={({ pressed }) => [u.listRow, pressed && { backgroundColor: c.pale }]}><View style={{ width: 44, height: 44, borderWidth: 1, borderColor: c.border, backgroundColor: c.white, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Icon name={row.icon} color={c.ink} size={20} /></View><Text style={[s.title, s.grow, { fontWeight: '400' }]}>{row.label}</Text><Icon name="chevron-right" color={c.muted} /></Pressable>)}
    <View style={{ alignItems: 'center', padding: 24, gap: 12 }}><Text style={[s.title, { fontSize: 22 }]}>{user.displayName}</Text><Text style={s.small}>{user.email}</Text><View style={{ padding: 20, borderWidth: 1, borderColor: c.border, borderRadius: 18, backgroundColor: c.white }}>{session.friendCode ? <QRCode value={session.friendCode.qrPayload} size={192} /> : <View style={{ width: 192, height: 192, alignItems: 'center', justifyContent: 'center' }}><Button label="Tải mã QR" onPress={() => { session.loadFriendCode().catch(showError); }} /></View>}</View><Text style={s.text}>Mã QR cá nhân</Text></View>
  </ScrollView>
    <Sheet visible={modal === 'source'} title="Quét mã QR của bạn bè" onClose={() => setModal(null)} compact><Text style={s.text}>Chọn cách đọc mã QR kết bạn.</Text><Button label="Chọn ảnh từ thư viện" disabled={busy} onPress={() => { void chooseImage(); }} /><Button outline label="Quét bằng camera" disabled={busy} onPress={() => { void openScanner(); }} />{!!error && <Text style={s.error}>{error}</Text>}</Sheet>
    <Sheet visible={modal === 'permission'} title="Quyền camera" onClose={() => setModal(null)} compact><Text style={s.text}>TripMate cần quyền camera để quét mã QR. Bạn cũng có thể chọn ảnh QR trong thư viện.</Text>{permission?.canAskAgain === false ? <><Button label="Mở cài đặt ứng dụng" onPress={() => { void Linking.openSettings().catch(showError); }} /><Button outline label="Kiểm tra lại quyền" onPress={() => { void openScanner(); }} /></> : <Button label="Cấp quyền camera" onPress={() => { void openScanner(); }} />}<Button outline label="Chọn ảnh từ thư viện" onPress={() => { void chooseImage(); }} />{!!error && <Text style={s.error}>{error}</Text>}</Sheet>
    <Sheet visible={modal === 'scanner'} title="Quét mã QR của bạn bè" onClose={() => setModal(null)}><Text style={s.text}>Đưa mã QR của bạn bè vào khung hình.</Text><View style={{ height: 300, overflow: 'hidden', borderRadius: 18 }}>{modal === 'scanner' && <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={event => { scan(event.data); }} />}</View>{busy && <ActivityIndicator color={c.blue} />}{!!error && <><Text style={s.error}>{error}</Text><Button outline label="Quét lại" onPress={() => { setError(''); scanLocked.current = false; }} /></>}</Sheet>
    <Sheet visible={modal === 'result'} title="Thông tin người dùng" onClose={() => setModal(null)} compact>{result && <><View style={[s.row, { alignItems: 'center', gap: 12 }]}><Avatar text={result.user.displayName.trim().charAt(0).toUpperCase() || '?'} /><Text style={[s.title, s.grow]}>{result.user.displayName}</Text></View>{relationship === 'NONE' ? <><TextInput accessibilityLabel="Lời nhắn kết bạn" value={message} onChangeText={setMessage} maxLength={500} multiline placeholder="Thêm lời nhắn kết bạn (không bắt buộc)" style={[s.input, { minHeight: 88, textAlignVertical: 'top' }]} /><Text style={s.small}>{message.length}/500</Text><Button label={busy ? 'Đang gửi...' : 'Gửi lời mời kết bạn'} disabled={busy} onPress={() => { void send(); }} /></> : <><Text style={s.text}>{relationship === 'SELF' ? 'Đây là tài khoản của bạn.' : relationship === 'FRIEND' ? 'Hai bạn đã là bạn bè.' : relationship === 'OUTGOING_PENDING' ? 'Đã gửi lời mời kết bạn, đang chờ phản hồi.' : 'Người này đã gửi lời mời kết bạn cho bạn.'}</Text>{relationship === 'INCOMING_PENDING' && <Button label="Xem lời mời" onPress={() => { setModal(null); onRequests(); }} />}</>}{!!error && <Text style={s.error}>{error}</Text>}</>}</Sheet>
  </View>;
}
