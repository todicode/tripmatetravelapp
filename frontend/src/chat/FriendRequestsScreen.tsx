import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Button, Header } from '../trips/tripUi';
import { FriendRequest } from './chatModel';
import { Avatar, Tabs, useChatUi } from './chatUi';

export default function FriendRequestsScreen({ requests, loading, error, onRefresh, onBack, onResolve }: {
  requests: FriendRequest[]; loading: boolean; error: string; onRefresh: () => Promise<void>; onBack: () => void;
  onResolve: (id: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>;
}) {
  const { c, s, u } = useChatUi();
  const [tab, setTab] = useState('received');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const count = (direction: string) => requests.filter(req => req.direction === direction).length;
  const resolve = async (id: string, action: 'accept' | 'reject' | 'cancel') => {
    setBusyId(id); setActionError('');
    try { await onResolve(id, action); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không xử lý được lời mời.'); }
    finally { setBusyId(null); }
  };
  return <View style={s.screen}><Header title="Lời mời kết bạn" subtitle="Kết nối với những người bạn mới." onBack={onBack} /><View style={{ padding: 16, backgroundColor: c.white }}><Tabs value={tab} onChange={setTab} tabs={[{ key: 'received', label: `Đã nhận (${count('received')})` }, { key: 'sent', label: `Đã gửi (${count('sent')})` }]} /></View>{!!(error || actionError) && <View style={{ paddingHorizontal: 16, gap: 8 }}><Text style={s.error}>{actionError || error}</Text><Button outline label="Thử lại" onPress={() => { void onRefresh(); }} /></View>}<FlatList data={requests.filter(req => req.direction === tab)} keyExtractor={req => req.id} refreshing={loading} onRefresh={() => { void onRefresh(); }} contentContainerStyle={s.body} ListEmptyComponent={loading ? <ActivityIndicator color={c.blue} /> : <View style={[s.card, u.empty]}><Text style={s.title}>Không có lời mời nào</Text><Text style={s.small}>{tab === 'received' ? 'Bạn đã xử lý hết các lời mời kết bạn.' : 'Bạn chưa gửi lời mời kết bạn.'}</Text></View>} renderItem={({ item }) => <View style={[s.card, { padding: 12, gap: 16 }]}><View style={s.row}><Avatar text={item.friend.avatar} /><View style={s.grow}><Text style={s.title}>{item.friend.name}</Text></View></View>{!!item.message && <Text style={s.text}>{item.message}</Text>}<View style={s.row}>{tab === 'received' && <View style={s.grow}><Button label="Đồng ý" disabled={!!busyId} onPress={() => { void resolve(item.id, 'accept'); }} /></View>}<View style={s.grow}><Button outline label={tab === 'received' ? 'Từ chối' : 'Thu hồi lời mời'} disabled={!!busyId} onPress={() => { void resolve(item.id, tab === 'received' ? 'reject' : 'cancel'); }} /></View></View></View>} /></View>;
}
