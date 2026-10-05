import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { AuthorizedRequest, RealtimeCredentials } from '../auth/session';
import { createDirectMessageApi } from './directMessageApi';
import { DirectMessagingSession, toListConversation } from './directMessagingModel';
import { DirectRealtimeConnection } from './directRealtime';

export function useDirectMessaging(request: AuthorizedRequest, userId: string, visible: boolean, routeId: string | null, credentials: RealtimeCredentials) {
  const store = useMemo(() => new DirectMessagingSession(createDirectMessageApi(request), userId, Crypto.randomUUID), [request, userId]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const selectedId = state.conversations.some(item => item.id === routeId) ? routeId : null;
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const activeThread = useRef<string | null>(null);
  activeThread.current = visible ? selectedId : null;
  useEffect(() => {
    store.activate();
    void store.refresh();
    return () => store.deactivate();
  }, [store]);
  useEffect(() => {
    let active = true;
    let revision = 0;
    setOnlineUsers({});
    const presenceApi = createDirectMessageApi(request);
    const refreshPresence = async () => {
      const before = revision;
      try {
        const statuses = await presenceApi.presence();
        if (active && before === revision && AppState.currentState === 'active')
          setOnlineUsers(Object.fromEntries(statuses.map(item => [item.userId, item.online])));
      } catch { /* Unknown presence stays hidden until the next snapshot. */ }
    };
    const connection = new DirectRealtimeConnection(credentials, event => {
      if (event.type === 'direct.presence.updated') {
        revision++;
        setOnlineUsers(current => ({ ...current, [event.data.userId]: event.data.online }));
        return;
      }
      store.receive(event);
      const id = activeThread.current;
      if (event.type === 'direct.message.created' && id === event.data.conversationId) void store.sync(id);
    }, async () => {
      await store.refresh(false);
      await refreshPresence();
      const id = activeThread.current;
      if (id) { await store.load(id); await store.sync(id); }
    }, connected => {
      setRealtimeConnected(connected);
      if (!connected) { revision++; setOnlineUsers({}); }
    });
    const presenceTimer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshPresence();
    }, 30_000);
    if (AppState.currentState === 'active') connection.start();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') connection.start(); else connection.stop();
    });
    return () => { active = false; clearInterval(presenceTimer); subscription.remove(); connection.stop(); };
  }, [store, credentials, request]);
  useEffect(() => {
    if (!visible) return;
    const foreground = () => AppState.currentState === 'active';
    const refresh = () => { if (foreground()) void store.refresh(false); };
    const sync = () => { if (foreground() && selectedId) void store.sync(selectedId); };
    const resume = () => {
      if (!foreground()) return;
      refresh();
      if (selectedId) void store.load(selectedId).then(sync);
    };
    resume();
    const listTimer = setInterval(refresh, realtimeConnected ? 30_000 : 10_000);
    const messageTimer = setInterval(sync, realtimeConnected ? 30_000 : 3_000);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') resume(); });
    return () => { clearInterval(listTimer); clearInterval(messageTimer); subscription.remove(); };
  }, [store, visible, selectedId, realtimeConnected]);
  return {
    ...state, store, realtimeConnected, onlineUsers, listConversations: state.conversations.map(item => toListConversation(item, userId)),
    selected: state.conversations.find(item => item.id === selectedId),
    thread: selectedId ? state.threads[selectedId] : undefined,
    readVisible: (id: string, seq: string) => { if (visible && AppState.currentState === 'active') void store.read(id, seq); },
  };
}
