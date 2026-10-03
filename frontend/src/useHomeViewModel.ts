import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeId, normalizeName, Place, SavedPlaceList, Trip } from './trips/tripModel';
import { useChatSession } from './chat/useChatSession';
import { AuthorizedRequest, RealtimeCredentials } from './auth/session';
import { parseSavedLists } from './savedPlacesModel';

export function useHomeViewModel({ user, notify, request, realtimeCredentials }: { user: { id: string; displayName: string; email: string }; notify: typeof Alert.alert; request: AuthorizedRequest; realtimeCredentials: RealtimeCredentials }) {
  const [tab, setTab] = useState<'explore' | 'trips' | 'chat' | 'profile'>('explore');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [lists, setLists] = useState<SavedPlaceList[]>([]);
  const [listsReady, setListsReady] = useState(false);
  const writes = useRef(Promise.resolve());
  const listKey = `tripmate_saved_places:${user.email.toLowerCase()}`;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(listKey).then(raw => {
      if (!active || !raw) return;
      setLists(parseSavedLists(raw));
    }).catch(() => notify('Không đọc được danh sách đã lưu', 'Vui lòng thử mở lại ứng dụng.')).finally(() => { if (active) setListsReady(true); });
    return () => { active = false; };
  }, [listKey]);
  const changeLists = (next: SavedPlaceList[]) => {
    if (!listsReady) return;
    setLists(next);
    writes.current = writes.current.then(() => AsyncStorage.setItem(listKey, JSON.stringify(next))).catch(() => notify('Chưa lưu được danh sách', 'Thay đổi vẫn còn trong phiên hiện tại.'));
  };
  const savePlace = (place: Place) => {
    if (!listsReady) return notify('Đang tải danh sách', 'Vui lòng thử lại sau.');
    if (lists.some(list => list.places.some(item => normalizeName(item.name) === normalizeName(place.name)))) return notify('Địa điểm đã được lưu');
    const saved = lists.find(list => list.id === 'saved_places');
    const entry = { ...place, id: makeId() };
    changeLists(saved ? lists.map(list => list.id === saved.id ? { ...list, places: [...list.places, entry] } : list) : [...lists, { id: 'saved_places', name: 'Địa điểm đã lưu', places: [entry], destination: { key: 'saved_places', name: 'Địa điểm đã lưu', coords: typeof place.lat === 'number' && typeof place.lng === 'number' ? [place.lat, place.lng] : [16.0544, 108.2022], hotSpots: [], dayPlans: [] } }]);
    notify('Đã lưu địa điểm', place.name);
  };
  const [route, setRoute] = useState<{ kind: 'create'; cityKey?: string } | { kind: 'trip'; id: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const [exploreAction, setExploreAction] = useState<'list' | 'lists' | 'place'>();
  const [profileDetail, setProfileDetail] = useState(false);
  const chat = useChatSession(request, user.id, tab === 'chat' && route === null, realtimeCredentials);
  const openCreate = (cityKey?: string) => { setMenu(false); setRoute({ kind: 'create', cityKey }); };
  useEffect(() => { if (route?.kind === 'create' || tab === 'chat' || (tab === 'profile' && profileDetail)) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (route) setRoute(null); else if (tab !== 'explore') setTab('explore'); else return false; return true; }); return () => sub.remove(); }, [route, tab, profileDetail]);
  return { tab, setTab, trips, setTrips, lists, route, setRoute, menu, setMenu, exploreAction, setExploreAction, profileDetail, setProfileDetail, chat, openCreate, changeLists, savePlace };
}
