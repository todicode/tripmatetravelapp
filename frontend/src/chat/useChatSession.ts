import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthorizedRequest, RealtimeCredentials } from '../auth/session';
import { Conversation, Friend, FriendRequest, initialConversations } from './chatModel';
import { createFriendApi, FriendCode } from './friendApi';
import { useDirectMessaging } from './useDirectMessaging';

type Route = { kind: 'add' | 'requests' | 'create' } | { kind: 'conversation'; id: string };
export function useChatSession(request: AuthorizedRequest, userId: string, visible: boolean, realtimeCredentials: RealtimeCredentials) {
  const api = useMemo(() => createFriendApi(request), [request]);
  const [conversations, setConversations] = useState(initialConversations);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const route = routes.at(-1);
  const direct = useDirectMessaging(request, userId, visible, route?.kind === 'conversation' ? route.id : null, realtimeCredentials);
  const [socialLoading, setSocialLoading] = useState(true);
  const [socialError, setSocialError] = useState('');
  const [friendCode, setFriendCode] = useState<FriendCode | null>(null);
  const refreshSocial = useCallback(async () => {
    setSocialLoading(true);
    setSocialError('');
    try {
      const [nextFriends, nextRequests] = await Promise.all([api.friends(), api.requests()]);
      setFriends(nextFriends);
      setRequests(nextRequests);
    } catch (error) { setSocialError(error instanceof Error ? error.message : 'Không tải được dữ liệu kết bạn.'); }
    finally { setSocialLoading(false); }
  }, [api]);
  useEffect(() => { void refreshSocial(); }, [refreshSocial]);
  const loadFriendCode = useCallback(async () => {
    const code = await api.ownCode();
    setFriendCode(code);
    return code;
  }, [api]);
  const resolveRequest = async (id: string, action: 'accept' | 'reject' | 'cancel') => {
    await api.resolve(id, action);
    await refreshSocial();
  };
  const sendRequest = async (recipientId: string, message: string) => {
    const result = await api.send(recipientId, message);
    await refreshSocial();
    return result;
  };
  const removeFriend = async (id: string) => { await api.remove(id); await Promise.all([refreshSocial(), direct.store.refresh()]); };
  const refreshChat = async () => { await Promise.all([refreshSocial(), direct.store.refresh()]); };
  const push = (route: Route) => setRoutes(current => [...current, route]);
  const back = () => setRoutes(current => current.slice(0, -1));
  const update = (id: string, fn: (conversation: Conversation) => Conversation) => setConversations(current => current.map(item => item.id === id ? fn(item) : item));
  const open = (id: string) => { update(id, item => ({ ...item, unread: 0 })); push({ kind: 'conversation', id }); };
  const openFriend = async (friend: Friend) => {
    const id = await direct.store.open(friend.id);
    if (id) push({ kind: 'conversation', id });
  };
  return { conversations: [...direct.listConversations, ...conversations.filter(item => item.type === 'group')], direct, refreshChat,
    setConversations, friends, setFriends, requests, setRequests, routes, setRoutes, push, back, update, open, openFriend,
    socialLoading, socialError, refreshSocial, friendCode, loadFriendCode, lookupPhone: api.lookupPhone, lookupCode: api.lookupCode, sendRequest, resolveRequest, removeFriend };
}
