import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { AuthorizedRequest } from '../auth/session';
import { createDirectMessageApi } from './directMessageApi';
import { DirectMessagingSession, toListConversation } from './directMessagingModel';

export function useDirectMessaging(request: AuthorizedRequest, userId: string, visible: boolean, routeId: string | null) {
  const store = useMemo(() => new DirectMessagingSession(createDirectMessageApi(request), userId, Crypto.randomUUID), [request, userId]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const selectedId = state.conversations.some(item => item.id === routeId) ? routeId : null;
  useEffect(() => {
    store.activate();
    void store.refresh();
    return () => store.deactivate();
  }, [store]);
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
    const listTimer = setInterval(refresh, 10_000);
    const messageTimer = setInterval(sync, 3_000);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') resume(); });
    return () => { clearInterval(listTimer); clearInterval(messageTimer); subscription.remove(); };
  }, [store, visible, selectedId]);
  return {
    ...state, store, listConversations: state.conversations.map(item => toListConversation(item, userId)),
    selected: state.conversations.find(item => item.id === selectedId),
    thread: selectedId ? state.threads[selectedId] : undefined,
    readVisible: (id: string, seq: string) => { if (visible && AppState.currentState === 'active') void store.read(id, seq); },
  };
}
