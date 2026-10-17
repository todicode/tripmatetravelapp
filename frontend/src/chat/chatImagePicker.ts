import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { ChatImageDraft } from './chatImageApi';

export async function pickChatImage(): Promise<ChatImageDraft | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(asset.width, asset.height) > 1600)
      context.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
      return { uri: saved.uri, name: 'chat-image.jpg', type: 'image/jpeg' };
    } finally {
      image.release();
    }
  } finally {
    context.release();
    await releaseChatImage({ uri: asset.uri, name: '', type: '' });
  }
}

export async function releaseChatImage(file: ChatImageDraft | null) {
  if (file && FileSystem.cacheDirectory && file.uri.startsWith(FileSystem.cacheDirectory)) {
    try {
      await FileSystem.deleteAsync(file.uri, { idempotent: true });
    } catch {
      /* Android can evict cache files first. */
    }
  }
}
