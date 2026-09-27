import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { addExpense, makeId, toggleStop, Trip, tripStops } from './tripModel';
import TripMap from './TripMap';
import { Button, useTripUi, Header, Icon } from './tripUi';

export default function TripUtilities({ trip, onBack, onUpdate, initialTab = 'expenses', hideTabs = false }: { initialTab?: 'expenses' | 'checklist'; hideTabs?: boolean; trip: Trip; onBack: () => void; onUpdate: (trip: Trip) => void }) {
  const { c, s } = useTripUi();
  const [tab, setTab] = useState<'expenses' | 'checklist'>(initialTab);
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

  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    {!hideTabs && <View style={[s.row, { padding: 12 }]}><Button label="Chi phí" outline={tab !== 'expenses'} onPress={() => setTab('expenses')} /><Button label="Chuẩn bị" outline={tab !== 'checklist'} onPress={() => setTab('checklist')} /></View>}
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {tab === 'expenses' && <>
        <View style={[s.card, { borderWidth: 1, borderColor: c.border }]}><View style={s.between}><View><Text style={s.small}>Tổng chi phí dự kiến</Text><Text style={{ color: c.blue, fontSize: 22, fontWeight: '600' }}>{total.toLocaleString('vi-VN')} đ</Text></View><Text style={s.badge}>{trip.expenses.length} khoản chi</Text></View>{trip.members.length > 0 && <View style={[s.between, s.divider]}><Text style={s.small}>Bình quân mỗi người:</Text><Text style={s.title}>~{Math.round(total / (trip.members.length + 1)).toLocaleString('vi-VN')} đ / người</Text></View>}</View>
        <View style={[s.card, { borderWidth: 1, borderColor: c.border }]}><Text style={[s.small, { color: c.ink, fontWeight: '600' }]}>Thêm khoản chi</Text><View style={s.row}><TextInput accessibilityLabel="Tên khoản chi" value={expenseTitle} onChangeText={setExpenseTitle} placeholder="Tên khoản chi (ăn uống, xăng xe...)" placeholderTextColor={c.muted} style={[s.input, s.grow, { fontSize: 16 }]} /><TextInput accessibilityLabel="Số tiền đồng" value={amount} onChangeText={setAmount} placeholder="Số tiền (đ)" placeholderTextColor={c.muted} keyboardType="number-pad" style={[s.input, { width: 112, fontSize: 16 }]} /></View>
          {trip.members.length > 0 && <Pressable style={s.input} onPress={() => Alert.alert('Người chi', 'Chọn thành viên đã thanh toán', ['Bạn (Trưởng đoàn)', ...trip.members.map((member) => member.name)].map((name) => ({ text: name, onPress: () => setPayer(name) })))}><Text style={s.text}>Người chi: {payer}</Text></Pressable>}
          {expenseError ? <Text style={s.error}>{expenseError}</Text> : null}<Button label="+ Thêm" onPress={saveExpense} />
        </View>
        {!trip.expenses.length && <View style={[s.card, { borderWidth: 1, borderColor: c.border }]}><Text style={[s.text, { textAlign: 'center' }]}>Chưa có khoản chi nào được ghi nhận.</Text></View>}
        {trip.expenses.map((expense) => <View key={expense.id} style={[s.card, s.row, { padding: 12, borderWidth: 1, borderColor: c.border }]}><View style={s.grow}><Text style={[s.text, { fontWeight: '600' }]}>{expense.title}</Text><Text style={s.small}>{expense.payer} • Chi phí chung</Text></View><Text style={s.link}>{expense.amount.toLocaleString('vi-VN')} đ</Text><Pressable accessibilityLabel={`Xóa khoản chi ${expense.title}`} hitSlop={8} onPress={() => onUpdate({ ...trip, expenses: trip.expenses.filter((item) => item.id !== expense.id) })}><Icon name="trash-can-outline" size={17} color={c.muted} /></Pressable></View>)}
      </>}
      {tab === 'checklist' && <>
        <View style={[s.card, s.row, { padding: 12, borderWidth: 1, borderColor: c.border }]}><TextInput accessibilityLabel="Đồ dùng cần chuẩn bị" value={checkText} onChangeText={setCheckText} placeholder="Thêm đồ dùng (áo ấm, thuốc men, sạc...)" placeholderTextColor={c.muted} style={[s.input, s.grow, { fontSize: 16 }]} onSubmitEditing={addChecklist} /><Button label="+ Thêm" disabled={!checkText.trim()} onPress={addChecklist} /></View>
        {!trip.checklist.length && <View style={[s.card, { borderWidth: 1, borderColor: c.border }]}><Text style={[s.text, { textAlign: 'center' }]}>Chưa có đồ dùng chuẩn bị nào. Hãy nhập đồ dùng cần thiết ở ô trên!</Text></View>}
        {trip.checklist.map((item) => <View key={item.id} style={[s.card, s.row, { padding: 12 }, item.checked && { backgroundColor: c.pale, borderColor: c.green }]}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} onPress={() => onUpdate({ ...trip, checklist: trip.checklist.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry) })} style={[s.row, s.grow]}><Icon name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'} color={item.checked ? c.green : c.muted} size={22} /><Text style={[s.text, s.grow, { color: item.checked ? c.muted : c.ink, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.text}</Text></Pressable><Pressable accessibilityLabel={`Xóa ${item.text}`} hitSlop={8} onPress={() => onUpdate({ ...trip, checklist: trip.checklist.filter((entry) => entry.id !== item.id) })}><Icon name="trash-can-outline" color={c.muted} size={17} /></Pressable></View>)}
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
