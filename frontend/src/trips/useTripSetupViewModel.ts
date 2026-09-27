import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { destinations, searchDestinations } from './destinations';
import { addStop, buildDays, createTrip, dayCount, HotelStay, Place, Trip, TripDay, TripDestination, SavedPlaceList } from './tripModel';
export function useTripSetupViewModel({ initialCityKey, initialTitle, lists, onBack, onSave }: { initialCityKey?: string; initialTitle?: string; lists: SavedPlaceList[]; onBack: () => void; onSave: (trip: Trip) => void }) {
  const [destination, setDestination] = useState<TripDestination | null>(() => destinations.find(item => item.key === initialCityKey) ?? null);
  const [step, setStep] = useState(initialCityKey ? 1 : 0);
  const [query, setQuery] = useState(''); const [results, setResults] = useState<TripDestination[]>([]); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [dateMode, setDateMode] = useState<'flexible' | 'specific'>('flexible'); const [count, setCount] = useState(3); const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]); const [lodging, setLodging] = useState('undecided'); const [stays, setStays] = useState<HotelStay[]>([]); const [hotels, setHotels] = useState(false);
  const [importing, setImporting] = useState(false); const [imported, setImported] = useState<Place[]>([]); const [aiOpen, setAiOpen] = useState(false); const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<Trip | null>(null); const [planning, setPlanning] = useState(false); const [error, setError] = useState('');
  const [draftMethod, setDraftMethod] = useState(false);
  const days = dateMode === 'flexible' ? count : start && end ? dayCount(start, end) : 0;
  useEffect(() => { setStays(current => current.filter(stay => stay.endDay <= days && (days === 1 || stay.endDay > stay.startDay))); }, [days]);
  useEffect(() => {
    setResults([]); setSearchError(''); setSearching(false); if (!searchOpen || query.trim().length < 2) return;
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(async () => { setSearching(true); const timeout = setTimeout(() => controller.abort(), 10000); try { const found = await searchDestinations(query, controller.signal); if (active) setResults(found); } catch { if (active) setSearchError('Không tìm được điểm đến. Vui lòng thử lại.'); } finally { clearTimeout(timeout); if (active) setSearching(false); } }, 450);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, searchOpen]);
  const back = () => { if (searchOpen || importing) { setSearchOpen(false); setImporting(false); } else if (planning) setPlanning(false); else if (step > 0) setStep(value => value - 1); else onBack(); };
  useEffect(() => { if (hotels || planning) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => sub.remove(); }, [step, hotels, planning, searchOpen, importing]);
  const choose = (item: TripDestination, places: Place[] = []) => { setDestination(item); setImported(places); setStays([]); setDraft(null); setQuery(''); setSearchOpen(false); setImporting(false); setStep(1); };
  const chooseLodging = (value: string) => { setLodging(value); if (value === 'hotel') setHotels(true); else { setStays([]); setStep(4); } };
  const resetDates = () => { setStart(''); setEnd(''); setCount(3); };
  const openPlanner = (suggested: boolean) => {
    if (!destination || !days) return;
    if (draft && draftMethod === suggested) { setPlanning(true); return; }
    let plans: TripDay[] = suggested ? buildDays(destination, days) : Array.from({ length: days }, (_, i) => ({ dayNumber: i + 1, dayTitle: `Ngày ${i + 1}`, stops: [] }));
    if (!suggested) for (const place of imported) { try { plans = addStop(plans, 0, place); } catch {} }
    const trip: Trip = { id: '', title: initialTitle ?? `Khám phá ${destination.name}`, city: destination.name, cityKey: destination.key, destination: destination.fullName ?? destination.name, coords: destination.coords, image: destination.image, startDate: dateMode === 'specific' ? start : '', endDate: dateMode === 'specific' ? end : '', dateMode, flexibleDays: days, status: 'upcoming', dayPlans: plans, hotelStays: stays, lodgingType: lodging, members: [], expenses: [], checklist: [], aiRequested: false, aiPreferences: preferences, aiPrompt: '' };
    setDraftMethod(suggested); setDraft(trip); setPlanning(true);
  };
  useEffect(() => {
    setDraft(current => current && days ? { ...current, dateMode, flexibleDays: days, startDate: dateMode === 'specific' ? start : '', endDate: dateMode === 'specific' ? end : '', aiPreferences: preferences, lodgingType: lodging, hotelStays: stays, dayPlans: Array.from({ length: days }, (_, index) => current.dayPlans[index] ?? { dayNumber: index + 1, dayTitle: `Ngày ${index + 1}`, stops: [] }) } : current);
  }, [dateMode, days, start, end, preferences, lodging, stays]);
  const save = (trip: Trip) => {
    if (!destination) return;
    try { const created = createTrip(destination, trip.title, trip.startDate, trip.endDate, trip.dayPlans, { dateMode, hotelStays: trip.hotelStays, lodgingType: lodging, preferences }); onSave({ ...created, expenses: trip.expenses, checklist: trip.checklist }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không lưu được chuyến đi.'); }
  };
  return { destination, step, setStep, searchOpen, setSearchOpen, query, setQuery, results, searching, searchError, dateMode, setDateMode, count, setCount, start, setStart, end, setEnd, preferences, setPreferences, lodging, chooseLodging, resetDates, stays, setStays, hotels, setHotels, importing, setImporting, aiOpen, setAiOpen, notes, setNotes, draft, setDraft, planning, setPlanning, error, days, back, choose, openPlanner, save };
}
