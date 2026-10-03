import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Conversation, Friend } from './chatModel';
import { normalizeName } from '../trips/tripModel';
import { Avatar, useChatUi, Icon, IconButton, Tabs } from './chatUi';

export default function ChatListScreen({ conversations, friends, socialLoading, socialError, chatLoading, chatError, openingId, openingError, onRefresh, onOpenFriend, onRemoveFriend, onOpen, onAddFriend, onCreateGroup }: {
  conversations: Conversation[]; friends: Friend[]; socialLoading: boolean; socialError: string;
  chatLoading: boolean; chatError: string; openingId: string | null; openingError: string;
  onOpenFriend: (friend: Friend) => Promise<void>;
  onRefresh: () => Promise<void>; onRemoveFriend: (id: string) => Promise<void>;
  onOpen: (id: string) => void; onAddFriend: () => void; onCreateGroup: () => void;
}) {
  const { c, s, u } = useChatUi();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const filtered = conversations.filter(item => (tab === 'all' || item.type === 'group') && normalizeName(item.name).includes(normalizeName(search)));
  const filteredFriends = friends.filter(item => normalizeName(item.name).includes(normalizeName(search)));
  const removeFriend = (friend: Friend) => Alert.alert('Hủy kết bạn', `Hủy kết bạn với ${friend.name}?`, [
    { text: 'Giữ lại', style: 'cancel' },
    { text: 'Hủy kết bạn', style: 'destructive', onPress: () => { void onRemoveFriend(friend.id).catch(error => Alert.alert('Không thể hủy kết bạn', error instanceof Error ? error.message : 'Vui lòng thử lại.')); } },
  ]);
  return <View style={u.screen}>
    <View style={[s.header, { borderBottomWidth: 0, minHeight: 68 }]}><View style={s.grow}><Text style={[s.title, { fontSize: 20 }]}>Tin nhắn</Text><Text style={s.text}>Cùng nhau lên kế hoạch và khám phá.</Text></View><IconButton name="plus" label="Thêm bạn hoặc tạo nhóm" blue onPress={() => setMenu(true)} /></View>
    <View style={{ padding: 16, gap: 12 }}><View style={u.search}><Icon name="magnify" color={c.muted} /><TextInput accessibilityLabel="Tìm tin nhắn, bạn bè" value={search} onChangeText={setSearch} placeholder="Tìm tin nhắn, bạn bè..." placeholderTextColor={c.muted} style={u.searchInput} /></View><Tabs value={tab} onChange={setTab} tabs={[{ key: 'all', label: 'Tất cả' }, { key: 'groups', label: 'Nhóm chuyến đi' }, { key: 'friends', label: 'Bạn bè' }]} /></View>
    {!!(tab === 'friends' ? socialError : tab === 'all' ? chatError : '') && <View style={[s.row, { paddingHorizontal: 16, paddingBottom: 8 }]}><Text accessibilityRole="alert" style={[s.error, s.grow]}>{tab === 'friends' ? socialError : chatError}</Text><IconButton name="refresh" label="Thử tải lại danh sách" onPress={() => { void onRefresh(); }} /></View>}
    {tab === 'friends' && !!openingError && <Text accessibilityRole="alert" style={[s.error, { paddingHorizontal: 16, paddingBottom: 12 }]}>{openingError}</Text>}
    {tab === 'friends' ? <FlatList data={filteredFriends} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" refreshing={socialLoading} onRefresh={() => { void onRefresh(); }} ListEmptyComponent={<View style={u.empty}>{socialLoading && <ActivityIndicator color={c.blue} />}<Text style={s.title}>{socialLoading ? 'Đang tải bạn bè...' : search && friends.length ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè'}</Text></View>} renderItem={({ item }) => <View style={u.listRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Nhắn tin với ${item.name}`} disabled={openingId !== null} onPress={() => { void onOpenFriend(item); }} style={({ pressed }) => [s.row, s.grow, { minHeight: 44, gap: 12 }, pressed && { opacity: 0.6 }]}><Avatar text={item.avatar} /><View style={s.grow}><Text numberOfLines={1} style={s.title}>{item.name}</Text><Text style={s.small}>{openingId === item.id ? 'Đang mở trò chuyện...' : 'Nhấn để trò chuyện'}</Text></View></Pressable>
      {openingId === item.id ? <ActivityIndicator color={c.blue} style={{ width: 44 }} /> : <IconButton name="message-outline" label={`Mở trò chuyện với ${item.name}`} disabled={openingId !== null} onPress={() => { void onOpenFriend(item); }} />}
      <IconButton name="account-remove-outline" label={`Hủy kết bạn với ${item.name}`} onPress={() => removeFriend(item)} />
    </View>} /> :
    <FlatList data={filtered} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" refreshing={tab === 'all' && chatLoading} onRefresh={tab === 'all' ? () => { void onRefresh(); } : undefined} ListEmptyComponent={<View style={u.empty}>{tab === 'all' && chatLoading ? <><ActivityIndicator color={c.blue} /><Text style={s.title}>Đang tải trò chuyện...</Text></> : <><Text style={s.title}>{conversations.length ? 'Không có cuộc trò chuyện phù hợp' : 'Chưa có cuộc trò chuyện'}</Text>{tab === 'all' && !search && !chatError && <Text style={[s.text, { textAlign: 'center' }]}>Chọn một người trong tab Bạn bè để bắt đầu nhắn tin.</Text>}</>}</View>} renderItem={({ item }) => {
      const last = item.lastMessage ?? item.messages.at(-1);
      return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}${item.unread > 0 ? `, ${item.unreadLabel ?? item.unread} tin chưa đọc` : ''}`} onPress={() => onOpen(item.id)} style={({ pressed }) => [u.listRow, pressed && { backgroundColor: c.pale }]}><Avatar text={item.avatar} group={item.type === 'group'} /><View style={s.grow}><View style={s.row}><Text numberOfLines={1} style={[s.title, s.grow, { fontSize: 14 }]}>{item.name}</Text>{item.tripLabel && <Text style={s.badge}>{item.tripLabel}</Text>}</View><Text numberOfLines={1} style={[s.text, item.unread > 0 && { fontWeight: '600' }]}>{last ? `${item.type === 'group' ? `${last.senderName}: ` : last.isMe ? 'Bạn: ' : ''}${last.text}` : 'Bắt đầu cuộc trò chuyện'}</Text></View><View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={[s.small, { fontSize: 12 }]}>{last?.time}</Text>{item.unread > 0 && <Text style={{ color: c.onBlue, backgroundColor: c.blue, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2, fontSize: 12 }}>{item.unreadLabel ?? item.unread}</Text>}</View></Pressable>;
    }} />}
    <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}><Pressable style={{ flex: 1, backgroundColor: 'transparent' }} onPress={() => setMenu(false)} accessibilityLabel="Đóng menu" /><View style={{ position: 'absolute', right: 16, top: 80, width: 190, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.white }}><Pressable style={[u.listRow, { minHeight: 44, paddingVertical: 10 }]} accessibilityRole="button" onPress={() => { setMenu(false); onAddFriend(); }}><Icon name="account-plus-outline" color={c.ink} /><Text style={s.text}>Thêm bạn</Text></Pressable><Pressable style={[u.listRow, { minHeight: 44, paddingVertical: 10 }]} accessibilityRole="button" onPress={() => { setMenu(false); onCreateGroup(); }}><Icon name="account-group-outline" color={c.ink} /><Text style={s.text}>Tạo nhóm</Text></Pressable></View></Modal>
  </View>;
}
