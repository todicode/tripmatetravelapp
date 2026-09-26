import React, { useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Trip } from '../trips/tripModel';
import { Conversation, Friend, Message } from './chatModel';
import { Avatar, c, Icon, IconButton, s, Sheet, u } from './chatUi';
import { Button } from '../trips/tripUi';
export default function ConversationScreen({ conversation, friends, trip, onBack, onSend, onInvite, onTrip }: { conversation: Conversation; friends: Friend[]; trip?: Trip; onBack: () => void; onSend: (text: string) => void; onInvite: (id: string) => void; onTrip: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [invite, setInvite] = useState(false);
  const [location, setLocation] = useState(false);
  const [coordinates, setCoordinates] = useState('');
  const [error, setError] = useState('');
  const list = useRef<FlatList<Message>>(null);
  const group = conversation.type === 'group';
  const send = () => { if (!input.trim()) return; onSend(input); setInput(''); };
  const unavailable = () => Alert.alert('Chưa hỗ trợ cuộc gọi', 'Tính năng gọi thoại và video sẽ được bổ sung sau.');
  const sendLocation = () => {
    const parts = coordinates.split(',').map(value => value.trim());
    const [lat, lng] = parts.map(Number);
    if (parts.length !== 2 || parts.some(part => !part) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return setError('Nhập vĩ độ, kinh độ hợp lệ, ví dụ: 11.9404, 108.4583.');
    onSend(`Vị trí: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`); setLocation(false); setCoordinates('');
  };
  return <KeyboardAvoidingView style={[u.screen, { backgroundColor: c.pale }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[s.header, { paddingHorizontal: 12, gap: 8 }]}><IconButton name="arrow-left" label="Quay lại" onPress={onBack} /><View style={s.grow}><Text numberOfLines={1} style={s.title}>{conversation.name}</Text><Text style={s.small}>{group ? `${conversation.members.length + 1} thành viên · Đồng hành` : 'Tin nhắn'}</Text></View>{group ? <IconButton name="account-plus-outline" label="Mời bạn vào nhóm" onPress={() => setInvite(true)} /> : <><IconButton name="phone-outline" label="Gọi thoại" onPress={unavailable} /><IconButton name="video-outline" label="Gọi video" onPress={unavailable} /></>}</View>
    
    {group && trip && <Pressable accessibilityRole="button" style={[u.listRow, { backgroundColor: c.white }]} onPress={() => onTrip(trip.id)}><Icon name="map-marker-outline" /><View style={s.grow}><Text style={s.title}>Lộ trình ghim: {trip.title}</Text><Text style={s.small}>{trip.dayPlans.length} ngày · {trip.dayPlans.flatMap(day => day.stops).length} trạm dừng</Text></View><Text style={s.link}>Xem</Text><Icon name="chevron-right" size={16} /></Pressable>}
    <FlatList ref={list} data={conversation.messages} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }} onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" ListEmptyComponent={<View style={u.empty}><Text style={s.small}>Bắt đầu cuộc trò chuyện với {conversation.name}</Text></View>} renderItem={({ item }) => <View style={{ alignItems: item.isMe ? 'flex-end' : 'flex-start' }}><View style={{ maxWidth: '78%', gap: 3 }}>{group && !item.isMe && <Text style={s.small}>{item.senderName}</Text>}<View style={{ padding: 12, borderRadius: 16, borderTopRightRadius: item.isMe ? 4 : 16, borderTopLeftRadius: item.isMe ? 16 : 4, backgroundColor: item.isMe ? c.blue : c.white, borderWidth: item.isMe ? 0 : 1, borderColor: c.border }}><Text selectable style={{ color: item.isMe ? c.white : c.ink, fontSize: 13, lineHeight: 20 }}>{item.text}</Text>{item.text.includes('https://www.openstreetmap.org/') && <Pressable accessibilityRole="link" onPress={() => { const url = item.text.match(/https:\/\/www\.openstreetmap\.org\/\S+/)?.[0]; if (url) void Linking.openURL(url).catch(() => Alert.alert('Không mở được bản đồ')); }}><Text style={{ color: item.isMe ? c.white : c.blue, textDecorationLine: 'underline', paddingVertical: 8 }}>Mở bản đồ</Text></Pressable>}<Text style={{ textAlign: 'right', marginTop: 4, fontSize: 9, color: item.isMe ? '#ffffffcc' : c.muted }}>{item.time}</Text></View></View></View>} />
    <View style={[s.footer, s.row, { padding: 12 }]}>{!group && <IconButton name="map-marker-outline" label="Gửi tọa độ vị trí" onPress={() => { setError(''); setLocation(true); }} />}<TextInput value={input} onChangeText={setInput} accessibilityLabel="Nhập tin nhắn" placeholder={group ? 'Nhắn tin cho cả nhóm...' : 'Nhập tin nhắn...'} placeholderTextColor={c.muted} style={[s.input, s.grow, { borderRadius: 24, maxHeight: 100 }]} multiline maxLength={4000} /><IconButton name="send-outline" label="Gửi tin nhắn" blue disabled={!input.trim()} onPress={send} /></View>
    <Sheet visible={invite} title="Mời bạn bè vào nhóm" onClose={() => setInvite(false)}><Text style={s.small}>{conversation.name} · Thành viên nhóm</Text>{friends.map(friend => { const added = conversation.members.includes(friend.id); return <View key={friend.id} style={s.row}><Avatar text={friend.avatar} /><View style={s.grow}><Text style={s.title}>{friend.name}</Text><Text style={s.small}>{friend.phone}</Text></View><Button label={added ? 'Đã thêm' : 'Mời'} disabled={added} onPress={() => onInvite(friend.id)} /></View>; })}</Sheet>
    <Sheet visible={location} title="Chia sẻ vị trí trên OpenStreetMap" onClose={() => setLocation(false)}><Text style={s.small}>Nhập tọa độ muốn chia sẻ. Đây không phải vị trí GPS tự động.</Text><TextInput accessibilityLabel="Vĩ độ, kinh độ" value={coordinates} onChangeText={setCoordinates} placeholder="11.9404, 108.4583" style={s.input} />{!!error && <Text style={s.error}>{error}</Text>}<Button label="Gửi vị trí" onPress={sendLocation} /></Sheet>
  </KeyboardAvoidingView>;
}
