import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { AvatarDraft } from './profileModel';

export async function releaseAvatar(file: AvatarDraft | null) {
  if (file && FileSystem.cacheDirectory && file.uri.startsWith(FileSystem.cacheDirectory)) {
    try { await FileSystem.deleteAsync(file.uri, { idempotent: true }); }
    catch { console.warn('Unable to remove temporary avatar from app cache.'); }
  }
}

export async function pickAvatar(): Promise<AvatarDraft | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1,
  });
  if (result.canceled) return null;
  const selected = result.assets[0];
  const context = ImageManipulator.manipulate(selected.uri);
  try {
    const side = Math.min(selected.width, selected.height);
    context.crop({ originX: Math.floor((selected.width - side) / 2), originY: Math.floor((selected.height - side) / 2), width: side, height: side });
    if (side > 1024) context.resize({ width: 1024, height: 1024 });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
      return { uri: saved.uri, name: 'avatar.jpg', type: 'image/jpeg' };
    } finally { image.release(); }
  } finally {
    context.release();
    await releaseAvatar({ uri: selected.uri, name: 'selected', type: selected.mimeType ?? 'image/jpeg' });
  }
}
