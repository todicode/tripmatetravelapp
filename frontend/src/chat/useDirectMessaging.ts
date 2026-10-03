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
  const activeThread = useRef<string | null>(null);
  activeThread.current = visible ? selectedId : null;
  useEffect(() => {
    store.activate();
    void store.refresh();
    return () => store.deactivate();
  }, [store]);
  useEffect(() => {
    const connection = new DirectRealtimeConnection(credentials, event => {
      store.receive(event);
      const id = activeThread.current;
      if (event.type === 'direct.message.created' && id === event.data.conversationId) void store.sync(id);
    }, async () => {
      await store.refresh(false);
      const id = activeThread.current;
      if (id) { await store.load(id); await store.sync(id); }
    }, setRealtimeConnected);
    if (AppState.currentState === 'active') connection.start();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') connection.start(); else connection.stop();
    });
    return () => { subscription.remove(); connection.stop(); };
  }, [store, credentials]);
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
    ...state, store, realtimeConnected, listConversations: state.conversations.map(item => toListConversation(item, userId)),
    selected: state.conversations.find(item => item.id === selectedId),
    thread: selectedId ? state.threads[selectedId] : undefined,
    readVisible: (id: string, seq: string) => { if (visible && AppState.currentState === 'active') void store.read(id, seq); },
  };
}
