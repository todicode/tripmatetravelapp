import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { dateKey, displayDate } from './tripModel';
import { c, Icon, s } from './tripUi';

export default function TripCalendar({ start, end, onChange }: { start: string; end: string; onChange: (start: string, end: string) => void }) {
  const today = dateKey(new Date());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const previousDisabled = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const blanks = (month.getDay() + 6) % 7;
  const cells = Array.from({ length: blanks + new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => index < blanks ? null : index - blanks + 1);
  return <View style={{ gap: 8 }}>
    <View style={s.between}><Text style={s.title}>Chọn thời gian chuyến đi</Text><Icon name="calendar-month-outline" /></View>
    <Text style={s.small}>{start ? end ? `${displayDate(start)} — ${displayDate(end)}` : `Khởi hành: ${displayDate(start)} • Chạm ngày về` : 'Chạm ngày đi và ngày về trên lịch'}</Text>
    <View style={[s.between, s.divider]}>
      <Pressable accessibilityLabel="Tháng trước" disabled={previousDisabled} hitSlop={8} onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} style={{ opacity: previousDisabled ? 0.25 : 1 }}><Icon name="chevron-left" color={c.ink} /></Pressable>
      <Text style={s.title}>Tháng {monthIndex + 1}, {year}</Text>
      <Pressable accessibilityLabel="Tháng sau" hitSlop={8} onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}><Icon name="chevron-right" color={c.ink} /></Pressable>
    </View>
    <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <Text key={day} style={[s.label, { width: '14.2857%', textAlign: 'center' }]}>{day}</Text>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cells.map((day, index) => {
      const key = day ? dateKey(new Date(year, monthIndex, day)) : '';
      const selected = !!day && (key === start || key === end);
      const between = key > start && !!end && key < end;
      const past = key < today;
      return <View key={index} style={{ width: '14.2857%', padding: 2 }}><Pressable
        disabled={!day || past} accessibilityRole="button" accessibilityLabel={day ? displayDate(key) : undefined} accessibilityState={{ selected, disabled: !day || past }}
        onPress={() => {
          if (!start || end) onChange(key, '');
          else onChange(key < start ? key : start, key < start ? start : key);
        }}
        style={{ height: 34, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.blue : between ? '#e8f2fc' : c.white, borderWidth: key === today && !selected ? 1 : 0, borderColor: c.blue }}>
        <Text style={{ color: selected ? c.white : past ? '#c7c7cc' : between ? c.blue : c.ink, fontSize: 11, fontWeight: selected ? '700' : '400' }}>{day ?? ''}</Text>
      </Pressable></View>;
    })}</View>
  </View>;
}
