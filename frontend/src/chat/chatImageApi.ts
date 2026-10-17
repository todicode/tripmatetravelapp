import type { AuthorizedRequest } from '../auth/session';
import { jpegDataUri } from '../media/imageContent';

export type ChatImage = { id: string; width: number; height: number };
export type ChatImageDraft = { uri: string; name: string; type: string };

export function createChatImageApi(request: AuthorizedRequest, prefix: string) {
  const binary = async (path: string) =>
    jpegDataUri(
      await request<ArrayBuffer>(path, undefined, 'GET', { responseType: 'arrayBuffer' }),
    );
  return {
    upload: async (file: ChatImageDraft): Promise<ChatImage> => {
      const result = await request<ChatImage & { purpose: string; status: string }>(
        '/media',
        { purpose: 'CHAT_IMAGE' },
        'POST',
        { file },
      );
      if (
        result.purpose !== 'CHAT_IMAGE' ||
        result.status !== 'READY' ||
        typeof result.id !== 'string' ||
        !Number.isInteger(result.width) ||
        result.width < 1 ||
        !Number.isInteger(result.height) ||
        result.height < 1
      )
        throw new Error('Phản hồi ảnh không hợp lệ. Vui lòng thử lại.');
      return { id: result.id, width: result.width, height: result.height };
    },
    image: (id: string, messageId: string, thumbnail = true) =>
      binary(
        `${prefix}/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/image?thumbnail=${thumbnail}`,
      ),
    avatar: (mediaId: string) => binary(`/chat/avatars/${encodeURIComponent(mediaId)}`),
  };
}
