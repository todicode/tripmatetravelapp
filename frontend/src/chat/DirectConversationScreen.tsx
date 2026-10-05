import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, ViewToken } from 'react-native';
import type { DirectConversation } from './directMessageApi';
import type { DeliveryMessage, DirectThread } from './directMessagingModel';
import { compareSeq } from './directMessagingModel';
import { Avatar, IconButton, useChatUi } from './chatUi';

type Props = {
  conversation: DirectConversation; thread?: DirectThread; onBack: () => void;
  onSend: (text: string) => Promise<void>; onRetry: (clientId: string) => void;
  onReload: () => void; onOlder: () => void; onRead: (seq: string) => void;
  loadAvatar?: (mediaId: string) => Promise<string>;
  online?: boolean;
};
export default function DirectConversationScreen({ conversation, thread, onBack, onSend, onRetry, onReload, onOlder, onRead, loadAvatar, online = false }: Props) {
  const { c, s, u } = useChatUi();
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [avatar, setAvatar] = useState<{ mediaId: string; uri: string }>();
  const avatarId = conversation.user.avatarMediaId;
  const avatarUri = avatar?.mediaId === avatarId ? avatar?.uri : undefined;
  const avatarText = conversation.user.displayName.trim().charAt(0).toUpperCase() || '?';
  useEffect(() => {
    let active = true;
    setAvatar(undefined);
    if (avatarId && loadAvatar) void loadAvatar(avatarId).then(uri => {
      if (active) setAvatar({ mediaId: avatarId, uri });
    }).catch(() => { /* Keep the initials when the thumbnail is unavailable. */ });
    return () => { active = false; };
  }, [avatarId, loadAvatar]);
  const list = useRef<FlatList<DeliveryMessage>>(null);
  const submitInFlight = useRef(false);
  const atBottom = useRef(true);
  const scrollAfterSend = useRef(false);
  const scrollFrame = useRef<number | null>(null);
  const scrollToLatest = () => {
    if (!atBottom.current && !scrollAfterSend.current) return;
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      if (!atBottom.current && !scrollAfterSend.current) return;
      list.current?.scrollToOffset({ offset: 0, animated: false });
      scrollAfterSend.current = false;
      atBottom.current = true;
    });
  };
  useEffect(() => () => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
  }, []);
  const visibleSeq = useRef('0');
  const read = useRef(onRead);
  read.current = onRead;
  const messages = useMemo(() => [...(thread?.messages ?? [])].reverse(), [thread?.messages]);
  const sending = thread?.messages.some(item => item.status === 'sending') ?? false;
  const canSend = conversation.canSend && !!thread?.initialized;
  const viewability = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 500 }).current;
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken<DeliveryMessage>[] }) => {
    let highest = '0';
    for (const token of viewableItems) if (token.isViewable && token.item.seq && compareSeq(token.item.seq, highest) > 0) highest = token.item.seq;
    visibleSeq.current = highest;
    if (highest !== '0') read.current(highest);
  }).current;
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state === 'active' && visibleSeq.current !== '0') read.current(visibleSeq.current); });
    return () => sub.remove();
  }, []);
  useEffect(() => { if (visibleSeq.current !== '0') read.current(visibleSeq.current); }, [thread?.afterSeq]);
  const send = async () => {
    if (!canSend || sending || submitInFlight.current || !input.trim()) return;
    if ([...input].length > 4000) { setInputError('Tin nhắn tối đa 4.000 ký tự.'); return; }
    submitInFlight.current = true;
    const text = input;
    setInput(''); setInputError('');
    atBottom.current = true;
    scrollAfterSend.current = true;
    try { await onSend(text); }
    catch (error) { setInput(current => current || text); setInputError(error instanceof Error ? error.message : 'Chưa thể gửi tin. Vui lòng thử lại.'); }
    finally { submitInFlight.current = false; }
  };
  return <KeyboardAvoidingView style={[u.screen, { backgroundColor: c.pale }]} enabled={Platform.OS === 'ios'} behavior="padding">
    <View style={[s.header, { gap: 12 }]}>
      <IconButton name="arrow-left" label="Quay lại danh sách tin nhắn" onPress={onBack} />
      <Avatar text={avatarText} uri={avatarUri} size={40} online={online} />
      <View style={s.grow}><Text numberOfLines={1} style={s.title}>{conversation.user.displayName}</Text><Text style={s.small}>{online ? 'Đang hoạt động' : 'Trò chuyện cá nhân'}</Text></View>
    </View>
    {!conversation.canSend && <Text accessibilityRole="alert" style={[s.text, { padding: 16, backgroundColor: c.white }]}>Hiện không thể gửi tin với người này. Bạn vẫn có thể xem lịch sử trò chuyện.</Text>}
    {!!thread?.error && <View style={[s.row, { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.white }]}><Text accessibilityRole="alert" style={[s.error, s.grow]}>{thread.error}</Text><IconButton name="refresh" label="Thử tải lại tin nhắn" onPress={onReload} /></View>}
    {!!thread?.readError && <Pressable accessibilityRole="button" accessibilityLabel="Thử cập nhật trạng thái đã đọc" onPress={() => onRead(visibleSeq.current)} style={{ padding: 12 }}><Text style={s.error}>{thread.readError}</Text></Pressable>}
    <FlatList ref={list} data={messages} inverted keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 80 }}
      onScroll={event => { atBottom.current = event.nativeEvent.contentOffset.y < 80; }} scrollEventThrottle={100}
      onContentSizeChange={scrollToLatest} onLayout={scrollToLatest}
      onViewableItemsChanged={onViewable} viewabilityConfig={viewability}
      ListEmptyComponent={<View style={u.empty}>
        {!thread || thread.loading ? <><ActivityIndicator color={c.blue} /><Text style={s.small}>Đang tải tin nhắn...</Text></>
          : !thread.error ? <><Text style={s.title}>Bắt đầu trò chuyện</Text><Text style={[s.text, { textAlign: 'center' }]}>Gửi lời chào đến {conversation.user.displayName}.</Text></> : <Text style={s.small}>Nhấn thử lại để tải lịch sử trò chuyện.</Text>}
      </View>}
      ListFooterComponent={thread?.olderSeq ? <View style={{ alignItems: 'center', gap: 8 }}>
        {!!thread.olderError && <Text accessibilityRole="alert" style={s.error}>{thread.olderError}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Tải tin nhắn cũ hơn" disabled={thread.olderLoading} onPress={onOlder} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 }}>
          {thread.olderLoading ? <ActivityIndicator color={c.blue} /> : <Text style={s.link}>{thread.olderError ? 'Thử tải lại tin cũ' : 'Xem tin nhắn cũ hơn'}</Text>}
        </Pressable>
      </View> : null}
      renderItem={({ item, index }) => {
        // Data is newest first: index + 1 is the previous message in reading order.
        const joinsAbove = messages[index + 1]?.isMe === item.isMe;
        const joinsBelow = messages[index - 1]?.isMe === item.isMe;
        const topRadius = joinsAbove ? 4 : 24;
        const bottomRadius = joinsBelow ? 4 : 24;
        return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
          marginBottom: index === messages.length - 1 ? 0 : joinsAbove ? 2 : 10 }}>
        {!item.isMe && <View style={{ width: 28 }} accessible={false} importantForAccessibility="no-hide-descendants">
          {!joinsBelow && <Avatar text={avatarText} uri={avatarUri} size={28} online={online} />}
        </View>}
        <View style={{ flex: 1, alignItems: item.isMe ? 'flex-end' : 'flex-start', gap: 4 }}>
        <View style={{ maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9,
          borderTopLeftRadius: item.isMe ? 24 : topRadius, borderBottomLeftRadius: item.isMe ? 24 : bottomRadius,
          borderTopRightRadius: item.isMe ? topRadius : 24, borderBottomRightRadius: item.isMe ? bottomRadius : 24,
          borderWidth: item.isMe ? 0 : 1,
          borderColor: c.border, backgroundColor: item.isMe ? c.blue : c.white, opacity: item.status === 'sending' ? 0.65 : 1 }}>
          <Text selectable style={{ color: item.isMe ? c.onBlue : c.ink, fontSize: 16, lineHeight: 23 }}>{item.text}</Text>
        </View>
        {item.status === 'sending' && <Text style={s.small}>Đang gửi...</Text>}
        {item.status === 'failed' && <View style={{ maxWidth: '82%', gap: 4 }}><Text accessibilityRole="alert" style={s.error}>{item.error ?? 'Chưa gửi được tin nhắn.'}</Text>
          {conversation.canSend && <Pressable accessibilityRole="button" accessibilityLabel="Thử gửi lại tin nhắn" onPress={() => onRetry(item.clientMessageId)} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }}><Text style={s.link}>Thử gửi lại</Text></Pressable>}
        </View>}
        </View>
      </View>;
      }} />
    {!!inputError && <Text accessibilityRole="alert" style={[s.error, { padding: 12, backgroundColor: c.white }]}>{inputError}</Text>}
    <View style={[s.footer, s.row, { padding: 12 }]}>
      <TextInput value={input} onChangeText={text => { setInput(text); setInputError(''); }} editable={canSend}
        accessibilityLabel="Nhập tin nhắn cá nhân" placeholder={canSend ? 'Nhập tin nhắn...' : 'Chưa thể gửi tin nhắn'}
        placeholderTextColor={c.muted} style={[s.input, s.grow, { borderRadius: 24, maxHeight: 120, fontSize: 16 }]} multiline />
      <IconButton name={sending ? 'clock-outline' : 'send-outline'} label={sending ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'} blue disabled={!canSend || sending || !input.trim()} onPress={() => { void send(); }} />
    </View>
  </KeyboardAvoidingView>;
}
