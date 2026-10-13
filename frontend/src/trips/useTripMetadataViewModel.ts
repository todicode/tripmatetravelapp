import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Alert } from 'react-native';
import { Trip, dayCount } from './tripModel';

export function useTripMetadataViewModel(
  trip: Trip,
  busy: boolean,
  onSave: (body: Record<string, unknown>) => void,
  onBack: () => void,
  notify: typeof Alert.alert,
) {
  const [title, setTitle] = useState(trip.title),
    [mode, setMode] = useState(trip.dateMode ?? 'flexible');
  const [count, setCount] = useState(String(trip.dayPlans.length)),
    [start, setStart] = useState(trip.startDate),
    [end, setEnd] = useState(trip.endDate);
  const [error, setError] = useState('');
  const dirty =
    title !== trip.title ||
    mode !== trip.dateMode ||
    count !== String(trip.dayPlans.length) ||
    start !== trip.startDate ||
    end !== trip.endDate;
  const back = () => {
    if (busy) return;
    if (!dirty) return onBack();
    notify('Chưa lưu thông tin', 'Bỏ các thay đổi chưa lưu?', [
      { text: 'Tiếp tục sửa', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: onBack },
    ]);
  };
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => handler.remove();
  }, [dirty, busy]);
  const save = () => {
    if (busy) return;
    if (!title.trim()) return setError('Nhập tên chuyến đi.');
    const durationDays = Number(count);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30)
      return setError('Chọn từ 1 đến 30 ngày.');
    if (
      mode === 'specific' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(start) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
        start > end ||
        dayCount(start, end) !== durationDays)
    )
      return setError('Ngày đi/về phải hợp lệ và khớp số ngày.');
    setError('');
    onSave({
      title,
      dateMode: mode.toUpperCase(),
      durationDays,
      startDate: mode === 'flexible' ? null : start,
      endDate: mode === 'flexible' ? null : end,
    });
  };
  return {
    title,
    setTitle,
    mode,
    setMode,
    count,
    setCount,
    start,
    setStart,
    end,
    setEnd,
    error,
    back,
    save,
  };
}
