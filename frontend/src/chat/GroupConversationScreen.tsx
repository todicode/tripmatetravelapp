import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { Friend } from './chatModel';
import type { GroupConversation } from './groupMessageApi';
import type { useGroupMessaging } from './useGroupMessaging';
import { useGroupDetails } from './useGroupDetails';
import DirectConversationScreen from './DirectConversationScreen';
import { Avatar, IconButton, Sheet, useChatUi } from './chatUi';
import { Button } from '../trips/tripUi';

export default function GroupConversationScreen({ group, session, friends, onBack }: {
  group: GroupConversation; session: ReturnType<typeof useGroupMessaging>; friends: Friend[]; onBack: () => void;
}) {
  const { c, s } = useChatUi();
  const [settings, setSettings] = useState(false); const [name, setName] = useState(group.name);
  const [tripOpen, setTripOpen] = useState(false);
  const owner = group.ownerId === session.userId;
  const { store } = session;
  const details = useGroupDetails(group, session, settings, tripOpen, () => { setSettings(false); onBack(); });
  const { members, loading, error, busy, trip, tripError, tripLoading } = details;
  useEffect(() => { setName(group.name); }, [group.name]);
  const confirm = (title: string, message: string, action: () => Promise<unknown>) =>
    Alert.alert(title, message, [{ text: 'Hủy', style: 'cancel' }, { text: 'Đồng ý', style: 'destructive', onPress: () => { void action(); } }]);
  const view = session.conversations.find(item => item.id === group.id);
  if (!view) return null;
  const thread = session.threads[group.id];
  return <>
    <DirectConversationScreen conversation={view} thread={thread} onBack={onBack}
      onSend={text => store.send(group.id, text)} onRetry={id => { void store.retry(group.id, id); }}
      onReload={() => { void store.load(group.id).then(() => store.sync(group.id)); }} onOlder={() => { void store.older(group.id); }}
      onRead={seq => session.readVisible(group.id, seq)} groupHeader={<>
        <View style={[s.header, { gap: 10 }]}><IconButton name="arrow-left" label="Quay lại" onPress={onBack} />
          <Avatar text={group.name.trim().charAt(0).toUpperCase()} group size={40} />
          <Pressable accessibilityRole="button" accessibilityLabel="Thông tin nhóm" onPress={() => setSettings(true)} style={[s.grow, { minHeight: 48, justifyContent: 'center' }]}>
            <Text numberOfLines={1} style={s.title}>{group.name}</Text><Text style={s.small}>{group.memberCount} thành viên{group.archived ? ' · Đã lưu trữ' : ''}</Text>
          </Pressable><IconButton name="cog-outline" label="Quản lý nhóm" onPress={() => setSettings(true)} />
        </View>
        {!!group.tripId && <Pressable accessibilityRole="button" onPress={() => setTripOpen(true)} style={[s.row, { minHeight: 48, paddingHorizontal: 16, backgroundColor: c.white }]}>
          <Text style={s.link}>Xem chuyến đi được liên kết</Text>
        </Pressable>}
      </>} />
    <Sheet visible={settings} title="Thông tin nhóm" onClose={() => setSettings(false)}>
      <Text style={s.text}>{group.memberCount}/100 thành viên · {owner ? 'Bạn là trưởng nhóm' : 'Thành viên'}</Text>
      {group.archived && <Text style={s.text}>Nhóm đã lưu trữ. Bạn vẫn xem được lịch sử tin nhắn.</Text>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {busy && <ActivityIndicator color={c.blue} />}
      {owner && !group.archived && <><Text style={s.label}>TÊN NHÓM</Text><TextInput accessibilityLabel="Đổi tên nhóm" value={name} onChangeText={setName} editable={!busy} style={s.input} />
        <Button label="Lưu tên nhóm" disabled={busy || !name.trim() || [...name.trim()].length > 100 || name.trim() === group.name}
          onPress={() => { void details.rename(name); }} />
        {!!group.tripId && <Button label="Gỡ liên kết chuyến đi" disabled={busy} onPress={() => confirm('Gỡ liên kết', 'Thành viên sẽ không còn xem được chuyến đi qua nhóm này.', details.unlink)} />}
      </>}
      <Text style={s.label}>THÀNH VIÊN</Text>{loading && <ActivityIndicator color={c.blue} />}
      {members.map(member => <View key={member.user.id} style={{ gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border }}>
        <View style={s.row}><Avatar text={member.user.displayName.trim().charAt(0).toUpperCase()} /><View style={s.grow}><Text style={s.title}>{member.user.displayName}</Text>
          <Text style={s.small}>{member.role === 'OWNER' ? 'Trưởng nhóm' : 'Thành viên'}{member.user.id === session.userId ? ' · Bạn' : ''}</Text></View>
          {owner && member.user.id !== session.userId && <IconButton name="account-remove-outline" label={`Xóa ${member.user.displayName} khỏi nhóm`} disabled={busy}
            onPress={() => confirm('Xóa thành viên', `Xóa ${member.user.displayName} khỏi nhóm?`, () => details.remove(member.user.id))} />}
        </View>
        {owner && !group.archived && member.user.id !== session.userId && <Button label="Chuyển trưởng nhóm" disabled={busy}
          onPress={() => confirm('Chuyển trưởng nhóm', `Chuyển quyền cho ${member.user.displayName}? Liên kết chuyến đi hiện tại sẽ được gỡ.`, () => details.transfer(member.user.id))} />}
      </View>)}
      {owner && !group.archived && <><Text style={s.label}>THÊM BẠN BÈ</Text>
        {friends.filter(friend => !members.some(member => member.user.id === friend.id)).map(friend => <View key={friend.id} style={[s.row, { minHeight: 56 }]}>
          <Text style={[s.text, s.grow]}>{friend.name}</Text><Button label="Thêm" disabled={busy || loading || !members.length || group.memberCount >= 100}
            onPress={() => { void details.add(friend.id); }} />
        </View>)}
        {!friends.length && <Text style={s.small}>Chưa có bạn bè để thêm.</Text>}
        <Button label="Lưu trữ nhóm" disabled={busy} onPress={() => confirm('Lưu trữ nhóm', 'Nhóm sẽ dừng nhận tin mới và giữ lại lịch sử. Không thể mở lại nhóm đã lưu trữ.', details.archive)} />
      </>}
      {!owner && <Button label="Rời nhóm" disabled={busy} onPress={() => confirm('Rời nhóm', 'Bạn sẽ không còn truy cập tin nhắn và chuyến đi của nhóm.', details.leave)} />}
      {owner && <Text style={s.small}>Để rời nhóm, hãy chuyển quyền trưởng nhóm cho một thành viên khác trước.</Text>}
    </Sheet>
    <Sheet visible={tripOpen} title="Chuyến đi của nhóm" onClose={() => setTripOpen(false)}>
      <Text style={s.small}>Chỉ xem lịch trình. Quyền sửa chuyến đi thuộc về chủ chuyến.</Text>
      {tripLoading && <ActivityIndicator color={c.blue} />}{!!tripError && <Text accessibilityRole="alert" style={s.error}>{tripError}</Text>}
      {!group.tripId && <Text style={s.text}>Chuyến đi đã được gỡ khỏi nhóm.</Text>}
      {trip && <><Text style={s.title}>{trip.title}</Text><Text style={s.text}>{trip.cityName} · {trip.startDate} – {trip.endDate}</Text>
        {!!trip.description && <Text style={s.text}>{trip.description}</Text>}
        {trip.itinerary?.days.map(day => <View key={day.dayNumber} style={s.card}><Text style={s.title}>Ngày {day.dayNumber} · {day.date}</Text>
          {day.items.map(item => <View key={item.id}><Text style={s.text}>{item.startTime ? `${item.startTime} · ` : ''}{item.title}</Text>{!!item.note && <Text style={s.small}>{item.note}</Text>}</View>)}
        </View>)}{!trip.itinerary && <Text style={s.text}>Chưa có lịch trình.</Text>}
      </>}
    </Sheet>
  </>;
}
