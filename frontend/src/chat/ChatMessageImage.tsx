import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import type { DeliveryMessage } from './directMessagingModel';
import { useChatImage } from './useChatImage';
import { useChatUi } from './chatUi';

export default function ChatMessageImage({
  message,
  load,
  full = false,
  onPress,
}: {
  message: DeliveryMessage;
  load?: (id: string, thumbnail: boolean) => Promise<string>;
  full?: boolean;
  onPress?: () => void;
}) {
  const { c, s } = useChatUi();
  const image = useChatImage(
    message.image ? `${message.id}:${full}` : null,
    load ? () => load(message.id, !full) : undefined,
  );
  const uri = message.imageFile?.uri ?? image.uri;
  const ratio = message.image ? message.image.width / message.image.height : 4 / 3;
  return (
    <View style={{ width: full ? '100%' : 220, minHeight: 80, gap: 8 }}>
      {uri ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={full ? 'Ảnh đầy đủ' : 'Mở ảnh tin nhắn'}
          onPress={onPress}
          disabled={!onPress}
        >
          <Image
            source={{ uri }}
            accessibilityLabel="Ảnh tin nhắn"
            resizeMode="contain"
            style={{
              width: '100%',
              aspectRatio: Math.max(0.5, Math.min(2, ratio)),
              borderRadius: 12,
            }}
          />
        </Pressable>
      ) : image.error ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thử tải lại ảnh tin nhắn"
          onPress={image.retry}
          style={{ padding: 12 }}
        >
          <Text style={s.error}>{image.error} Nhấn để thử lại.</Text>
        </Pressable>
      ) : (
        <ActivityIndicator color={c.blue} style={{ minHeight: 100 }} />
      )}
    </View>
  );
}
