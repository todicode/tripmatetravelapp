import { useEffect, useState } from 'react';
import { searchPlaces } from './destinations';
import { Place, TripDestination } from './tripModel';
export function usePlacePickerViewModel({ destination, onPick, label = 'Tìm địa điểm' }: { destination: TripDestination; onPick: (place: Place) => void; label?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setResults([]); setError(''); setBusy(false);
    if (query.trim().length < 2) return;
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(async () => { setBusy(true); const timeout = setTimeout(() => controller.abort(), 10000); try { const found = await searchPlaces(query.trim(), destination, controller.signal); if (active) setResults(found); } catch { if (active) setError('Không tìm được địa điểm. Vui lòng thử lại.'); } finally { clearTimeout(timeout); if (active) setBusy(false); } }, 450);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, destination.key]);
  return { query, setQuery, results, busy, error };
}
