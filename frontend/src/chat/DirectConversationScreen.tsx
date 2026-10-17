import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DirectConversation } from './directMessageApi';
import type { DeliveryMessage, DirectThread } from './directMessagingModel';
import { compareSeq, readersForMessage } from './directMessagingModel';
import { useMessageComposer } from './useMessageComposer';
import { useMeasuredRead } from './useMeasuredRead';
import { useChatImage } from './useChatImage';
import ChatAvatar from './ChatAvatar';
import ChatMessageImage from './ChatMessageImage';
import MessageDetailsSheet from './MessageDetailsSheet';
import type { ChatImageDraft } from './chatImageApi';
import { Avatar, IconButton, Sheet, useChatUi } from './chatUi';

type Props = {
  conversation: DirectConversation;
  thread?: DirectThread;
  onBack: () => void;
  onSend: (text: string, image?: ChatImageDraft) => Promise<void>;
  loadImage?: (messageId: string, thumbnail: boolean) => Promise<string>;
  onReaders?: () => void;
  readPaused?: boolean;
  onRetry: (clientId: string) => void;
  onReload: () => void;
  onOlder: () => void;
  onRead: (seq: string) => void;
  loadAvatar?: (mediaId: string) => Promise<string>;
  online?: boolean;
  groupHeader?: React.ReactNode;
};
export default function DirectConversationScreen({
  conversation,
  thread,
  onBack,
  onSend,
  onRetry,
  onReload,
  onOlder,
  onRead,
  loadAvatar,
  online = false,
  groupHeader,
  loadImage,
  onReaders,
  readPaused = false,
}: Props) {
  const { c, s, u } = useChatUi();
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<DeliveryMessage | null>(null);
  const [preview, setPreview] = useState<DeliveryMessage | null>(null);
  const avatarId = conversation.user.avatarMediaId;
  const avatarUri = useChatImage(avatarId, loadAvatar).uri;
  const avatarText = conversation.user.displayName.trim().charAt(0).toUpperCase() || '?';
  const list = useRef<FlatList<DeliveryMessage>>(null);
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
  useEffect(
    () => () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );
  const visibleSeq = useRef('0');
  const read = useRef(onRead);
  read.current = onRead;
  const messages = useMemo(() => [...(thread?.messages ?? [])].reverse(), [thread?.messages]);
  const sending = thread?.messages.some((item) => item.status === 'sending') ?? false;
  const canSend = conversation.canSend && !!thread?.initialized;
  const latestIncoming = messages.find((item) => !item.isMe && item.status === 'sent' && item.seq);
  const readAllowed = useRef(true);
  readAllowed.current = !readPaused && !details && !preview;
  const measured = useMeasuredRead(
    latestIncoming?.seq,
    readAllowed.current,
    (seq) => {
      visibleSeq.current = seq;
      onRead(seq);
    },
    thread?.afterSeq,
  );
  const composer = useMessageComposer(canSend, sending, onSend, () => {
    atBottom.current = true;
    scrollAfterSend.current = true;
  });

  const viewability = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 500 }).current;
  const onViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<DeliveryMessage>[] }) => {
      let highest = '0';
      for (const token of viewableItems)
        if (
          token.isViewable &&
          !token.item.isMe &&
          token.item.seq &&
          compareSeq(token.item.seq, highest) > 0
        )
          highest = token.item.seq;
      visibleSeq.current = highest;
      if (highest !== '0' && readAllowed.current) read.current(highest);
    },
  ).current;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && readAllowed.current && visibleSeq.current !== '0')
        read.current(visibleSeq.current);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (readAllowed.current && visibleSeq.current !== '0') read.current(visibleSeq.current);
  }, [thread?.afterSeq]);
  return (
    <KeyboardAvoidingView
      style={[u.screen, { backgroundColor: c.pale }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      {groupHeader ?? (
        <View style={[s.header, { gap: 12 }]}>
          <IconButton name="arrow-left" label="Quay lại danh sách tin nhắn" onPress={onBack} />
          <Avatar text={avatarText} uri={avatarUri} size={40} online={online} />
          <View style={s.grow}>
            <Text numberOfLines={1} style={s.title}>
              {conversation.user.displayName}
            </Text>
            <Text style={s.small}>{online ? 'Đang hoạt động' : 'Trò chuyện cá nhân'}</Text>
          </View>
        </View>
      )}
      {!conversation.canSend && (
        <Text accessibilityRole="alert" style={[s.text, { padding: 16, backgroundColor: c.white }]}>
          {groupHeader
            ? 'Nhóm hiện không nhận tin mới. Bạn vẫn có thể xem lịch sử trò chuyện.'
            : 'Hiện không thể gửi tin với người này. Bạn vẫn có thể xem lịch sử trò chuyện.'}
        </Text>
      )}
      {!!thread?.error && (
        <View
          style={[s.row, { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.white }]}
        >
          <Text accessibilityRole="alert" style={[s.error, s.grow]}>
            {thread.error}
          </Text>
          <IconButton name="refresh" label="Thử tải lại tin nhắn" onPress={onReload} />
        </View>
      )}
      {!!thread?.readError && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thử cập nhật trạng thái đã đọc"
          onPress={() => onRead(visibleSeq.current)}
          style={{ padding: 12 }}
        >
          <Text style={s.error}>{thread.readError}</Text>
        </Pressable>
      )}
      <View ref={measured.viewport} collapsable={false} style={{ flex: 1 }}>
        <FlatList
          ref={list}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 80 }}
          onScroll={(event) => {
            atBottom.current = event.nativeEvent.contentOffset.y < 80;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={scrollToLatest}
          onLayout={scrollToLatest}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewability}
          ListEmptyComponent={
            <View style={u.empty}>
              {!thread || thread.loading ? (
                <>
                  <ActivityIndicator color={c.blue} />
                  <Text style={s.small}>Đang tải tin nhắn...</Text>
                </>
              ) : !thread.error ? (
                <>
                  <Text style={s.title}>Bắt đầu trò chuyện</Text>
                  <Text style={[s.text, { textAlign: 'center' }]}>
                    Gửi lời chào đến {conversation.user.displayName}.
                  </Text>
                </>
              ) : (
                <Text style={s.small}>Nhấn thử lại để tải lịch sử trò chuyện.</Text>
              )}
            </View>
          }
          ListFooterComponent={
            thread?.olderSeq ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                {!!thread.olderError && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {thread.olderError}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tải tin nhắn cũ hơn"
                  disabled={thread.olderLoading}
                  onPress={onOlder}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 }}
                >
                  {thread.olderLoading ? (
                    <ActivityIndicator color={c.blue} />
                  ) : (
                    <Text style={s.link}>
                      {thread.olderError ? 'Thử tải lại tin cũ' : 'Xem tin nhắn cũ hơn'}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            // Data is newest first: index + 1 is the previous message in reading order.
            const joinsAbove =
              messages[index + 1]?.isMe === item.isMe &&
              (!groupHeader || messages[index + 1]?.senderId === item.senderId);
            const joinsBelow =
              messages[index - 1]?.isMe === item.isMe &&
              (!groupHeader || messages[index - 1]?.senderId === item.senderId);
            const topRadius = joinsAbove ? 4 : 24;
            const bottomRadius = joinsBelow ? 4 : 24;
            const hasImage = !!(item.image || item.imageFile);
            return (
              <View
                ref={item.id === latestIncoming?.id ? measured.row : undefined}
                collapsable={false}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: index === messages.length - 1 ? 0 : joinsAbove ? 2 : 10,
                }}
              >
                {!item.isMe && (
                  <View
                    style={{ width: 28 }}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                  >
                    {!joinsBelow && (
                      <ChatAvatar
                        mediaId={
                          groupHeader
                            ? (thread?.readers?.find((reader) => reader.user.id === item.senderId)
                                ?.user.avatarMediaId ?? item.senderAvatarId)
                            : avatarId
                        }
                        load={loadAvatar}
                        text={
                          groupHeader ? item.senderName.trim().charAt(0).toUpperCase() : avatarText
                        }
                        size={28}
                        online={!groupHeader && online}
                      />
                    )}
                  </View>
                )}
                <View
                  style={{ flex: 1, alignItems: item.isMe ? 'flex-end' : 'flex-start', gap: 4 }}
                >
                  {!!groupHeader && !item.isMe && !joinsAbove && (
                    <Text style={s.small}>{item.senderName}</Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Thông tin tin nhắn ${item.seq ?? 'đang gửi'}`}
                    disabled={item.status !== 'sent'}
                    onPress={() => {
                      setDetails(item);
                      onReaders?.();
                    }}
                    style={{
                      maxWidth: '82%',
                      paddingHorizontal: hasImage ? 0 : 14,
                      paddingVertical: hasImage ? 0 : 9,
                      borderTopLeftRadius: item.isMe ? 24 : topRadius,
                      borderBottomLeftRadius: item.isMe ? 24 : bottomRadius,
                      borderTopRightRadius: item.isMe ? topRadius : 24,
                      borderBottomRightRadius: item.isMe ? bottomRadius : 24,
                      borderWidth: hasImage || item.isMe ? 0 : 1,
                      borderColor: c.border,
                      backgroundColor: hasImage ? 'transparent' : item.isMe ? c.blue : c.white,
                      opacity: item.status === 'sending' ? 0.65 : 1,
                    }}
                  >
                    {hasImage && (
                      <ChatMessageImage
                        message={item}
                        load={loadImage}
                        onPress={() => setPreview(item)}
                      />
                    )}
                    {!!item.text && (
                      <Text
                        selectable
                        style={{
                          color: item.isMe && !hasImage ? c.onBlue : c.ink,
                          fontSize: 16,
                          lineHeight: 23,
                          ...(hasImage && { maxWidth: 220, paddingHorizontal: 4, marginTop: 8 }),
                        }}
                      >
                        {item.text}
                      </Text>
                    )}
                  </Pressable>
                  {item.isMe && item.status === 'sent' && !joinsBelow && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xem người đã xem tin nhắn ${item.seq}`}
                      onPress={() => {
                        setDetails(item);
                        onReaders?.();
                      }}
                      style={{ minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }}
                    >
                      <Text style={s.small}>
                        {readersForMessage(thread, item).length
                          ? `Đã xem${groupHeader ? ` (${readersForMessage(thread, item).length})` : ''}`
                          : 'Đã gửi'}
                      </Text>
                    </Pressable>
                  )}
                  {item.status === 'sending' && <Text style={s.small}>Đang gửi...</Text>}
                  {item.status === 'failed' && (
                    <View style={{ maxWidth: '82%', gap: 4 }}>
                      <Text accessibilityRole="alert" style={s.error}>
                        {item.error ?? 'Chưa gửi được tin nhắn.'}
                      </Text>
                      {conversation.canSend && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Thử gửi lại tin nhắn"
                          onPress={() => onRetry(item.clientMessageId)}
                          style={{
                            minHeight: 44,
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                          }}
                        >
                          <Text style={s.link}>Thử gửi lại</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      </View>
      <MessageDetailsSheet
        message={details}
        thread={thread}
        loadAvatar={loadAvatar}
        onClose={() => setDetails(null)}
        onReload={onReaders}
      />
      <Sheet visible={!!preview} title="Ảnh tin nhắn" onClose={() => setPreview(null)}>
        {preview && <ChatMessageImage message={preview} load={loadImage} full />}
      </Sheet>
      {!!composer.error && (
        <Text
          accessibilityRole="alert"
          style={[s.error, { padding: 12, backgroundColor: c.white }]}
        >
          {composer.error}
        </Text>
      )}
      {composer.image && (
        <View style={[s.row, { padding: 12, backgroundColor: c.white }]}>
          <Image
            source={{ uri: composer.image.uri }}
            accessibilityLabel="Ảnh chờ gửi"
            resizeMode="contain"
            style={{ width: 80, height: 80, borderRadius: 8 }}
          />
          <Text style={[s.small, s.grow]}>Ảnh sẽ gửi cùng tin nhắn</Text>
          <IconButton name="close" label="Bỏ ảnh đã chọn" onPress={composer.removeImage} />
        </View>
      )}
      <View style={[s.footer, s.row, { padding: 12 }]}>
        <IconButton
          name="image-plus"
          label="Chọn ảnh gửi tin nhắn"
          disabled={!canSend || sending || composer.picking}
          onPress={() => {
            void composer.choose();
          }}
        />
        <TextInput
          value={composer.input}
          onChangeText={composer.setInput}
          editable={canSend}
          accessibilityLabel={groupHeader ? 'Nhập tin nhắn nhóm' : 'Nhập tin nhắn cá nhân'}
          placeholder={canSend ? 'Nhập tin nhắn...' : 'Chưa thể gửi tin nhắn'}
          placeholderTextColor={c.muted}
          style={[s.input, s.grow, { borderRadius: 24, maxHeight: 120, fontSize: 16 }]}
          multiline
        />
        <IconButton
          name={sending ? 'clock-outline' : 'send-outline'}
          label={sending ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'}
          blue
          disabled={
            !canSend || sending || composer.picking || (!composer.input.trim() && !composer.image)
          }
          onPress={() => {
            void composer.submit();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
