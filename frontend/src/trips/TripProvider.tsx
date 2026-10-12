import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { ApiRequestError, AuthorizedRequest } from '../auth/session';
import { CityDto, createTripInput, tripApi } from './tripApi';
import { Trip } from './tripModel';

function useTripSession(request: AuthorizedRequest, userId: string) {
  const api = useMemo(() => tripApi(request), [request]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [cities, setCities] = useState<CityDto[]>([]);
  const generation = useRef(0);
  const sequence = useRef(0);
  const pendingCreate = useRef<{ fingerprint: string; body: Record<string, unknown> } | null>(null);
  const creating = useRef(false);
  const [hasPendingCreate, setHasPendingCreate] = useState(false);
  const merge = (trip: Trip, epoch: number) => { if (generation.current === epoch) { sequence.current++; setLoading(false); setTrips(current => [trip, ...current.filter(t => t.id !== trip.id)]); } };
  const refresh = async (next?: string) => {
    const epoch = generation.current, ticket = ++sequence.current;
    setLoading(true); setError('');
    try {
      const [page, catalog] = await Promise.all([api.page(next), api.cities()]);
      const loaded = await Promise.all(page.items.map(t => api.get(t.id)));
      if (epoch === generation.current && ticket === sequence.current) { setCities(catalog.items); setTrips(previous => next ? [...previous, ...loaded.filter(t => !previous.some(p => p.id === t.id))] : loaded); setCursor(page.pageInfo.nextCursor); }
    } catch (failure) { if (epoch === generation.current && ticket === sequence.current) setError(message(failure)); }
    finally { if (epoch === generation.current && ticket === sequence.current) setLoading(false); }
  };
  useEffect(() => { generation.current++; pendingCreate.current = null; setTrips([]); setCursor(null); setCities([]); void refresh();
    return () => { generation.current++; sequence.current++; }; }, [userId, api]);
  const retryCreate = async () => {
    if (creating.current) throw new Error('Đang lưu chuyến đi.');
    const pending = pendingCreate.current, epoch = generation.current;
    if (!pending) throw new Error('Không có lần lưu cần thử lại.');
    creating.current = true; let created = false;
    try {
      const dto = await api.create(pending.body); created = true;
      const saved = await api.get(dto.id);
      if (epoch !== generation.current) throw new Error('Phiên đăng nhập đã thay đổi.');
      pendingCreate.current = null; setHasPendingCreate(false); merge(saved, epoch); return saved;
    } catch (failure) {
      if (!created && failure instanceof ApiRequestError && failure.status >= 400 && failure.status < 500 && failure.status !== 409) {
        pendingCreate.current = null; setHasPendingCreate(false);
      }
      throw failure;
    } finally { creating.current = false; }
  };
  const create = async (trip: Trip) => {
    const input = createTripInput(trip), fingerprint = JSON.stringify(input);
    if (pendingCreate.current && pendingCreate.current.fingerprint !== fingerprint) throw new Error('Lần lưu trước chưa rõ kết quả. Chọn “Kiểm tra lần lưu trước” để lấy lại chuyến đã gửi.');
    pendingCreate.current ??= { fingerprint, body: { ...input, clientRequestId: Crypto.randomUUID() } };
    setHasPendingCreate(true); return retryCreate();
  };
  const load = async (id: string) => { const epoch = generation.current; const t = await api.get(id); merge(t, epoch); return t; };
  const remove = async (trip: Trip) => { const epoch = generation.current; await api.remove(trip); if (epoch === generation.current) setTrips(all => all.filter(t => t.id !== trip.id)); };
  return { trips, cities, loading, error, refresh, loadMore: () => cursor ? refresh(cursor) : Promise.resolve(), hasMore: !!cursor, create, retryCreate, hasPendingCreate, load, remove, api, request };
}
export const message = (failure: unknown) => failure instanceof ApiRequestError && failure.code === 'VERSION_CONFLICT'
  ? 'Chuyến đi đã thay đổi trên thiết bị khác. Bản đang sửa vẫn được giữ; tải bản mới trước khi chỉnh tiếp.'
  : failure instanceof Error ? failure.message : 'Không kết nối được máy chủ. Vui lòng thử lại.';
const Context = createContext<ReturnType<typeof useTripSession> | null>(null);
export function TripProvider({ request, userId, children }: { request: AuthorizedRequest; userId: string; children: React.ReactNode }) {
  const value = useTripSession(request, userId); return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTrips() { const value = useContext(Context); if (!value) throw new Error('TripProvider missing'); return value; }
