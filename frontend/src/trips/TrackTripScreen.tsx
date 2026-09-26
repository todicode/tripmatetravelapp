import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { addExpense, makeId, toggleStop, Trip, tripStops } from './tripModel';
import TripMap from './TripMap';
import { Button, c, Header, Icon, s } from './tripUi';

export default function TrackTripScreen({ trip, onBack, onUpdate }: { trip: Trip; onBack: () => void; onUpdate: (trip: Trip) => void }) {
  const [tab, setTab] = useState<'itinerary' | 'expenses' | 'checklist'>('itinerary');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('Bạn (Trưởng đoàn)');
  const [expenseError, setExpenseError] = useState('');
  const [checkText, setCheckText] = useState('');
  const stops = useMemo(() => tripStops(trip), [trip.dayPlans]);
  const completed = stops.filter((stop) => stop.status === 'completed').length;
  const percent = stops.length ? Math.round(completed / stops.length * 100) : 0;
  const total = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const share = async () => {
    try { await Share.share({ title: trip.title, message: `${trip.title}\n${trip.destination}\n${stops.map((stop, index) => `${index + 1}. ${stop.name}`).join('\n')}\nhttps://www.openstreetmap.org/?mlat=${trip.coords[0]}&mlon=${trip.coords[1]}#map=13/${trip.coords[0]}/${trip.coords[1]}` }); }
    catch { Alert.alert('Không thể chia sẻ', 'Vui lòng thử lại.'); }
  };
  const saveExpense = () => {
    try { onUpdate(addExpense(trip, expenseTitle, amount, payer)); setExpenseTitle(''); setAmount(''); setExpenseError(''); }
    catch (failure) { setExpenseError(failure instanceof Error ? failure.message : 'Không thể thêm khoản chi.'); }
  };
  const addChecklist = () => {
    const text = checkText.trim();
    if (!text) return;
    onUpdate({ ...trip, checklist: [...trip.checklist, { id: makeId(), text, checked: false }] }); setCheckText('');
  };

  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Header title={trip.title} subtitle={`${trip.destination}${trip.members.length ? ` • ${trip.members.length + 1} người tham gia` : ''}`} onBack={onBack} action={<Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ chuyến đi" onPress={() => { void share(); }} style={s.back}><Icon name="share-variant-outline" size={17} color={c.ink} /></Pressable>} />
    <TripMap coords={trip.coords} stops={stops} rounded={false} label={`${percent}% hoàn thành (${completed}/${stops.length} trạm)`} />
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.white, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 8 }}>{[
      { key: 'itinerary' as const, label: 'Lịch trình', icon: 'navigation-variant-outline' as const },
      { key: 'expenses' as const, label: 'Chi phí', icon: 'currency-usd' as const },
      { key: 'checklist' as const, label: 'Chuẩn bị', icon: 'checkbox-marked-outline' as const },
    ].map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={[s.button, { flex: 1, minHeight: 32, paddingHorizontal: 5, flexDirection: 'row', gap: 4, backgroundColor: tab === item.key ? c.blue : c.pale }]}><Icon name={item.icon} size={15} color={tab === item.key ? c.white : c.muted} /><Text style={[s.buttonText, { fontWeight: '500', color: tab === item.key ? c.white : c.muted }]}>{item.label}</Text></Pressable>)}</View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {tab === 'itinerary' && <>
        <View style={s.between}><Text style={s.small}>Bấm vào trạm để đổi trạng thái</Text><Text style={s.link}>{trip.status === 'cancelled' ? 'Đã hủy' : trip.status === 'completed' ? 'Đã đi' : 'OSRM Road Route'}</Text></View>
        {trip.dayPlans.map((day) => <View key={day.dayNumber} style={{ gap: 8 }}><Text style={s.label}>NGÀY {day.dayNumber}</Text>{day.stops.map((stop) => {
          const done = stop.status === 'completed'; const active = stop.status === 'active';
          const tint = done ? c.green : active ? c.blue : c.muted;
          return <Pressable key={stop.id} disabled={trip.status === 'cancelled'} onPress={() => onUpdate(toggleStop(trip, stop.id))} style={[s.card, s.row, { padding: 12, borderRadius: 12, backgroundColor: done ? c.pale : c.white }, active && s.selected]}>
            <View style={{ width: 24, height: 24, borderRadius: 20, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.white, fontSize: 10, fontWeight: '700' }}>{stops.findIndex((item) => item.id === stop.id) + 1}</Text></View>
            <View style={s.grow}><Text style={[s.title, { fontSize: 13, color: done ? c.muted : c.ink, textDecorationLine: done ? 'line-through' : 'none' }]} numberOfLines={1}>{stop.name}</Text><Text style={s.small}>{stop.time} • {stop.note || 'Trạm dừng'}</Text></View>
            <Text style={[s.badge, { color: active ? c.white : tint, backgroundColor: active ? c.blue : done ? '#e6f8eb' : c.pale, borderWidth: 0 }]}>{done ? 'Đã đến' : active ? 'Đang đi' : 'Chưa đến'}</Text>
          </Pressable>;
        })}{!day.stops.length && <Text style={s.small}>Chưa có điểm dừng cho ngày này.</Text>}</View>)}
        {trip.aiRequested && <Text style={s.small}>Mong muốn tối ưu đã được lưu. Dịch vụ AI chưa được kết nối.</Text>}
        <Button outline label={trip.status === 'cancelled' ? 'Khôi phục chuyến đi' : 'Hủy chuyến đi'} onPress={() => {
          if (trip.status === 'cancelled') onUpdate({ ...trip, status: stops.length && stops.every((stop) => stop.status === 'completed') ? 'completed' : 'upcoming' });
          else Alert.alert('Hủy chuyến đi?', 'Lịch trình, chi phí và checklist vẫn được giữ trong phiên này.', [{ text: 'Đóng', style: 'cancel' }, { text: 'Hủy chuyến đi', style: 'destructive', onPress: () => onUpdate({ ...trip, status: 'cancelled' }) }]);
        }} />
      </>}
      {tab === 'expenses' && <>
        <View style={s.card}><View style={s.between}><View><Text style={s.small}>Tổng chi phí dự kiến</Text><Text style={{ color: c.blue, fontSize: 18, fontWeight: '700' }}>{total.toLocaleString('vi-VN')} đ</Text></View><Text style={s.badge}>{trip.expenses.length} khoản chi</Text></View>{trip.members.length > 0 && <View style={[s.between, s.divider]}><Text style={s.small}>Bình quân mỗi người:</Text><Text style={s.title}>~{Math.round(total / (trip.members.length + 1)).toLocaleString('vi-VN')} đ / người</Text></View>}</View>
        {trip.members.length > 0 && <View style={s.card}><Text style={s.title}>Thành viên tham gia ({trip.members.length + 1})</Text><Text style={s.text}>Bạn (Tôi) • Trưởng đoàn</Text>{trip.members.map((member) => <View key={member.id} style={[s.between, s.input]}><Text style={s.text}>{member.name}</Text><Pressable accessibilityLabel={`Xóa ${member.name}`} onPress={() => { onUpdate({ ...trip, members: trip.members.filter((item) => item.id !== member.id) }); if (payer === member.name) setPayer('Bạn (Trưởng đoàn)'); }}><Icon name="close" color={c.muted} /></Pressable></View>)}</View>}
        <View style={s.card}><Text style={s.title}>Thêm khoản chi</Text><View style={s.row}><TextInput accessibilityLabel="Tên khoản chi" value={expenseTitle} onChangeText={setExpenseTitle} placeholder="Tên khoản chi (ăn uống, xăng xe...)" placeholderTextColor={c.muted} style={[s.input, s.grow]} /><TextInput accessibilityLabel="Số tiền đồng" value={amount} onChangeText={setAmount} placeholder="Số tiền (đ)" placeholderTextColor={c.muted} keyboardType="number-pad" style={[s.input, { width: 100 }]} /></View>
          {trip.members.length > 0 && <Pressable style={s.input} onPress={() => Alert.alert('Người chi', 'Chọn thành viên đã thanh toán', ['Bạn (Trưởng đoàn)', ...trip.members.map((member) => member.name)].map((name) => ({ text: name, onPress: () => setPayer(name) })))}><Text style={s.text}>Người chi: {payer}</Text></Pressable>}
          {expenseError ? <Text style={s.error}>{expenseError}</Text> : null}<Button label="+ Thêm" onPress={saveExpense} />
        </View>
        {!trip.expenses.length && <View style={s.card}><Text style={[s.small, { textAlign: 'center' }]}>Chưa có khoản chi nào được ghi nhận.</Text></View>}
        {trip.expenses.map((expense) => <View key={expense.id} style={[s.card, s.row, { padding: 12 }]}><View style={s.grow}><Text style={s.title}>{expense.title}</Text><Text style={s.small}>{expense.payer} • Chi phí chung</Text></View><Text style={s.link}>{expense.amount.toLocaleString('vi-VN')} đ</Text><Pressable accessibilityLabel={`Xóa khoản chi ${expense.title}`} hitSlop={8} onPress={() => onUpdate({ ...trip, expenses: trip.expenses.filter((item) => item.id !== expense.id) })}><Icon name="trash-can-outline" size={17} color={c.muted} /></Pressable></View>)}
      </>}
      {tab === 'checklist' && <>
        <View style={[s.card, s.between]}><View><Text style={s.label}>ĐỒ DÙNG CẦN CHUẨN BỊ</Text><Text style={[s.title, { fontSize: 15 }]}>{trip.checklist.filter((item) => item.checked).length} / {trip.checklist.length} món đồ</Text></View><Text style={s.badge}>{trip.checklist.length ? Math.round(trip.checklist.filter((item) => item.checked).length / trip.checklist.length * 100) : 0}% hoàn tất</Text></View>
        <View style={[s.card, s.row, { padding: 12 }]}><TextInput accessibilityLabel="Đồ dùng cần chuẩn bị" value={checkText} onChangeText={setCheckText} placeholder="Thêm đồ dùng (áo ấm, thuốc men, sạc...)" placeholderTextColor={c.muted} style={[s.input, s.grow]} onSubmitEditing={addChecklist} /><Button label="+ Thêm" disabled={!checkText.trim()} onPress={addChecklist} /></View>
        {!trip.checklist.length && <View style={s.card}><Text style={[s.small, { textAlign: 'center' }]}>Chưa có đồ dùng chuẩn bị nào. Hãy nhập đồ dùng cần thiết ở ô trên!</Text></View>}
        {trip.checklist.map((item) => <View key={item.id} style={[s.card, s.row, { padding: 12 }, item.checked && { backgroundColor: '#f0fbf3', borderColor: '#b8e8c5' }]}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} onPress={() => onUpdate({ ...trip, checklist: trip.checklist.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry) })} style={[s.row, s.grow]}><Icon name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'} color={item.checked ? c.green : c.muted} size={22} /><Text style={[s.text, s.grow, { color: item.checked ? c.muted : c.ink, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.text}</Text></Pressable><Pressable accessibilityLabel={`Xóa ${item.text}`} hitSlop={8} onPress={() => onUpdate({ ...trip, checklist: trip.checklist.filter((entry) => entry.id !== item.id) })}><Icon name="trash-can-outline" color={c.muted} size={17} /></Pressable></View>)}
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
