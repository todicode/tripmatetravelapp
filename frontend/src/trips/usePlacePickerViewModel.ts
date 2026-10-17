import { useEffect, useState } from 'react';
import { useTrips } from './TripProvider';
import { Place, TripDestination } from './tripModel';

export function usePlacePickerViewModel({
  destination,
}: {
  destination: TripDestination;
  onPick: (place: Place) => void;
  label?: string;
}) {
  const { api, cities } = useTrips();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cityCode = cities.find(
    (city) => city.frontendKey === destination.key || city.code === destination.key.toUpperCase(),
  )?.code;
  useEffect(() => {
    setResults([]);
    setError('');
    setBusy(false);
    if (query.trim().length < 2) return;
    if (!cityCode) {
      setError('Danh mục điểm đến chưa tải được. Bạn vẫn có thể nhập thủ công.');
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const found = await api.searchPlaces(cityCode, query.trim());
        if (active) setResults(found);
      } catch {
        if (active) setError('Không tìm được địa điểm. Bạn vẫn có thể dùng tên nhập thủ công.');
      } finally {
        if (active) setBusy(false);
      }
    }, 450);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, cityCode, api]);
  return { query, setQuery, results, busy, error };
}
