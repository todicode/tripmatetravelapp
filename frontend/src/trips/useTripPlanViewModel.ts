import { useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Alert } from 'react-native';
import {
  addStop,
  addTripMember,
  makeId,
  normalizeName,
  moveStop,
  reorderStop,
  toggleStop,
  Place,
  Trip,
  TripDestination,
  TripStop,
  tripStops,
} from './tripModel';
export function useTripPlanViewModel({
  trip,
  destination,
  onBack,
  onUpdate,
  onSave,
  error,
  initialTab = -1,
  notify,
  companions = [],
}: {
  trip: Trip;
  destination: TripDestination;
  onBack: () => void;
  onUpdate: (trip: Trip) => void;
  onSave?: (trip: Trip) => void;
  error?: string;
  initialTab?: number;
  notify?: typeof Alert.alert;
  companions?: Trip['members'];
}) {
  const [height, setHeight] = useState(600);
  const [tab, setTab] = useState(initialTab);
  const [picker, setPicker] = useState<number | null>(null);
  const [selected, setSelected] = useState<TripStop | null>(null);
  const [focus, setFocus] = useState<TripStop | null>(null);
  const [hotels, setHotels] = useState(false);
  const [utilities, setUtilities] = useState(false);
  const [members, setMembers] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const memberMatches = companions.filter(
    (member) =>
      !trip.members.some((item) => item.id === member.id) &&
      normalizeName(member.name).includes(normalizeName(memberQuery)),
  );
  const canAddCustomMember =
    memberQuery.trim().length >= 2 &&
    ![...trip.members, ...memberMatches].some(
      (member) => normalizeName(member.name) === normalizeName(memberQuery),
    );
  const addMember = (member: Trip['members'][number]) => onUpdate(addTripMember(trip, member));
  const removeMember = (id: string) =>
    onUpdate({ ...trip, members: trip.members.filter((member) => member.id !== id) });
  const addCustomMember = () => {
    addMember({ id: makeId(), name: memberQuery.trim() });
    setMemberQuery('');
  };
  const changeHotelStays = (hotelStays: Trip['hotelStays']) => onUpdate({ ...trip, hotelStays });
  const stops = useMemo(() => tripStops(trip), [trip.dayPlans]);
  const shown = tab === -1 ? stops : (trip.dayPlans[tab]?.stops ?? []);
  const saved = !!trip.id;
  const save = () => {
    if (stops.some((stop) => stop.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(stop.time))) {
      setMessage('Giờ đến phải có định dạng HH:mm hợp lệ.');
      return;
    }
    onSave?.(trip);
  };
  const back = () => {
    if (picker !== null) setPicker(null);
    else if (selected) setSelected(null);
    else onBack();
  };
  useEffect(() => {
    if (hotels) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [picker, selected, hotels, onBack]);
  const updateStop = (id: string, values: Partial<TripStop>) =>
    onUpdate({
      ...trip,
      dayPlans: trip.dayPlans.map((day) => ({
        ...day,
        stops: day.stops.map((stop) => (stop.id === id ? { ...stop, ...values } : stop)),
      })),
    });
  const setTitle = (title: string) => onUpdate({ ...trip, title });
  const removeStop = (id: string) => {
    onUpdate({
      ...trip,
      dayPlans: trip.dayPlans.map((day) => ({
        ...day,
        stops: day.stops.filter((stop) => stop.id !== id),
      })),
    });
    setEdit(null);
  };
  const reorder = (day: number, id: string, direction: number) =>
    onUpdate({ ...trip, dayPlans: reorderStop(trip.dayPlans, day, id, direction) });
  const move = (from: number, to: number, id: string) => {
    onUpdate({ ...trip, dayPlans: moveStop(trip.dayPlans, from, to, id) });
    setEdit(null);
  };
  const pickPlace = (day: number, place: Place, editNew = false) => {
    try {
      const dayPlans = addStop(trip.dayPlans, day, place);
      onUpdate({ ...trip, dayPlans });
      if (editNew) setEdit(dayPlans[day].stops.at(-1)?.id ?? null);
      setPicker(null);
      setMessage('');
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Không thêm được địa điểm.');
    }
  };
  const locate = (stop: TripStop) => {
    if (typeof stop.lat !== 'number' || typeof stop.lng !== 'number') {
      notify?.('Chưa có tọa độ', 'Địa điểm này chưa có vị trí bản đồ.');
      return;
    }
    setFocus(stop);
    setSelected(null);
  };
  const advanceSelected = () => {
    if (!selected) return;
    onUpdate(toggleStop(trip, selected.id));
    setSelected(null);
  };
  return {
    height,
    setHeight,
    tab,
    setTab,
    picker,
    setPicker,
    selected,
    setSelected,
    focus,
    setFocus,
    hotels,
    setHotels,
    utilities,
    setUtilities,
    members,
    setMembers,
    edit,
    setEdit,
    message,
    setMessage,
    stops,
    shown,
    saved,
    save,
    back,
    updateStop,
    setTitle,
    removeStop,
    reorder,
    move,
    pickPlace,
    locate,
    advanceSelected,
    memberQuery,
    setMemberQuery,
    memberMatches,
    canAddCustomMember,
    addMember,
    removeMember,
    addCustomMember,
    changeHotelStays,
  };
}
