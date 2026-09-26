import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Button, Header } from '../trips/tripUi';
import { FriendRequest } from './chatModel';
import { Avatar, IconButton, s, Tabs, u } from './chatUi';
export default function FriendRequestsScreen({ requests, onBack, onAccept, onRemove }: { requests: FriendRequest[]; onBack: () => void; onAccept: (id: string) => void; onRemove: (id: string) => void }) {
  const [tab, setTab] = useState('received');
  const count = (direction: string) => requests.filter(req => req.direction === direction).length;
  return <View style={s.screen}><Header title="Lời mời kết bạn" onBack={onBack} /><View style={{ padding: 12, backgroundColor: '#fff' }}><Tabs value={tab} onChange={setTab} tabs={[{ key: 'received', label: `Đã nhận (${count('received')})` }, { key: 'sent', label: `Đã gửi (${count('sent')})` }]} /></View><FlatList data={requests.filter(req => req.direction === tab)} keyExtractor={req => req.id} contentContainerStyle={s.body} ListEmptyComponent={<View style={[s.card, u.empty]}><Text style={s.title}>Không có lời mời nào</Text><Text style={s.small}>{tab === 'received' ? 'Bạn đã xử lý hết các lời mời kết bạn.' : 'Bạn chưa gửi lời mời kết bạn.'}</Text></View>} renderItem={({ item }) => <View style={s.card}><View style={s.row}><Avatar text={item.friend.avatar} group /><View style={s.grow}><Text style={s.title}>{item.friend.name}</Text><Text style={s.small}>{item.friend.phone}</Text></View></View><Text style={s.text}>{item.message}</Text><View style={s.row}>{tab === 'received' && <Button label="Đồng ý" onPress={() => onAccept(item.id)} />}<IconButton name="close" label={tab === 'received' ? 'Từ chối lời mời' : 'Thu hồi lời mời'} onPress={() => onRemove(item.id)} /></View></View>} /></View>;
}
