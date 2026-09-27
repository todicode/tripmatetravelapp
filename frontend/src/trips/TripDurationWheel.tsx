import React, { useEffect, useRef } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { useTripUi } from './tripUi';

const days = Array.from({ length: 30 }, (_, index) => index + 1);
export default function TripDurationWheel({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { c } = useTripUi();
  const list = useRef<ScrollView>(null);
  useEffect(() => { list.current?.scrollTo({ y: (value - 1) * 48, animated: false }); }, [value]);
  return <View style={{ width: '100%', maxWidth: 192, height: 240, alignSelf: 'center' }}>
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 96, height: 48, borderRadius: 8, backgroundColor: c.pale }} />
    <ScrollView ref={list} nestedScrollEnabled showsVerticalScrollIndicator={false} snapToInterval={48} decelerationRate="fast" contentContainerStyle={{ paddingVertical: 96 }} onMomentumScrollEnd={event => onChange(Math.max(1, Math.min(30, Math.round(event.nativeEvent.contentOffset.y / 48) + 1)))}>{days.map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${item} ngày`} accessibilityState={{ selected: item === value }} onPress={() => onChange(item)} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: item === value ? c.ink : c.muted, fontSize: 32, fontWeight: item === value ? '600' : '400' }}>{item}</Text></Pressable>)}</ScrollView>
  </View>;
}
