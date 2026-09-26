import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { displayDate, durationLabel, dayCount, Trip, TripStatus, tripStops } from './tripModel';
import { Button, c, Icon, s } from './tripUi';

export default function ManageTripsScreen({ trips, onCreate, onTrack }: { trips: Trip[]; onCreate: () => void; onTrack: (id: string) => void }) {
  const [segment, setSegment] = useState<TripStatus>('upcoming');
  const filtered = trips.filter((trip) => trip.status === segment);
  return <View style={s.screen}>
    <View style={[s.header, { justifyContent: 'space-between' }]}><View style={s.grow}><Text style={[s.title, { fontSize: 17 }]}>Chuyến đi của bạn</Text><Text style={s.small}>Quản lý lộ trình & đồng hành</Text></View><Pressable accessibilityRole="button" onPress={onCreate} style={[s.button, { minHeight: 32, flexDirection: 'row', gap: 4 }]}><Icon name="plus" size={16} color={c.white} /><Text style={s.buttonText}>Tạo mới</Text></Pressable></View>
    <View style={{ padding: 12, backgroundColor: c.white, borderBottomWidth: 1, borderColor: c.border }}><View style={{ backgroundColor: c.pale, padding: 4, borderRadius: 12, flexDirection: 'row' }}>{[
      { key: 'upcoming' as const, label: 'Sắp tới' }, { key: 'completed' as const, label: 'Đã đi' }, { key: 'cancelled' as const, label: 'Đã hủy' },
    ].map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: segment === item.key }} key={item.key} onPress={() => setSegment(item.key)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: segment === item.key ? c.white : 'transparent' }}><Text style={{ fontSize: 12, fontWeight: segment === item.key ? '600' : '500', color: segment === item.key ? c.ink : c.muted, textAlign: 'center' }}>{item.label}</Text></Pressable>)}</View></View>
    <ScrollView contentContainerStyle={[s.body, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
      {!filtered.length ? <View style={[s.card, { alignItems: 'center', padding: 24 }]}><View style={{ padding: 12, borderRadius: 30, backgroundColor: c.pale }}><Icon name="calendar-month-outline" color={c.muted} size={24} /></View><Text style={s.title}>Chưa có chuyến đi nào</Text><Text style={[s.small, { textAlign: 'center' }]}>Bắt đầu lên kế hoạch cho kỳ nghỉ tuyệt vời của bạn.</Text><Button label="+ Tạo chuyến đi đầu tiên" onPress={onCreate} /></View> : filtered.map((trip) => <Pressable key={trip.id} accessibilityRole="button" onPress={() => onTrack(trip.id)} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.white, overflow: 'hidden' }}>
        <ImageBackground source={{ uri: trip.image ?? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80' }} style={{ height: 112, backgroundColor: c.pale }}><Text style={[s.badge, { position: 'absolute', top: 10, right: 10, backgroundColor: '#fffffff2' }]}>{durationLabel(dayCount(trip.startDate, trip.endDate))}</Text><Text style={[s.badge, { position: 'absolute', bottom: 10, left: 10, backgroundColor: c.blue, color: c.white, borderColor: c.blue }]}>{trip.city}</Text></ImageBackground>
        <View style={{ padding: 14, gap: 8 }}><View style={s.between}><View style={s.grow}><Text style={s.title} numberOfLines={1}>{trip.title}</Text><View style={s.row}><Icon name="calendar-month-outline" size={13} color={c.muted} /><Text style={s.small}>{displayDate(trip.startDate)} - {displayDate(trip.endDate)}</Text></View></View><Icon name="chevron-right" color={c.muted} /></View><View style={[s.between, s.divider]}><View style={s.row}><Icon name="navigation-variant-outline" size={13} /><Text style={s.small}>{tripStops(trip).length} điểm dừng OSM</Text></View><View style={s.row}><Icon name="account-group-outline" size={13} color={c.muted} /><Text style={s.small}>{trip.members.length ? `${trip.members.length} bạn đồng hành` : 'Chuyến đi cá nhân'}</Text></View></View></View>
      </Pressable>)}
    </ScrollView>
  </View>;
}
