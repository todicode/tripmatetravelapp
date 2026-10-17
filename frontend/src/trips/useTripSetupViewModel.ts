import { useTrips } from './TripProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Alert } from 'react-native';
import { destinations } from './destinations';
import {
  addStop,
  buildDays,
  createTrip,
  dayCount,
  normalizeName,
  HotelStay,
  Place,
  Trip,
  TripDay,
  TripDestination,
  SavedPlaceList,
} from './tripModel';
export function useTripSetupViewModel({
  initialCityKey,
  initialTitle,
  lists,
  onBack,
  onSave,
  onRetrySave,
  notify,
}: {
  initialCityKey?: string;
  initialTitle?: string;
  lists: SavedPlaceList[];
  onBack: () => void;
  onSave: (trip: Trip) => void | Promise<void>;
  notify: typeof Alert.alert;
  onRetrySave?: () => Promise<void>;
}) {
  const { cities, hasPendingCreate } = useTrips();
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [destination, setDestination] = useState<TripDestination | null>(
    () => destinations.find((item) => item.key === initialCityKey) ?? null,
  );
  const [step, setStep] = useState(initialCityKey ? 1 : 0);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [dateMode, commitDateMode] = useState<'flexible' | 'specific'>('flexible');
  const [count, commitCount] = useState(3);
  const [start, commitStart] = useState('');
  const [end, commitEnd] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [lodging, setLodging] = useState('undecided');
  const [stays, setStays] = useState<HotelStay[]>([]);
  const [hotels, setHotels] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<Place[]>([]);
  const [pendingImport, setPendingImport] = useState<Place[] | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<Trip | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');
  const [draftMethod, setDraftMethod] = useState(false);
  const days = dateMode === 'flexible' ? count : start && end ? dayCount(start, end) : 0;
  const canResize = (next: number) => {
    if (draft?.dayPlans.slice(next).some((day) => day.stops.length)) {
      setError('Ngày bị bỏ còn điểm dừng. Xóa hoặc chuyển các điểm đó trước khi giảm số ngày.');
      return false;
    }
    setError('');
    return true;
  };
  const setCount = (next: number) => {
    if (canResize(next)) commitCount(next);
  };
  const setDates = (nextStart: string, nextEnd: string) => {
    if (nextStart && nextEnd) {
      const nextCount = dayCount(nextStart, nextEnd);
      if (nextCount > 30) {
        setError('Chuyến đi tối đa 30 ngày.');
        return;
      }
      if (!canResize(nextCount)) return;
    }
    commitStart(nextStart);
    commitEnd(nextEnd);
  };
  const setDateMode = (next: 'flexible' | 'specific') => {
    const nextCount = next === 'flexible' ? count : start && end ? dayCount(start, end) : 0;
    if (!nextCount || canResize(nextCount)) commitDateMode(next);
  };
  const close = () => {
    if (savingRef.current) return;
    if (!destination && !draft) return onBack();
    notify('Chưa lưu chuyến đi', 'Bỏ chuyến đang tạo?', [
      { text: 'Tiếp tục tạo', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: onBack },
    ]);
  };

  useEffect(() => {
    setStays((current) =>
      current.filter((stay) => stay.endDay <= days && (days === 1 || stay.endDay > stay.startDay)),
    );
  }, [days]);
  const results = useMemo(
    () =>
      searchOpen && query.trim().length >= 2
        ? cities
            .filter((city) =>
              normalizeName(`${city.name} ${city.frontendKey ?? ''}`).includes(
                normalizeName(query),
              ),
            )
            .flatMap((city) => {
              const local = destinations.find(
                (d) => d.key === city.frontendKey || d.key.toUpperCase() === city.code,
              );
              return local ? [local] : [];
            })
        : [],
    [cities, query, searchOpen],
  );
  const searching = false;
  const searchError = !cities.length
    ? 'Danh mục chưa tải được. Quay lại danh sách chuyến và nhấn Làm mới.'
    : '';
  const back = () => {
    if (searchOpen || importing) {
      setSearchOpen(false);
      setImporting(false);
      setPendingImport(null);
    } else if (planning) setPlanning(false);
    else if (step > 0) setStep((value) => value - 1);
    else close();
  };
  useEffect(() => {
    if (hotels || planning) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [step, hotels, planning, searchOpen, importing, destination, draft]);
  const choose = (item: TripDestination, places: Place[] = []) => {
    if (!cities.some((c) => c.frontendKey === item.key || c.code === item.key.toUpperCase())) {
      setError('Điểm đến chưa được tải hoặc chưa hỗ trợ. Vui lòng thử lại.');
      return;
    }
    setDestination(item);
    setImported(pendingImport ?? places);
    setPendingImport(null);
    setError('');
    setStays([]);
    setDraft(null);
    setQuery('');
    setSearchOpen(false);
    setImporting(false);
    setStep(1);
  };
  const chooseLodging = (value: string) => {
    setLodging(value);
    if (value === 'hotel') setHotels(true);
    else {
      setStays([]);
      setStep(4);
    }
  };
  const resetDates = () => {
    setDates('', '');
    setCount(3);
  };
  const openPlanner = (suggested: boolean) => {
    if (!destination || !days) return;
    if (
      !cities.some(
        (c) => c.frontendKey === destination.key || c.code === destination.key.toUpperCase(),
      )
    ) {
      setError('Danh mục điểm đến chưa tải được. Vui lòng mở lại màn hình.');
      return;
    }
    if (draft && draftMethod === suggested) {
      setPlanning(true);
      return;
    }
    let plans: TripDay[] = suggested
      ? buildDays(destination, days)
      : Array.from({ length: days }, (_, i) => ({
          dayNumber: i + 1,
          dayTitle: `Ngày ${i + 1}`,
          stops: [],
        }));
    if (!suggested) {
      try {
        for (const place of imported) plans = addStop(plans, 0, place);
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Không nhập được danh sách. Vui lòng kiểm tra các địa điểm.',
        );
        return;
      }
    }
    const trip: Trip = {
      id: '',
      title: initialTitle ?? `Khám phá ${destination.name}`,
      city: destination.name,
      cityKey: destination.key,
      destination: destination.fullName ?? destination.name,
      coords: destination.coords,
      image: destination.image,
      startDate: dateMode === 'specific' ? start : '',
      endDate: dateMode === 'specific' ? end : '',
      dateMode,
      flexibleDays: days,
      status: 'upcoming',
      dayPlans: plans,
      hotelStays: stays,
      lodgingType: lodging,
      members: [],
      expenses: [],
      checklist: [],
      aiRequested: false,
      aiPreferences: preferences,
      aiPrompt: '',
    };
    setDraftMethod(suggested);
    setDraft(trip);
    setPlanning(true);
  };
  useEffect(() => {
    setDraft((current) =>
      current && days
        ? {
            ...current,
            dateMode,
            flexibleDays: days,
            startDate: dateMode === 'specific' ? start : '',
            endDate: dateMode === 'specific' ? end : '',
            aiPreferences: preferences,
            lodgingType: lodging,
            hotelStays: stays,
            dayPlans: Array.from(
              { length: days },
              (_, index) =>
                current.dayPlans[index] ?? {
                  dayNumber: index + 1,
                  dayTitle: `Ngày ${index + 1}`,
                  stops: [],
                },
            ),
          }
        : current,
    );
  }, [dateMode, days, start, end, preferences, lodging, stays]);
  const save = async (trip: Trip) => {
    if (!destination || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const created = createTrip(
        destination,
        trip.title,
        trip.startDate,
        trip.endDate,
        trip.dayPlans,
        { dateMode, hotelStays: trip.hotelStays, lodgingType: lodging, preferences },
      );
      await onSave({ ...created, expenses: trip.expenses, checklist: trip.checklist });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không lưu được chuyến đi.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const retrySave = async () => {
    if (!onRetrySave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onRetrySave();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không xác nhận được lần lưu trước.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return {
    retrySave,
    canRetry: hasPendingCreate && !!onRetrySave,
    close,
    saving,
    destination,
    step,
    setStep,
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    results,
    searching,
    searchError,
    dateMode,
    setDateMode,
    count,
    setCount,
    start,
    end,
    setDates,
    preferences,
    setPreferences,
    lodging,
    chooseLodging,
    resetDates,
    stays,
    setStays,
    hotels,
    setHotels,
    importing,
    setImporting,
    aiOpen,
    setAiOpen,
    notes,
    setNotes,
    draft,
    setDraft,
    planning,
    setPlanning,
    error,
    days,
    back,
    choose,
    pendingImport,
    importList: (list: SavedPlaceList) => {
      if (!list.places.length) return;
      if (
        cities.some(
          (city) =>
            city.frontendKey === list.destination.key ||
            city.code === list.destination.key.toUpperCase(),
        )
      )
        return choose(list.destination, list.places);
      setPendingImport(list.places);
      setImporting(false);
      setSearchOpen(true);
      setQuery('');
      setError('Chọn thành phố cho danh sách đã lưu. Các địa điểm sẽ được giữ lại khi lập lịch.');
    },
    openPlanner,
    save,
  };
}
