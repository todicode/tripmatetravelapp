import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { DeliveryMessage, DirectThread } from './directMessagingModel';
import { readersForMessage } from './directMessagingModel';
import { Sheet, useChatUi } from './chatUi';
import ChatAvatar from './ChatAvatar';
import { Button } from '../trips/tripUi';

export default function MessageDetailsSheet({
  message,
  thread,
  loadAvatar,
  onClose,
  onReload,
}: {
  message: DeliveryMessage | null;
  thread?: DirectThread;
  loadAvatar?: (id: string) => Promise<string>;
  onClose: () => void;
  onReload?: () => void;
}) {
  const { s } = useChatUi();
  const readers = message ? readersForMessage(thread, message) : [];
  return (
    <Sheet visible={!!message} title="Thông tin tin nhắn" onClose={onClose}>
      {message && (
        <>
          <Text style={s.title}>{message.senderName}</Text>
          <Text style={s.small}>Đã gửi {new Date(message.createdAt).toLocaleString('vi-VN')}</Text>
          {!!message.text && (
            <Text selectable style={s.text}>
              {message.text}
            </Text>
          )}
          {message.image && <Text style={s.small}>Tin nhắn có ảnh</Text>}
          <Text style={s.title}>Đã xem ({readers.length})</Text>
          {thread?.readersLoading && <ActivityIndicator />}
          {!!thread?.readersError && (
            <>
              <Text style={s.error}>{thread.readersError}</Text>
              <Button outline label="Tải lại người đã xem" onPress={() => onReload?.()} />
            </>
          )}
          {!readers.length && !thread?.readersLoading && !thread?.readersError && (
            <Text style={s.text}>Chưa có xác nhận đã xem từ người khác.</Text>
          )}
          {readers.map((reader) => (
            <View key={reader.user.id} style={[s.row, { minHeight: 56 }]}>
              <ChatAvatar
                text={reader.user.displayName.charAt(0).toUpperCase()}
                mediaId={reader.user.avatarMediaId}
                load={loadAvatar}
                size={36}
              />
              <Text style={s.text}>{reader.user.displayName}</Text>
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
}
