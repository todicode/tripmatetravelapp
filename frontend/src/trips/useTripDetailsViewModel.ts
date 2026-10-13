import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Alert } from 'react-native';
import { Trip } from './tripModel';
import { itineraryInput } from './tripApi';
import { message, useTrips } from './TripProvider';

export function useTripDetailsViewModel(
  trip: Trip,
  onBack: () => void,
  notify: typeof Alert.alert,
) {
  const session = useTrips();
  const [draft, setDraft] = useState(trip);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [metadata, setMetadata] = useState(false);
  const dirty =
    JSON.stringify(itineraryInput(draft)) !== JSON.stringify(itineraryInput(trip)) ||
    draft.title !== trip.title;
  useEffect(() => {
    if (!dirty) setDraft(trip);
  }, [trip]);
  const run = async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (failure) {
      setError(message(failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const confirmDiscard = (action: () => void) => {
    if (busyRef.current) return;
    if (!dirty) return action();
    notify('Chưa lưu thay đổi', 'Bỏ các thay đổi chưa lưu?', [
      { text: 'Tiếp tục sửa', style: 'cancel' },
      {
        text: 'Bỏ thay đổi',
        style: 'destructive',
        onPress: () => {
          setDraft(trip);
          action();
        },
      },
    ]);
  };
  const back = () => confirmDiscard(onBack);
  useEffect(() => {
    if (editing || metadata) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [dirty, editing, metadata, busy]);
  const save = () =>
    run(async () => {
      let current = draft;
      if (draft.title !== trip.title) {
        const result = await session.api.update(trip.id, {
          expectedTripVersion: current.version,
          title: draft.title,
        });
        current = {
          ...current,
          version: result.version,
          itineraryVersion: result.itineraryVersion,
        };
        setDraft(current);
      }
      const itinerary = await session.api.replace(current);
      setDraft({ ...current, version: itinerary.tripVersion, itineraryVersion: itinerary.version });
      const saved = await session.load(trip.id);
      setDraft(saved);
      setEditing(false);
    });
  const update = (next: Trip) => {
    const previous = new Map(draft.dayPlans.flatMap((d) => d.stops).map((stop) => [stop.id, stop]));
    const changes = next.dayPlans
      .flatMap((d) => d.stops)
      .filter((stop) => previous.has(stop.id) && previous.get(stop.id)?.status !== stop.status);
    const changed = changes.find((stop) => stop.status === 'active') ?? changes[0];
    if (changed) {
      if (dirty) {
        setError('Lưu lịch đang sửa trước khi cập nhật tiến độ.');
        return;
      }
      void run(async () => {
        await session.api.progress(draft, changed.id, changed.status);
        setDraft(await session.load(trip.id));
      });
    } else setDraft(next);
  };
  const reload = () =>
    confirmDiscard(() => {
      void run(async () => setDraft(await session.load(trip.id)));
    });
  const changeStatus = () =>
    confirmDiscard(() =>
      notify(
        trip.status === 'cancelled' ? 'Khôi phục chuyến?' : 'Hủy chuyến?',
        'Bạn có thể khôi phục chuyến đã hủy.',
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Xác nhận',
            onPress: () => {
              void run(async () => {
                await session.api.update(trip.id, {
                  expectedTripVersion: trip.version,
                  status: trip.status === 'cancelled' ? 'UPCOMING' : 'CANCELLED',
                });
                setDraft(await session.load(trip.id));
              });
            },
          },
        ],
      ),
    );
  const remove = () =>
    notify(
      'Xóa chuyến đi?',
      'Chuyến sẽ không còn xuất hiện trong danh sách và không thể xem qua nhóm.',
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void run(async () => {
              await session.remove(trip);
              onBack();
            });
          },
        },
      ],
    );
  const saveMetadata = (body: Record<string, unknown>) =>
    run(async () => {
      await session.api.update(trip.id, { expectedTripVersion: trip.version, ...body });
      setDraft(await session.load(trip.id));
      setMetadata(false);
    });
  return {
    draft,
    busy,
    error,
    dirty,
    editing,
    setEditing,
    metadata,
    setMetadata,
    saveMetadata,
    back,
    update,
    save,
    reload,
    changeStatus,
    remove,
    confirmDiscard,
  };
}
