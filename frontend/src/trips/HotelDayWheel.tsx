import React, { useEffect, useRef } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { useTripUi } from './tripUi';
export default function HotelDayWheel({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (day: number) => void }) {
  const { c } = useTripUi();
  const list = useRef<ScrollView>(null);
  useEffect(() => { list.current?.scrollTo({ y: (value - 1) * 56, animated: false }); }, [value]);
  return <View style={{ gap: 12 }}><Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>{label}</Text><View style={{ height: 168 }}><View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 56, height: 56, borderRadius: 11, backgroundColor: c.primaryLight, borderWidth: 1, borderColor: `${c.blue}33` }} /><ScrollView ref={list} nestedScrollEnabled showsVerticalScrollIndicator={false} snapToInterval={56} decelerationRate="fast" contentContainerStyle={{ paddingVertical: 56 }} onMomentumScrollEnd={event => onChange(Math.max(1, Math.min(max, Math.round(event.nativeEvent.contentOffset.y / 56) + 1)))}>{Array.from({ length: max }, (_, index) => index + 1).map(item => <Pressable key={item} accessibilityLabel={`${label}, ngày ${item}`} accessibilityState={{ selected: value === item }} onPress={() => onChange(item)} style={{ height: 56, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: value === item ? 27 : 24, color: value === item ? c.ink : c.muted, fontWeight: value === item ? '600' : '400', opacity: value === item ? 1 : 0.6 }}>Ngày {item}</Text></Pressable>)}</ScrollView></View></View>;
}
