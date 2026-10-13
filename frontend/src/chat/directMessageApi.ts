import type { AuthorizedRequest } from '../auth/session';
import type { UserSummary } from './friendApi';

export type DirectMessage = {
  id: string; conversationId: string; seq: string; sender: UserSummary;
  clientMessageId: string; body: string; createdAt: string;
};
export type DirectConversation = {
  id: string; user: UserSummary; lastMessage: DirectMessage | null; lastSeq: string;
  lastReadSeq: string; unreadCount: string; canSend: boolean; createdAt: string; updatedAt: string;
};
export type DirectRead = { conversationId: string; lastReadSeq: string; unreadCount: string };
export type DirectMessagePage = {
  items: DirectMessage[]; pageInfo: { hasMore: boolean; nextBeforeSeq: string | null; nextAfterSeq: string };
};
type ConversationPage = { items: DirectConversation[]; pageInfo: { hasMore: boolean; nextCursor: string | null } };

export function createDirectMessageApi(request: AuthorizedRequest) {
  const path = (id: string) => `/direct-conversations/${encodeURIComponent(id)}`;
  return {
    presence: () => request<{ userId: string; online: boolean }[]>('/direct-conversations/presence'),
    conversations: async () => {
      const result = new Map<string, DirectConversation>();
      const seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const page: ConversationPage = await request<ConversationPage>(`/direct-conversations?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
        page.items.forEach(item => result.set(item.id, item));
        cursor = page.pageInfo.hasMore ? page.pageInfo.nextCursor : null;
        if (page.pageInfo.hasMore && (!cursor || seen.has(cursor))) throw new Error('Không tải được danh sách trò chuyện. Vui lòng thử lại.');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return [...result.values()];
    },
    open: (recipientId: string) => request<DirectConversation>('/direct-conversations', { recipientId }, 'POST'),
    history: (id: string, bounds: { beforeSeq?: string; afterSeq?: string } = {}) => {
      if (bounds.beforeSeq !== undefined && bounds.afterSeq !== undefined) throw new Error('Chỉ dùng một hướng tải tin nhắn.');
      const bound = bounds.beforeSeq !== undefined ? `&beforeSeq=${encodeURIComponent(bounds.beforeSeq)}`
        : bounds.afterSeq !== undefined ? `&afterSeq=${encodeURIComponent(bounds.afterSeq)}` : '';
      return request<DirectMessagePage>(`${path(id)}/messages?limit=50${bound}`);
    },
    send: (id: string, clientMessageId: string, body: string) =>
      request<DirectMessage>(`${path(id)}/messages`, { clientMessageId, body }, 'POST'),
    read: (id: string, lastReadSeq: string) =>
      request<DirectRead>(`${path(id)}/read`, { lastReadSeq }, 'PUT'),
  };
}
export type DirectMessageApi = ReturnType<typeof createDirectMessageApi>;
