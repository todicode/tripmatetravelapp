import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Place } from './trips/tripModel';
import { Button, Icon, useTripUi } from './trips/tripUi';

export default function NearbyPlaces({ places, position, distance, locating, onLocate, onSelect }: { places: Place[]; position: Place | null; distance: (place: Place) => number; locating: boolean; onLocate: () => void; onSelect: (place: Place) => void }) {
  const { c, s } = useTripUi();
  return <View style={{ gap: 12 }}><Text style={[s.title, { fontSize: 16 }]}>Địa điểm gần bạn</Text><Text style={s.small}>Địa điểm đã lưu trong bán kính 50 km.</Text>{!position && <Button outline label={locating ? 'Đang định vị…' : 'Lấy vị trí hiện tại'} disabled={locating} onPress={onLocate} />}{position && !places.length && <Text style={s.small}>Chưa có địa điểm đã lưu trong bán kính 50 km.</Text>}{places.map((place, index) => <Pressable accessibilityRole="button" key={`${place.id}-${index}`} onPress={() => onSelect(place)} style={[s.row, { padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 16 }]}>{place.image ? <Image source={{ uri: place.image }} style={{ width: 48, height: 48, borderRadius: 11 }} /> : <View style={{ width: 48, height: 48, borderRadius: 11, backgroundColor: c.pale, alignItems: 'center', justifyContent: 'center' }}><Icon name="map-marker-outline" /></View>}<View style={s.grow}><Text style={[s.text, { fontSize: 13.5, fontWeight: '600' }]}>{place.name}</Text><Text style={[s.small, { fontSize: 11 }]}>{place.city ? `${place.city} · ` : ''}{distance(place).toFixed(1)} km</Text></View><Icon name="chevron-right" size={16} color={c.muted} /></Pressable>)}</View>;
}
