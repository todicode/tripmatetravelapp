import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { dateKey, displayDate } from './tripModel';
import { useTripUi, Icon } from './tripUi';

export default function TripCalendar({ start, end, onChange }: { start: string; end: string; onChange: (start: string, end: string) => void }) {
  const { c, s } = useTripUi();
  const today = dateKey(new Date());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const previousDisabled = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const blanks = (month.getDay() + 6) % 7;
  const cells = Array.from({ length: blanks + new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => index < blanks ? null : index - blanks + 1);
  return <View style={{ gap: 8 }}>
    <View style={s.between}>
      <Pressable accessibilityLabel="Tháng trước" disabled={previousDisabled} onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: previousDisabled ? 0.25 : 1 }}><Icon name="chevron-left" size={20} color={c.ink} /></Pressable>
      <Text style={[s.title, { fontSize: 17 }]}>Tháng {monthIndex + 1}, {year}</Text>
      <Pressable accessibilityLabel="Tháng sau" onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-right" size={20} color={c.ink} /></Pressable>
    </View>
    <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <Text key={day} style={{ color: c.muted, fontSize: 12, width: '14.2857%', textAlign: 'center' }}>{day}</Text>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cells.map((day, index) => {
      const key = day ? dateKey(new Date(year, monthIndex, day)) : '';
      const selected = !!day && (key === start || key === end);
      const between = key > start && !!end && key < end;
      const past = key < today;
      return <View key={index} style={{ width: '14.2857%', padding: 2 }}><Pressable
        disabled={!day || past} accessibilityRole="button" accessibilityLabel={day ? displayDate(key) : undefined} accessibilityState={{ selected, disabled: !day || past }}
        onPress={() => {
          if (!start || end || key < start) onChange(key, '');
          else onChange(start, key);
        }}
        style={{ height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.blue : between ? c.primaryLight : c.white, opacity: past ? 0.25 : 1 }}>
        <Text style={{ color: selected ? c.onBlue : c.ink, fontSize: 14 }}>{day ?? ''}</Text>
      </Pressable></View>;
    })}</View>
    <Text accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 14, lineHeight: 20 }}>{!start ? 'Chọn ngày đi, sau đó chọn ngày về.' : !end ? `Ngày đi: ${displayDate(start)}. Chọn ngày về; chọn lại cùng ngày cho chuyến đi một ngày.` : `${displayDate(start)} — ${displayDate(end)}`}</Text>
  </View>;
}
