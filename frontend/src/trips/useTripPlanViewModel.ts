import { useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import { Trip, TripDestination, TripStop, tripStops } from './tripModel';
export function useTripPlanViewModel({ trip, destination, onBack, onUpdate, onSave, error, initialTab = -1 }: { trip: Trip; destination: TripDestination; onBack: () => void; onUpdate: (trip: Trip) => void; onSave?: (trip: Trip) => void; error?: string; initialTab?: number }) {
  const [height, setHeight] = useState(600); const [tab, setTab] = useState(initialTab); const [picker, setPicker] = useState<number | null>(null); const [selected, setSelected] = useState<TripStop | null>(null); const [focus, setFocus] = useState<TripStop | null>(null); const [hotels, setHotels] = useState(false); const [utilities, setUtilities] = useState(false); const [members, setMembers] = useState(false); const [edit, setEdit] = useState<string | null>(null); const [message, setMessage] = useState('');
  const stops = useMemo(() => tripStops(trip), [trip.dayPlans]);
  const shown = tab === -1 ? stops : trip.dayPlans[tab]?.stops ?? [];
  const saved = !!trip.id;
  const save = () => { if (stops.some(stop => stop.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(stop.time))) { setMessage('Giờ đến phải có định dạng HH:mm hợp lệ.'); return; } onSave?.(trip); };
  const back = () => { if (picker !== null) setPicker(null); else if (selected) setSelected(null); else onBack(); };
  useEffect(() => { if (hotels) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => sub.remove(); }, [picker, selected, hotels, onBack]);
  const updateStop = (id: string, values: Partial<TripStop>) => onUpdate({ ...trip, dayPlans: trip.dayPlans.map(day => ({ ...day, stops: day.stops.map(stop => stop.id === id ? { ...stop, ...values } : stop) })) });
  return { height, setHeight, tab, setTab, picker, setPicker, selected, setSelected, focus, setFocus, hotels, setHotels, utilities, setUtilities, members, setMembers, edit, setEdit, message, setMessage, stops, shown, saved, save, back, updateStop };
}
