import React, { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Conversation } from './chatModel';
import { normalizeName } from '../trips/tripModel';
import { Avatar, c, Icon, IconButton, s, Tabs, u } from './chatUi';
export default function ChatListScreen({ conversations, onOpen, onAddFriend, onCreateGroup }: { conversations: Conversation[]; onOpen: (id: string) => void; onAddFriend: () => void; onCreateGroup: () => void }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const filtered = conversations.filter(item => (tab === 'all' || item.type === (tab === 'groups' ? 'group' : 'friend')) && normalizeName(item.name).includes(normalizeName(search)));
  return <View style={u.screen}>
    <View style={s.header}><View style={s.grow}><Text style={[s.title, { fontSize: 17 }]}>Tin nhắn</Text><Text style={s.small}>Trò chuyện & Đồng hành</Text></View><IconButton name="plus" label="Thêm bạn hoặc tạo nhóm" blue onPress={() => setMenu(true)} /></View>
    
    <View style={{ padding: 12, gap: 8 }}><View style={u.search}><Icon name="magnify" color={c.muted} /><TextInput accessibilityLabel="Tìm tin nhắn, bạn bè" value={search} onChangeText={setSearch} placeholder="Tìm tin nhắn, bạn bè..." placeholderTextColor={c.muted} style={u.searchInput} /></View><Tabs value={tab} onChange={setTab} tabs={[{ key: 'all', label: 'Tất cả' }, { key: 'groups', label: 'Nhóm chuyến đi' }, { key: 'friends', label: 'Bạn bè' }]} /></View>
    <FlatList data={filtered} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" ListEmptyComponent={<View style={u.empty}><Text style={s.title}>{conversations.length ? 'Không có cuộc trò chuyện phù hợp' : 'Chưa có cuộc trò chuyện'}</Text></View>} renderItem={({ item }) => {
      const last = item.messages.at(-1);
      return <Pressable accessibilityRole="button" onPress={() => onOpen(item.id)} style={({ pressed }) => [u.listRow, pressed && { backgroundColor: c.pale }]}><Avatar text={item.avatar} group={item.type === 'group'} /><View style={s.grow}><View style={s.row}><Text numberOfLines={1} style={[s.title, s.grow, { fontSize: 13 }]}>{item.name}</Text>{item.tripLabel && <Text style={s.badge}>{item.tripLabel}</Text>}</View><Text numberOfLines={1} style={s.small}>{last ? `${item.type === 'group' ? `${last.senderName}: ` : ''}${last.text}` : 'Bắt đầu cuộc trò chuyện'}</Text></View><View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={[s.small, { fontSize: 10 }]}>{last?.time}</Text>{item.unread > 0 && <Text style={{ color: c.white, backgroundColor: c.blue, borderRadius: 12, paddingHorizontal: 6, fontSize: 10 }}>{item.unread}</Text>}</View></Pressable>;
    }} />
    <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}><Pressable style={{ flex: 1, backgroundColor: '#0003' }} onPress={() => setMenu(false)} accessibilityLabel="Đóng menu" /><View style={{ position: 'absolute', right: 16, top: 80, width: 190, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.white }}><Pressable style={u.listRow} accessibilityRole="button" onPress={() => { setMenu(false); onAddFriend(); }}><Icon name="account-plus-outline" color={c.ink} /><Text style={s.title}>Thêm bạn</Text></Pressable><Pressable style={u.listRow} accessibilityRole="button" onPress={() => { setMenu(false); onCreateGroup(); }}><Icon name="account-group-outline" color={c.ink} /><Text style={s.title}>Tạo nhóm</Text></Pressable></View></Modal>
  </View>;
}
