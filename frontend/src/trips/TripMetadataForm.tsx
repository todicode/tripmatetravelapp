import React from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useTripMetadataViewModel } from './useTripMetadataViewModel';
import { Trip } from './tripModel';
import { Button, useTripUi } from './tripUi';

export default function TripMetadataForm({ trip, busy, error, onSave, onBack }: { trip: Trip; busy: boolean; error: string; onSave: (body: Record<string, unknown>) => void; onBack: () => void }) {
  const { s } = useTripUi();
  const vm = useTripMetadataViewModel(trip, busy, onSave, onBack, Alert.alert);
  const { title, setTitle, mode, setMode, count, setCount, start, setStart, end, setEnd } = vm;
  return <ScrollView contentContainerStyle={[s.body, { gap: 12 }]} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>Thông tin chuyến đi</Text><Text style={s.text}>Tên chuyến đi</Text>
    <TextInput accessibilityLabel="Tên chuyến đi" style={s.input} value={title} onChangeText={setTitle} maxLength={160} editable={!busy} />
    <View style={s.row}><Button outline label="Ngày cụ thể" disabled={busy} onPress={() => setMode('specific')} /><Button outline label="Linh hoạt" disabled={busy} onPress={() => setMode('flexible')} /></View>
    <Text style={s.text}>Đang chọn: {mode === 'flexible' ? 'Linh hoạt' : 'Ngày cụ thể'}</Text>
    <Text style={s.text}>Số ngày (1–30)</Text><TextInput accessibilityLabel="Số ngày" style={s.input} value={count} onChangeText={setCount} keyboardType="number-pad" maxLength={2} editable={!busy} />
    {mode === 'specific' && <><Text style={s.text}>Ngày đi (YYYY-MM-DD)</Text><TextInput accessibilityLabel="Ngày đi" style={s.input} value={start} onChangeText={setStart} maxLength={10} editable={!busy} /><Text style={s.text}>Ngày về (YYYY-MM-DD)</Text><TextInput accessibilityLabel="Ngày về" style={s.input} value={end} onChangeText={setEnd} maxLength={10} editable={!busy} /></>}
    <Text style={s.small}>Cần xóa điểm dừng ở ngày cuối trước khi giảm số ngày. Đổi ngày không làm mất lịch.</Text>
    {!!(error || vm.error) && <Text accessibilityLiveRegion="polite" style={s.error}>{error || vm.error}</Text>}
    <Button label={busy ? 'Đang lưu…' : 'Lưu thông tin'} disabled={busy} onPress={vm.save} />
    <Button outline label="Quay lại" disabled={busy} onPress={vm.back} />
  </ScrollView>;
}
