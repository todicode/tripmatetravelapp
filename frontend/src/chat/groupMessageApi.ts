import type { AuthorizedRequest } from '../auth/session';
import type { UserSummary } from './friendApi';
import type { DirectMessage, DirectMessagePage, DirectRead } from './directMessageApi';

export type GroupConversation = {
  id: string; name: string; ownerId: string; tripId: string | null; version: string; memberCount: number;
  lastMessage: DirectMessage | null; lastSeq: string; lastReadSeq: string; unreadCount: string;
  canSend: boolean; archived: boolean; createdAt: string; updatedAt: string;
};
export type GroupMember = { user: UserSummary; role: 'OWNER' | 'MEMBER'; lastReadSeq: string; joinedAt: string };
export type SharedTrip = { id: string; title: string; description: string | null; cityName: string; startDate: string; endDate: string;
  itinerary: { days: { dayNumber: number; date: string; items: { id: string; title: string; startTime: string | null; endTime: string | null; note: string | null }[] }[] } | null };
export function createGroupMessageApi(request: AuthorizedRequest) {
  const path = (id: string) => `/group-conversations/${encodeURIComponent(id)}`;
  return {
    conversations: async () => {
      const result = new Map<string, GroupConversation>(); const seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const page: { items: GroupConversation[]; pageInfo: { hasMore: boolean; nextCursor: string | null } } =
          await request(`/group-conversations?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
        page.items.forEach(item => result.set(item.id, item));
        cursor = page.pageInfo.hasMore ? page.pageInfo.nextCursor : null;
        if (page.pageInfo.hasMore && (!cursor || seen.has(cursor))) throw new Error('Không tải được danh sách nhóm. Vui lòng thử lại.');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return [...result.values()];
    },
    create: (name: string, memberIds: string[]) => request<GroupConversation>('/group-conversations', { name, memberIds, tripId: null }, 'POST'),
    detail: (id: string) => request<GroupConversation>(path(id)),
    members: (id: string) => request<GroupMember[]>(`${path(id)}/members`),
    update: (id: string, expectedVersion: string, changes: { name?: string; tripId?: string | null }) => request<GroupConversation>(path(id), { ...changes, expectedVersion }, 'PATCH'),
    add: (id: string, userId: string, expectedVersion: string) => request<GroupConversation>(`${path(id)}/members`, { userId, expectedVersion }, 'POST'),
    remove: (id: string, userId: string, version: string) => request<void>(`${path(id)}/members/${encodeURIComponent(userId)}?expectedVersion=${encodeURIComponent(version)}`, undefined, 'DELETE'),
    leave: (id: string) => request<void>(`${path(id)}/members/me`, undefined, 'DELETE'),
    transfer: (id: string, userId: string, expectedVersion: string) => request<GroupConversation>(`${path(id)}/owner`, { userId, expectedVersion }, 'PUT'),
    archive: (id: string, version: string) => request<GroupConversation>(`${path(id)}?expectedVersion=${encodeURIComponent(version)}`, undefined, 'DELETE'),
    trip: (id: string) => request<SharedTrip>(`${path(id)}/trip`),
    history: (id: string, bounds: { beforeSeq?: string; afterSeq?: string } = {}) => {
      if (bounds.beforeSeq !== undefined && bounds.afterSeq !== undefined) throw new Error('Chỉ chọn một hướng tải tin nhắn.');
      const bound = bounds.beforeSeq !== undefined ? `&beforeSeq=${encodeURIComponent(bounds.beforeSeq)}` : bounds.afterSeq !== undefined ? `&afterSeq=${encodeURIComponent(bounds.afterSeq)}` : '';
      return request<DirectMessagePage>(`${path(id)}/messages?limit=50${bound}`);
    },
    send: (id: string, clientMessageId: string, body: string) => request<DirectMessage>(`${path(id)}/messages`, { clientMessageId, body }, 'POST'),
    read: (id: string, lastReadSeq: string) => request<DirectRead>(`${path(id)}/read`, { lastReadSeq }, 'PUT'),
  };
}
export type GroupMessageApi = ReturnType<typeof createGroupMessageApi>;
