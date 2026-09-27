import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { HotelStay, Place, TripDestination } from './tripModel';
import { Button, Icon, useTripUi } from './tripUi';
import { useHotelSetupViewModel } from './useHotelSetupViewModel';
import HotelDayWheel from './HotelDayWheel';
import PlacePicker from './PlacePicker';

export default function HotelSetupScreen({ destination, days, stays, onChange, onBack, onDone }: { destination: TripDestination; days: number; stays: HotelStay[]; onChange: (stays: HotelStay[]) => void; onBack: () => void; onDone: () => void }) {
  const { c, s } = useTripUi();
  const vm = useHotelSetupViewModel({ destination, days, stays, onChange, onBack, onDone });
  const hotelRow = (place: Place) => <View style={[s.row, { gap: 12 }]}><View style={{ width: 48, height: 56, borderRadius: 11, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Icon name="bed-outline" size={24} /></View><View style={s.grow}><Text numberOfLines={1} style={[s.title, { fontSize: 16 }]}>{place.name}</Text><Text numberOfLines={2} style={[s.small, { marginTop: 4 }]}>{place.note || destination.name}</Text></View></View>;
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: c.chrome }}><Pressable accessibilityLabel="Quay lại" onPress={vm.back} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-left" size={20} color={c.ink} /></Pressable><Text style={s.title}>Tạo chuyến đi</Text></View>
    <ScrollView contentContainerStyle={[s.body, { gap: 12 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[s.card, s.row]}><Icon name="check" /><Text style={[s.title, { fontSize: 14 }]}>{destination.name}</Text></View>
      <View style={[s.card, { gap: 16 }]}><Text style={[s.title, { fontSize: 20 }]}>{vm.phase === 'summary' ? 'Nơi nghỉ của bạn' : 'Thêm khách sạn'}</Text>
        {vm.phase === 'search' && <PlacePicker destination={destination} label="Tên khách sạn" variant="hotel" onPick={vm.choose} />}
        {(vm.phase === 'dates' || vm.phase === 'details') && vm.hotel && <>
          {hotelRow(vm.hotel)}
          {vm.phase === 'dates' ? <><Text style={{ color: c.muted, fontSize: 14 }}>Chọn ngày nhận và trả phòng trong chuyến đi.</Text><View style={[s.row, { gap: 12, paddingVertical: 12 }]}><View style={s.grow}><HotelDayWheel label="Nhận phòng" value={vm.start} max={days} onChange={vm.setStart} /></View><View style={s.grow}><HotelDayWheel label="Trả phòng" value={vm.end} max={days} onChange={vm.setEnd} /></View></View><Text accessibilityLiveRegion="polite" style={{ color: vm.valid ? c.blue : c.red, fontSize: 14, textAlign: 'center' }}>{vm.valid ? `${vm.end - vm.start} đêm · Ngày ${vm.start} – Ngày ${vm.end}` : 'Ngày trả phải sau ngày nhận và không trùng nơi nghỉ đã chọn.'}</Text>{days === 1 && <Text style={s.small}>Chuyến đi trong ngày, không có đêm lưu trú.</Text>}</> : <>
            <Text style={{ color: c.blue, fontSize: 14 }}>{vm.end - vm.start} đêm · Ngày {vm.start} – Ngày {vm.end}</Text>
            <Pressable accessibilityState={{ expanded: vm.timesOpen }} onPress={() => vm.setTimesOpen(!vm.timesOpen)} style={[s.row, { minHeight: 56 }]}><Icon name="plus" size={20} /><Text style={[s.text, s.grow]}>Giờ nhận / trả phòng</Text><Text style={s.small}>Không bắt buộc</Text><Icon name={vm.timesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.ink} /></Pressable>
            {vm.timesOpen && <View style={[s.row, { gap: 12 }]}>{[{ label: 'Giờ nhận', value: vm.checkIn, change: vm.setCheckIn }, { label: 'Giờ trả', value: vm.checkOut, change: vm.setCheckOut }].map(item => <View key={item.label} style={[s.grow, { gap: 8 }]}><Text style={s.small}>{item.label}</Text><TextInput accessibilityLabel={item.label} value={item.value} onChangeText={item.change} placeholder="HH:mm" placeholderTextColor={c.muted} maxLength={5} style={[s.input, { fontSize: 16, borderWidth: 0, borderRadius: 8 }]} /></View>)}</View>}
            <Pressable accessibilityState={{ expanded: vm.notesOpen }} onPress={() => vm.setNotesOpen(!vm.notesOpen)} style={[s.row, { minHeight: 56 }]}><Icon name="pencil-outline" size={20} /><Text style={[s.text, s.grow]}>Ghi chú</Text><Text style={s.small}>Không bắt buộc</Text><Icon name={vm.notesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.ink} /></Pressable>
            {vm.notesOpen && <TextInput accessibilityLabel="Ghi chú khách sạn" value={vm.notes} onChangeText={vm.setNotes} multiline maxLength={1000} textAlignVertical="top" style={[s.input, { fontSize: 16, minHeight: 96, borderWidth: 0 }]} />}
          </>}
        </>}
        {vm.phase === 'summary' && <>{stays.map(stay => <View key={stay.id} style={{ padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 11, gap: 8 }}>{hotelRow(stay.hotel)}<View style={s.row}><Text style={[s.grow, { color: c.blue, fontSize: 14 }]}>{stay.endDay - stay.startDay} đêm · Ngày {stay.startDay} – {stay.endDay}</Text><Pressable accessibilityLabel={`Xóa ${stay.hotel.name}`} onPress={() => onChange(stays.filter(item => item.id !== stay.id))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" color={c.muted} /></Pressable></View>{!!(stay.checkInTime || stay.checkOutTime) && <Text style={s.small}>Nhận: {stay.checkInTime || 'Chưa chọn'} · Trả: {stay.checkOutTime || 'Chưa chọn'}</Text>}{!!stay.notes && <Text style={{ color: c.muted, fontSize: 14 }}>{stay.notes}</Text>}</View>)}{vm.gap ? <Pressable onPress={() => vm.setPhase('search')} style={[s.row, { justifyContent: 'center', minHeight: 56, borderWidth: 1, borderColor: c.blue, borderStyle: 'dashed', borderRadius: 11 }]}><Icon name="plus" /><Text style={{ color: c.blue, fontSize: 14 }}>Thêm khách sạn cho ngày còn lại</Text></Pressable> : <View style={s.row}><Icon name="check" color={c.green} /><Text style={{ color: c.green, fontSize: 14 }}>Đã sắp xếp đủ nơi nghỉ cho chuyến đi</Text></View>}</>}
        {!!vm.error && <Text style={s.error}>{vm.error}</Text>}
      </View>
    </ScrollView>
    {vm.phase !== 'search' && <View style={{ padding: 16, backgroundColor: c.chrome }}><Button label="Tiếp tục" disabled={vm.phase === 'dates' && !vm.valid} onPress={() => vm.phase === 'dates' ? vm.setPhase('details') : vm.phase === 'details' ? vm.save() : onDone()} /></View>}
  </KeyboardAvoidingView>;
}
