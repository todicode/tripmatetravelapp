import { useHomeViewModel } from './useHomeViewModel';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import ProfileScreen from './ProfileScreen';
import ExploreScreen from './ExploreScreen';
import ChatHome from './chat/ChatHome';
import ManageTripsScreen from './trips/ManageTripsScreen';
import TripSetupScreen, { SavedPlaceList } from './trips/TripSetupScreen';
import TrackTripScreen from './trips/TrackTripScreen';
import { Trip } from './trips/tripModel';
import { Icon, useTripUi } from './trips/tripUi';
import CreateMenu from './CreateMenu';
import { useToast } from './theme/Toast';
import ScreenTransition from './theme/ScreenTransition';
import { useProfileState } from './profile/ProfileProvider';
import { AuthorizedRequest, RealtimeCredentials } from './auth/session';

export default function ExploreHome({ onLogout, onChangePassword, request, realtimeCredentials }: { onLogout: () => void; onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>; request: AuthorizedRequest; realtimeCredentials: RealtimeCredentials }) {
  const { user } = useProfileState();
  const { c, s } = useTripUi();
  const toast = useToast();
  const { tab, setTab, trips, setTrips, lists, route, setRoute, menu, setMenu, exploreAction, setExploreAction, profileDetail, setProfileDetail, chat, openCreate, changeLists, savePlace } = useHomeViewModel({ user, notify: toast, request, realtimeCredentials });
  if (route?.kind === 'create') return <ScreenTransition key="create" duration={320} slide><TripSetupScreen initialCityKey={route.cityKey} lists={lists} onBack={() => setRoute(null)} onSave={trip => { setTrips(current => [trip, ...current]); setTab('trips'); setRoute({ kind: 'trip', id: trip.id }); }} /></ScreenTransition>;
  if (route?.kind === 'trip') {
    const trip = trips.find(item => item.id === route.id);
    if (trip) {
      return <ScreenTransition key={trip.id} duration={320} slide><TrackTripScreen onSavePlace={savePlace} trip={trip} companions={chat.friends} onBack={() => setRoute(null)} onUpdate={updated => setTrips(current => current.map(item => item.id === updated.id ? updated : item))} /></ScreenTransition>;
    }
  }
  const hideTabs = (tab === 'chat' && chat.routes.length > 0) || (tab === 'profile' && profileDetail);
  return <View style={s.screen}>
    <ScreenTransition key={tab}>{tab === 'explore' ? <ExploreScreen lists={lists} onListsChange={changeLists} onCreate={openCreate} onProfile={() => setTab('profile')} action={exploreAction} onActionHandled={() => setExploreAction(undefined)} /> : tab === 'trips' ? <ManageTripsScreen trips={trips} onTrack={id => setRoute({ kind: 'trip', id })} /> : tab === 'chat' ? <ChatHome session={chat} user={user} trips={trips} onExit={() => setTab('explore')} onTrip={id => setRoute({ kind: 'trip', id })} /> : <ProfileScreen requestsCount={chat.requests.filter(item => item.direction === 'received').length} user={user} onTrips={() => setTab('trips')} onLogout={onLogout} onChangePassword={onChangePassword} onRequests={() => { chat.push({ kind: 'requests' }); setTab('chat'); }} onDetailChange={setProfileDetail} onSavedPlaces={() => { setTab('explore'); setExploreAction('lists'); }} />}</ScreenTransition>
    {!hideTabs && <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: c.border, backgroundColor: c.chrome, paddingVertical: 4 }}>
      {([{ key: 'explore', label: 'Khám phá', icon: 'compass-outline' }, { key: 'trips', label: 'Chuyến đi', icon: 'map-marker-path' }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={{ flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', gap: 4 }}><Icon name={item.icon} size={22} color={tab === item.key ? c.blue : c.muted} /><Text style={{ color: tab === item.key ? c.blue : c.muted, fontSize: 11 }}>{item.label}</Text></Pressable>)}
      <View style={{ flex: 1 }}><Pressable accessibilityLabel="Tạo mới" onPress={() => setMenu(true)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.createButton, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}><Icon name={menu ? 'close' : 'plus'} size={20} color={c.onBlue} /></Pressable></View>
      {([{ key: 'chat', label: 'Tin nhắn', icon: 'message-outline' }, { key: 'profile', label: 'Cá nhân', icon: 'account-outline' }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={{ flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', gap: 4 }}><Icon name={item.icon} size={22} color={tab === item.key ? c.blue : c.muted} /><Text style={{ color: tab === item.key ? c.blue : c.muted, fontSize: 11 }}>{item.label}</Text></Pressable>)}
    </View>}
    <CreateMenu visible={menu} onClose={() => setMenu(false)} onTrip={() => openCreate()} onList={() => { setMenu(false); setTab('explore'); setExploreAction('list'); }} onPlace={() => { setMenu(false); setTab('explore'); setExploreAction('place'); }} />
  </View>;
}
