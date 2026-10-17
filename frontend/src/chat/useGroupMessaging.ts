import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { AuthorizedRequest } from '../auth/session';
import { createGroupMessageApi, GroupConversation } from './groupMessageApi';
import { DirectMessagingSession, toDeliveryMessage, unreadLabel } from './directMessagingModel';
import type { DirectConversation } from './directMessageApi';
import type { Conversation } from './chatModel';
import type { RealtimeCompanion } from './directRealtime';
import { releaseChatImage } from './chatImagePicker';

export function useGroupMessaging(
  request: AuthorizedRequest,
  userId: string,
  visible: boolean,
  routeId: string | null,
) {
  const api = useMemo(() => createGroupMessageApi(request), [request]);
  const { store, metadata } = useMemo(() => {
    const metadata = new Map<string, GroupConversation>();
    const mapped = (group: GroupConversation): DirectConversation => ({
      ...group,
      user: { id: group.id, displayName: group.name, avatarMediaId: null },
    });
    const store = new DirectMessagingSession(
      {
        ...api,
        presence: async () => [],
        open: async () => {
          throw new Error('Dùng API tạo nhóm.');
        },
        conversations: async () => {
          const groups = await api.conversations();
          metadata.clear();
          groups.forEach((group) => metadata.set(group.id, group));
          return groups.map(mapped);
        },
      },
      userId,
      Crypto.randomUUID,
      true,
      releaseChatImage,
    );
    return { store, metadata };
  }, [api, userId]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const groups = state.conversations.flatMap((item) => {
    const meta = metadata.get(item.id);
    return meta
      ? [
          {
            ...meta,
            lastMessage: item.lastMessage,
            lastSeq: item.lastSeq,
            lastReadSeq: item.lastReadSeq,
            unreadCount: item.unreadCount,
            canSend: item.canSend,
            updatedAt: item.updatedAt,
          },
        ]
      : [];
  });
  const selectedId = groups.some((item) => item.id === routeId) ? routeId : null;
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const activeThread = useRef<string | null>(null);
  activeThread.current = visible ? selectedId : null;
  const realtime = useMemo<RealtimeCompanion>(
    () => ({
      status: setRealtimeConnected,
      ready: async () => {
        await store.refresh(false);
        const id = activeThread.current;
        if (id) {
          await store.load(id);
          await store.sync(id);
          await store.loadReaders(id);
        }
      },
      receive: (event) => {
        const id = event.data.conversationId;
        if (event.type === 'group.access.revoked') {
          metadata.delete(id);
          store.forgetConversation(id);
          return;
        }
        if (event.type === 'group.message.created')
          store.receive({ ...event, type: 'direct.message.created', data: event.data });
        else if (event.type === 'group.read.updated')
          store.receive({ ...event, type: 'direct.read.updated', data: event.data });
        else {
          void store.refresh(false);
          if (id === activeThread.current) void store.loadReaders(id);
        }
        if (id === activeThread.current) void store.load(id).then(() => store.sync(id));
      },
    }),
    [store, metadata],
  );
  useEffect(() => {
    store.activate();
    void store.refresh();
    return () => store.deactivate();
  }, [store]);
  useEffect(() => {
    if (!visible) return;
    const refresh = () => {
      if (AppState.currentState === 'active') void store.refresh(false);
    };
    const sync = () => {
      if (AppState.currentState === 'active' && selectedId)
        void store.load(selectedId).then(() => store.sync(selectedId));
      if (AppState.currentState === 'active' && selectedId) void store.loadReaders(selectedId);
    };
    refresh();
    sync();
    const lists = setInterval(refresh, realtimeConnected ? 30_000 : 10_000);
    const messages = setInterval(sync, realtimeConnected ? 30_000 : 3_000);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refresh();
        sync();
      }
    });
    return () => {
      clearInterval(lists);
      clearInterval(messages);
      subscription.remove();
    };
  }, [store, visible, selectedId, realtimeConnected]);
  const listConversations: Conversation[] = groups.map((group) => ({
    id: group.id,
    type: 'group',
    name: group.name,
    avatar: group.name.trim().charAt(0).toUpperCase() || 'N',
    members: [],
    tripId: group.tripId ?? undefined,
    unread: Number(BigInt(group.unreadCount) > 99n ? 99n : BigInt(group.unreadCount)),
    unreadLabel: unreadLabel(group.unreadCount),
    messages: [],
    lastMessage: group.lastMessage
      ? {
          ...toDeliveryMessage(group.lastMessage, userId),
          text: group.lastMessage.body || (group.lastMessage.image ? 'Ảnh' : ''),
        }
      : undefined,
  }));
  return {
    ...state,
    groups,
    store,
    api,
    listConversations,
    userId,
    realtime,
    realtimeConnected,
    create: async (name: string, members: string[], tripId: string | null = null) => {
      const group = await api.create(name, members, tripId);
      await store.refresh();
      return group.id;
    },
    readVisible: (id: string, seq: string) => {
      if (visible && AppState.currentState === 'active') void store.read(id, seq);
    },
  };
}
