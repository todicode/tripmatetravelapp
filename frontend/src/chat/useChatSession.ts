import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthorizedRequest, RealtimeCredentials } from '../auth/session';
import { Friend, FriendRequest } from './chatModel';
import { createFriendApi, FriendCode } from './friendApi';
import { useDirectMessaging } from './useDirectMessaging';
import { useGroupMessaging } from './useGroupMessaging';
import { createProfileApi } from '../profile/profileApi';

type Route = { kind: 'add' | 'requests' | 'create' } | { kind: 'conversation'; id: string };
export function useChatSession(
  request: AuthorizedRequest,
  userId: string,
  visible: boolean,
  realtimeCredentials: RealtimeCredentials,
) {
  const api = useMemo(() => createFriendApi(request), [request]);
  const profileApi = useMemo(() => createProfileApi(request, userId), [request, userId]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const route = routes.at(-1);
  const group = useGroupMessaging(
    request,
    userId,
    visible,
    route?.kind === 'conversation' ? route.id : null,
  );
  const direct = useDirectMessaging(
    request,
    userId,
    visible,
    route?.kind === 'conversation' ? route.id : null,
    realtimeCredentials,
    group.realtime,
  );
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
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : 'Không tải được dữ liệu kết bạn.');
    } finally {
      setSocialLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void refreshSocial();
  }, [refreshSocial]);
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
  const removeFriend = async (id: string) => {
    await api.remove(id);
    await Promise.all([refreshSocial(), direct.store.refresh()]);
  };
  const refreshChat = async () => {
    await Promise.all([refreshSocial(), direct.store.refresh(), group.store.refresh()]);
  };
  const push = (route: Route) => setRoutes((current) => [...current, route]);
  const back = () => setRoutes((current) => current.slice(0, -1));
  const open = (id: string) => {
    push({ kind: 'conversation', id });
  };
  const openFriend = async (friend: Friend) => {
    const id = await direct.store.open(friend.id);
    if (id) push({ kind: 'conversation', id });
  };
  return {
    conversations: [...direct.listConversations, ...group.listConversations].sort((a, b) => {
      const updated = (id: string) =>
        direct.conversations.find((item) => item.id === id)?.updatedAt ??
        group.groups.find((item) => item.id === id)?.updatedAt ??
        '';
      return updated(b.id).localeCompare(updated(a.id)) || b.id.localeCompare(a.id);
    }),
    direct,
    group,
    refreshChat,
    friends,
    setFriends,
    requests,
    setRequests,
    routes,
    setRoutes,
    push,
    back,
    open,
    openFriend,
    socialLoading,
    socialError,
    refreshSocial,
    friendCode,
    loadFriendCode,
    loadAvatar: profileApi.image,
    lookupPhone: api.lookupPhone,
    lookupCode: api.lookupCode,
    sendRequest,
    resolveRequest,
    removeFriend,
  };
}
