import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { AuthorizedRequest } from '../auth/session';
import { createGroupMessageApi, GroupConversation } from './groupMessageApi';
import { DirectMessagingSession, toDeliveryMessage, unreadLabel } from './directMessagingModel';
import type { DirectConversation } from './directMessageApi';
import type { Conversation } from './chatModel';

export function useGroupMessaging(request: AuthorizedRequest, userId: string, visible: boolean, routeId: string | null) {
  const api = useMemo(() => createGroupMessageApi(request), [request]);
  const { store, metadata } = useMemo(() => {
    const metadata = new Map<string, GroupConversation>();
    const mapped = (group: GroupConversation): DirectConversation => ({ ...group,
      user: { id: group.id, displayName: group.name, avatarMediaId: null } });
    const store = new DirectMessagingSession({
      ...api, presence: async () => [], open: async () => { throw new Error('Dùng API tạo nhóm.'); },
      conversations: async () => { const groups = await api.conversations(); metadata.clear(); groups.forEach(group => metadata.set(group.id, group)); return groups.map(mapped); },
    }, userId, Crypto.randomUUID, true);
    return { store, metadata };
  }, [api, userId]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const groups = state.conversations.flatMap(item => {
    const meta = metadata.get(item.id);
    return meta ? [{ ...meta, lastMessage: item.lastMessage, lastSeq: item.lastSeq, lastReadSeq: item.lastReadSeq,
      unreadCount: item.unreadCount, canSend: item.canSend, updatedAt: item.updatedAt }] : [];
  });
  const selectedId = groups.some(item => item.id === routeId) ? routeId : null;
  useEffect(() => { store.activate(); void store.refresh(); return () => store.deactivate(); }, [store]);
  useEffect(() => {
    if (!visible) return;
    const refresh = () => { if (AppState.currentState === 'active') void store.refresh(false); };
    const sync = () => { if (AppState.currentState === 'active' && selectedId) void store.load(selectedId).then(() => store.sync(selectedId)); };
    refresh(); sync();
    const lists = setInterval(refresh, 10_000); const messages = setInterval(sync, 3_000);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') { refresh(); sync(); } });
    return () => { clearInterval(lists); clearInterval(messages); subscription.remove(); };
  }, [store, visible, selectedId]);
  const listConversations: Conversation[] = groups.map(group => ({ id: group.id, type: 'group', name: group.name,
    avatar: group.name.trim().charAt(0).toUpperCase() || 'N', members: [], tripId: group.tripId ?? undefined,
    unread: Number(BigInt(group.unreadCount) > 99n ? 99n : BigInt(group.unreadCount)), unreadLabel: unreadLabel(group.unreadCount),
    messages: [], lastMessage: group.lastMessage ? toDeliveryMessage(group.lastMessage, userId) : undefined }));
  return { ...state, groups, store, api, listConversations, userId,
    create: async (name: string, members: string[]) => { const group = await api.create(name, members); await store.refresh(); return group.id; },
    readVisible: (id: string, seq: string) => { if (visible && AppState.currentState === 'active') void store.read(id, seq); } };
}
