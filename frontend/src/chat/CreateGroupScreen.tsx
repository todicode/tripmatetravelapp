import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Trip } from '../trips/tripModel';
import { Button, Header } from '../trips/tripUi';
import { Friend, matchesFriend } from './chatModel';
import { Avatar, c, Icon, s, u } from './chatUi';
export default function CreateGroupScreen({ friends, trips, onBack, onCreate }: { friends: Friend[]; trips: Trip[]; onBack: () => void; onCreate: (name: string, members: string[], tripId?: string) => void }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [link, setLink] = useState(false);
  const [tripId, setTripId] = useState<string>();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const create = () => { if (!name.trim()) return setError('Vui lòng nhập tên nhóm.'); if (link && !tripId) return setError('Vui lòng chọn chuyến đi để liên kết.'); onCreate(name.trim(), selected, link ? tripId : undefined); };
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Header title="Tạo nhóm mới" onBack={onBack} action={<Pressable accessibilityRole="button" onPress={create} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>Tạo</Text></Pressable>} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
    <View style={s.card}><Text style={s.label}>TÊN NHÓM</Text><TextInput value={name} onChangeText={setName} accessibilityLabel="Tên nhóm" maxLength={100} placeholder="Ví dụ: Phượt Đà Lạt Tháng 9..." style={s.input} /><View style={s.between}><View style={s.grow}><Text style={s.title}>Liên kết chuyến đi</Text><Text style={s.small}>Ghim lộ trình để cùng theo dõi</Text></View><Switch accessibilityLabel="Liên kết chuyến đi" value={link} onValueChange={setLink} trackColor={{ true: c.blue }} /></View>{link && (trips.length ? trips.map(trip => <Pressable key={trip.id} accessibilityRole="radio" accessibilityState={{ checked: tripId === trip.id }} onPress={() => setTripId(trip.id)} style={[s.card, tripId === trip.id && s.selected]}><View style={s.row}><Icon name="map-marker-outline" /><View style={s.grow}><Text style={s.title}>{trip.title}</Text><Text style={s.small}>{trip.city} · {trip.dayPlans.length} ngày</Text></View>{tripId === trip.id && <Icon name="check-circle" />}</View></Pressable>) : <Text style={s.small}>Bạn chưa có chuyến đi. Hãy tạo chuyến đi ở mục Chuyến đi.</Text>)}</View>
    <View style={s.card}><Text style={s.title}>Thêm thành viên ({selected.length})</Text><View style={u.search}><Icon name="magnify" color={c.muted} /><TextInput value={query} onChangeText={setQuery} accessibilityLabel="Tìm thành viên" placeholder="Tìm theo tên hoặc số điện thoại..." style={u.searchInput} /></View>{friends.filter(friend => matchesFriend(friend, query)).map(friend => <Pressable key={friend.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(friend.id) }} onPress={() => setSelected(current => current.includes(friend.id) ? current.filter(id => id !== friend.id) : [...current, friend.id])} style={[s.row, { paddingVertical: 10 }]}><Avatar text={friend.avatar} /><View style={s.grow}><Text style={s.title}>{friend.name}</Text><Text style={s.small}>{friend.phone}</Text></View><Icon name={selected.includes(friend.id) ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} color={selected.includes(friend.id) ? c.blue : c.muted} /></Pressable>)}</View>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button label="Tạo nhóm trò chuyện" onPress={create} />
  </ScrollView></KeyboardAvoidingView>;
}
