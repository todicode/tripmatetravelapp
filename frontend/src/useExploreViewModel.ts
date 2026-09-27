import { useEffect, useState } from 'react';
import type { Alert } from 'react-native';
import * as Location from 'expo-location';
import { searchPlaces } from './trips/destinations';
import { makeId, normalizeName, Place, TripDestination, SavedPlaceList } from './trips/tripModel';
const country: TripDestination = { key: 'vietnam', name: 'Vi\u1ec7t Nam', coords: [16.0544, 108.2022], dayPlans: [], hotSpots: [] };
export function useExploreViewModel({ notify, lists, onListsChange, onCreate, onProfile, action, onActionHandled }: { notify: typeof Alert.alert; lists: SavedPlaceList[]; onListsChange: (lists: SavedPlaceList[]) => void; onCreate: (cityKey?: string) => void; onProfile: () => void; action?: 'list' | 'lists' | 'place'; onActionHandled: () => void }) {
  const [filter, setFilter] = useState('all'); const [collapsed, setCollapsed] = useState(false); const [search, setSearch] = useState(false); const [query, setQuery] = useState(''); const [results, setResults] = useState<Place[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [selected, setSelected] = useState<Place | null>(null); const [newList, setNewList] = useState(false); const [listName, setListName] = useState(''); const [listError, setListError] = useState(''); const [savingPlace, setSavingPlace] = useState<Place | null>(null);
  const [mapHeight, setMapHeight] = useState(300);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [listSelection, setListSelection] = useState<string[]>([]);
  const [mapFocus, setMapFocus] = useState<Place | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [position, setPosition] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { notify('Chưa có quyền vị trí', 'Bạn có thể cấp quyền vị trí cho TripMate trong cài đặt thiết bị.'); return; }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentPosition = { id: 'position', name: 'Vị trí của bạn', lat: result.coords.latitude, lng: result.coords.longitude }; setPosition(currentPosition); setMapFocus(currentPosition);
    } catch { notify('Không lấy được vị trí', 'Kiểm tra GPS và thử lại.'); }
    finally { setLocating(false); }
  };
  useEffect(() => { if (action === 'list') { setFilter('lists'); setNewList(true); } else if (action === 'lists') { setSearch(false); setFilter('lists'); setCollapsed(false); } else if (action === 'place') setAddOpen(true); if (action) onActionHandled(); }, [action]);
  useEffect(() => { setResults([]); setError(''); setBusy(false); if (query.trim().length < 2) return; const controller = new AbortController(); let active = true; const timer = setTimeout(async () => { setBusy(true); const timeout = setTimeout(() => controller.abort(), 10000); try { const found = await searchPlaces(query, country, controller.signal); if (active) setResults(found); } catch { if (active) setError('Không tìm được địa điểm. Vui lòng thử lại.'); } finally { clearTimeout(timeout); if (active) setBusy(false); } }, 450); return () => { active = false; clearTimeout(timer); controller.abort(); }; }, [query]);
  const allPlaces = lists.flatMap(list => list.places);
  const distance = (place: Place) => { if (!position || typeof place.lat !== 'number' || typeof place.lng !== 'number') return Infinity; const rad = Math.PI / 180; const a = Math.sin((place.lat - position.lat!) * rad / 2) ** 2 + Math.cos(position.lat! * rad) * Math.cos(place.lat * rad) * Math.sin((place.lng - position.lng!) * rad / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };
  const nearby = allPlaces.filter(place => distance(place) <= 50).sort((a, b) => distance(a) - distance(b));
  const mapStops = allPlaces.map((place, index) => ({ ...place, id: String(place.id ?? index), status: 'pending' as const, time: '' }));
  const createList = () => { if (!listName.trim()) return setListError('Vui lòng nhập tên danh sách.'); if (lists.some(list => normalizeName(list.name) === normalizeName(listName))) return setListError('Tên danh sách đã tồn tại.'); const places = savingPlace ? [{ ...savingPlace, id: makeId() }] : allPlaces.filter(place => listSelection.includes(String(place.id))); const first = places[0]; const destination = first ? { ...country, key: `saved_${makeId()}`, name: listName.trim(), coords: typeof first.lat === 'number' && typeof first.lng === 'number' ? [first.lat, first.lng] : country.coords } : country; onListsChange([...lists, { id: makeId(), name: listName.trim(), destination, places }]); setNewList(false); setListName(''); setListError(''); setSavingPlace(null); setSelected(null); setFilter('lists'); setListSelection([]); };
  const savePlace = (list: SavedPlaceList) => { if (!savingPlace) return; if (list.places.some(place => normalizeName(place.name) === normalizeName(savingPlace.name))) return notify('Địa điểm đã có trong danh sách'); onListsChange(lists.map(item => item.id === list.id ? { ...item, places: [...item.places, { ...savingPlace, id: makeId() }] } : item)); setSavingPlace(null); setSelected(null); setFilter('lists'); };
  return { addOpen, setAddOpen, selectedList, setSelectedList, listSelection, setListSelection, mapFocus, setMapFocus, recenter, setRecenter, filter, setFilter, collapsed, setCollapsed, search, setSearch, query, setQuery, results, busy, error, selected, setSelected, newList, setNewList, listName, setListName, listError, savingPlace, setSavingPlace, mapHeight, setMapHeight, position, locating, locate, allPlaces, mapStops, nearby, distance, createList, savePlace };
}
