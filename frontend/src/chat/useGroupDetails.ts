import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { GroupConversation, GroupMember, SharedTrip } from './groupMessageApi';
import type { useGroupMessaging } from './useGroupMessaging';

export function useGroupDetails(group: GroupConversation, session: ReturnType<typeof useGroupMessaging>, settings: boolean, tripOpen: boolean, onLeave: () => void) {
  const [members, setMembers] = useState<GroupMember[]>([]); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [trip, setTrip] = useState<SharedTrip | null>(null); const [tripError, setTripError] = useState('');
  const [tripLoading, setTripLoading] = useState(false); const mounted = useRef(true);
  const { api, store } = session;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!settings) return;
    let active = true; let pending = false;
    const load = async () => {
      if (pending || AppState.currentState !== 'active') return;
      pending = true; setLoading(true);
      try { const next = await api.members(group.id); if (active) { setMembers(next); setError(''); } }
      catch (error) { if (active) { setMembers([]); setError(error instanceof Error ? error.message : 'Không tải được thành viên.'); } }
      finally { pending = false; if (active) setLoading(false); }
    };
    void load(); const timer = setInterval(() => { void load(); }, 10_000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { active = false; clearInterval(timer); sub.remove(); };
  }, [settings, group.id, group.version, api]);
  useEffect(() => {
    if (!tripOpen || !group.tripId) { setTrip(null); return; }
    let active = true; let pending = false;
    const load = async () => {
      if (pending || AppState.currentState !== 'active') return;
      pending = true; setTripLoading(true);
      try { const next = await api.trip(group.id); if (active && AppState.currentState === 'active') { setTrip(next); setTripError(''); } }
      catch (error) { if (active) { setTrip(null); setTripError(error instanceof Error ? error.message : 'Không tải được chuyến đi.'); } }
      finally { pending = false; if (active) setTripLoading(false); }
    };
    setTrip(null); setTripError(''); void load(); const timer = setInterval(() => { void load(); }, 10_000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void load(); else setTrip(null); });
    return () => { active = false; clearInterval(timer); sub.remove(); };
  }, [tripOpen, group.id, group.tripId, api]);
  const manage = async (action: () => Promise<unknown>, leaving = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await action();
      if (!mounted.current) return;
      if (leaving) onLeave();
      await store.refresh(false);
      if (!leaving && settings && mounted.current) {
        const next = await api.members(group.id); if (mounted.current) setMembers(next);
      }
    } catch (error) {
      if (mounted.current) {
        await store.refresh(false);
        if (mounted.current) setError(error instanceof Error ? error.message : 'Không thực hiện được. Vui lòng thử lại.');
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return { members, loading, error, busy, trip, tripError, tripLoading,
    rename: (name: string) => manage(() => api.update(group.id, group.version, { name: name.trim() })),
    unlink: () => manage(() => api.update(group.id, group.version, { tripId: null })),
    add: (userId: string) => manage(() => api.add(group.id, userId, group.version)),
    remove: (userId: string) => manage(() => api.remove(group.id, userId, group.version)),
    transfer: (userId: string) => manage(() => api.transfer(group.id, userId, group.version)),
    archive: () => manage(() => api.archive(group.id, group.version)),
    leave: () => manage(() => api.leave(group.id), true),
  };
}
