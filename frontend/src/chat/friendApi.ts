import { AuthorizedRequest } from '../auth/session';
import { Friend, FriendRequest } from './chatModel';

export type UserSummary = { id: string; displayName: string; avatarMediaId: string | null };
export type LookupResult = { user: UserSummary; relationship: 'SELF' | 'FRIEND' | 'NONE' | 'OUTGOING_PENDING' | 'INCOMING_PENDING'; pendingRequestId: string | null };
export type FriendCode = { friendCode: string; qrPayload: string };
type RequestResult = { id: string; sender: UserSummary; recipient: UserSummary; message: string | null; status: string };
type Page<T> = { items: T[]; pageInfo: { nextCursor: string | null; hasMore: boolean } };
type SendResult = { outcome: 'PENDING'; request: RequestResult } | { outcome: 'ALREADY_FRIENDS'; friendship: { user: UserSummary } };

export const toFriend = (user: UserSummary): Friend => ({ id: user.id, name: user.displayName, phone: '', avatar: user.displayName.trim().charAt(0).toUpperCase() || '?' });
export function parseFriendQr(value: string): string | null {
  const match = /^tripmate:\/\/friend\/(TM-[A-Za-z0-9]{8})$/i.exec(value.trim());
  return match && match[1].length <= 32 ? match[1].toUpperCase() : null;
}

export function createFriendApi(request: AuthorizedRequest) {
  async function allPages<T>(path: string): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | null = null;
    do {
      const page: Page<T> = await request<Page<T>>(`${path}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      items.push(...page.items);
      cursor = page.pageInfo.hasMore ? page.pageInfo.nextCursor : null;
    } while (cursor);
    return items;
  }
  return {
    ownCode: () => request<FriendCode>('/users/me/friend-code'),
    lookupPhone: (phone: string) => request<LookupResult>(`/users/lookup-by-phone?phone=${encodeURIComponent(phone)}`),
    lookupCode: (code: string) => request<LookupResult>(`/users/lookup?friendCode=${encodeURIComponent(code)}`),
    friends: async () => (await allPages<{ user: UserSummary }>('/friends?limit=20')).map(item => toFriend(item.user)),
    requests: async () => {
      const [incoming, outgoing] = await Promise.all([
        allPages<RequestResult>('/friend-requests?direction=INCOMING&status=PENDING&limit=20'),
        allPages<RequestResult>('/friend-requests?direction=OUTGOING&status=PENDING&limit=20'),
      ]);
      return [
        ...incoming.map(item => ({ id: item.id, friend: toFriend(item.sender), message: item.message ?? '', direction: 'received' as const })),
        ...outgoing.map(item => ({ id: item.id, friend: toFriend(item.recipient), message: item.message ?? '', direction: 'sent' as const })),
      ] satisfies FriendRequest[];
    },
    send: (recipientId: string, message: string) => request<SendResult>('/friend-requests', { recipientId, message: message.trim() || undefined }, 'POST'),
    resolve: (id: string, action: 'accept' | 'reject' | 'cancel') => request<RequestResult>(`/friend-requests/${id}/${action}`, {}, 'POST'),
    remove: (id: string) => request<void>(`/friends/${id}`, undefined, 'DELETE'),
  };
}
