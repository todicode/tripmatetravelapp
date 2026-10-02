import { scanFromURLAsync } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { parseFriendQr } from './friendApi';

type ImageSource = { uri: string; width: number; height: number };
type Crop = { originX: number; originY: number; width: number; height: number };

function cropRegions(width: number, height: number): Crop[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const side = Math.min(width, height, 1200, Math.max(320,
    Math.round(Math.min(width, height) * 0.6), Math.ceil(Math.max(width, height) / 7)));
  if (side >= width && side >= height) return [];
  const offsets = (length: number) => {
    const last = length - side;
    if (last <= 0) return [0];
    const count = Math.ceil(last / (side * 0.75)) + 1;
    return Array.from({ length: count }, (_, index) => Math.round(index * last / (count - 1)));
  };
  const regions = offsets(height).flatMap(y => offsets(width).map(x => ({
    originX: x, originY: y, width: side, height: side,
  })));
  // Start near the centre, where screenshots commonly place the QR code.
  return regions.sort((a, b) =>
    Math.abs(a.originX + side / 2 - width / 2) + Math.abs(a.originY + side / 2 - height / 2)
    - Math.abs(b.originX + side / 2 - width / 2) - Math.abs(b.originY + side / 2 - height / 2));
}

async function scan(uri: string): Promise<string | null> {
  const codes = await scanFromURLAsync(uri, ['qr']);
  return codes.find(item => parseFriendQr(item.data))?.data ?? null;
}

export async function scanFriendQrImage(image: ImageSource): Promise<string | null> {
  const wholeImage = await scan(image.uri);
  if (wholeImage) return wholeImage;
  for (const region of cropRegions(image.width, image.height)) {
    const context = ImageManipulator.manipulate(image.uri);
    try {
      context.crop(region);
      const cropped = await context.renderAsync();
      try {
        const saved = await cropped.saveAsync({ format: SaveFormat.PNG });
        try {
          const result = await scan(saved.uri);
          if (result) return result;
        } finally {
          await FileSystem.deleteAsync(saved.uri, { idempotent: true }).catch(() => {});
        }
      } finally {
        cropped.release();
      }
    } finally {
      context.release();
    }
  }
  return null;
}
