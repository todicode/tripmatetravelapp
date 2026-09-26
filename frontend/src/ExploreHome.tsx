import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, BackHandler, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import rawDestinations from './data/destinations.json';
import ProfileScreen from './ProfileScreen';
import CreateTripScreen from './trips/CreateTripScreen';
import ManageTripsScreen from './trips/ManageTripsScreen';
import TrackTripScreen from './trips/TrackTripScreen';
import { Trip } from './trips/tripModel';
import ChatHome, { useChatSession } from './chat/ChatHome';

type Stop = { name: string; time?: string; note?: string; lat?: number; lng?: number };
type DayPlan = { dayNumber?: number; dayTitle: string; highlight?: string; stops: Stop[] };
type HotSpot = { id: string; name: string; category: string; categoryLabel?: string; note?: string; lat: number; lng: number };
type Destination = {
  name: string; fullName?: string; province?: string; coords: number[]; image?: string;
  dayPlans: DayPlan[]; hotSpots: HotSpot[];
};
type MapMessage = { type: 'city' | 'spot'; key?: string; id?: string };

const destinations = rawDestinations as Record<string, Destination>;
const destinationEntries = Object.entries(destinations);
const popularCities = ['dalat', 'hoian', 'phuquoc', 'sapa', 'nhatrang', 'hagiang'];
const categories = [
  { key: 'all', label: 'Tất cả' },
  { key: 'nature', label: 'Thắng cảnh' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'food', label: 'Ẩm thực' },
  { key: 'culture', label: 'Văn hóa' },
  { key: 'cafe', label: 'Cà phê' },
];
const color = { blue: '#0066cc', ink: '#1d1d1f', muted: '#7a7a7a', border: '#e0e0e0', pale: '#f5f5f7', white: '#ffffff' };

// The native shell keeps the template's layout; Leaflet only draws its Carto/OSM map.
const mapData = JSON.stringify(Object.fromEntries(destinationEntries.map(([key, destination]) => [key, {
  name: destination.name, coords: destination.coords, hotSpots: destination.hotSpots,
}]))).replace(/</g, '\\u003c');
const mapHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{margin:0;width:100%;height:100%;background:#f5f5f7}.leaflet-container{background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.pin{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:20px;border:1px solid #e0e0e0;background:#fff;box-shadow:0 2px 8px #0002;color:#1d1d1f;font-size:11px;font-weight:600;white-space:nowrap}.pin.selected{border-color:#0066cc}.pin .dot{width:7px;height:7px;border-radius:50%;background:#0066cc;flex:none}</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const destinations=${mapData};
const map=L.map('map',{zoomControl:false,attributionControl:false}).setView([16.0544,107.5],6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:18,subdomains:'abcd',attribution:'© OpenStreetMap © CARTO'}).addTo(map);
const cityLayer=L.layerGroup().addTo(map),spotLayer=L.layerGroup().addTo(map);
let routeLayer=null;
function pin(label,selected){const span=document.createElement('span');span.textContent=label;return L.divIcon({html:'<div class="pin'+(selected?' selected':'')+'"><span class="dot"></span>'+span.outerHTML+'</div>',className:'',iconSize:[0,0],iconAnchor:[35,12]});}
function send(message){window.ReactNativeWebView.postMessage(JSON.stringify(message));}
Object.entries(destinations).forEach(([key,d])=>L.marker(d.coords,{icon:pin(d.name,false)}).addTo(cityLayer).on('click',()=>send({type:'city',key})));
window.updateMap=function(payload){spotLayer.clearLayers();if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}if(!payload.key){map.flyTo([16.0544,107.5],6,{duration:0.8});return;}const d=destinations[payload.key];if(!d)return;map.flyTo(d.coords,12,{duration:0.8});d.hotSpots.filter(s=>payload.category==='all'||s.category===payload.category).forEach(s=>{if(s.lat&&s.lng)L.marker([s.lat,s.lng],{icon:pin(s.name,true)}).addTo(spotLayer).on('click',()=>send({type:'spot',id:s.id}));});};
window.focusSpot=function(lat,lng){map.flyTo([lat,lng],14,{duration:0.7});};
window.showRoute=function(points){if(routeLayer)map.removeLayer(routeLayer);routeLayer=L.polyline(points,{color:'#0066cc',weight:5,opacity:0.95}).addTo(map);map.fitBounds(routeLayer.getBounds(),{padding:[30,30]});};
window.addEventListener('resize',()=>setTimeout(()=>map.invalidateSize(),100));
</script></body></html>`;

function Icon({ name, size = 18, tint = color.blue }: { name: keyof typeof MaterialCommunityIcons.glyphMap; size?: number; tint?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={tint} />;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export default function ExploreHome({ user, onLogout }: { user: { displayName: string; email: string }; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'explore' | 'trips' | 'profile' | 'chat'>('explore');
  const chatSession = useChatSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripScreen, setTripScreen] = useState<{ kind: 'create'; cityKey?: string; title?: string } | { kind: 'track'; id: string } | null>(null);
  const [cityKey, setCityKey] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const mapRef = useRef<WebView>(null);
  const mapReady = useRef(false);
  const destination = cityKey ? destinations[cityKey] : null;
  const spots = destination?.hotSpots.filter((spot) => category === 'all' || spot.category === category) ?? [];
  const dayPlans = destination?.dayPlans ?? [];
  const stops = dayPlans.flatMap((day) => day.stops).filter((stop, index, list) => list.findIndex((item) => item.name === stop.name) === index);
  const duration = `${dayPlans.length} ngày${dayPlans.length > 1 ? ` ${dayPlans.length - 1} đêm` : ''}`;
  const matches = useMemo(() => {
    const clean = normalize(query.trim());
    return clean.length >= 2 ? destinationEntries.filter(([, item]) => normalize(`${item.name} ${item.fullName ?? ''}`).includes(clean)).slice(0, 5) : [];
  }, [query]);

  const runMap = (name: string, args: unknown[]) => {
    mapRef.current?.injectJavaScript(`window.${name}&&window.${name}.apply(null,${JSON.stringify(args)});true;`);
  };
  useEffect(() => {
    if (mapReady.current) runMap('updateMap', [{ key: cityKey, category }]);
  }, [cityKey, category]);
  useEffect(() => {
    if (activeTab === 'explore' || tripScreen?.kind === 'create' || (activeTab === 'chat' && !tripScreen)) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tripScreen) setTripScreen(null);
      else setActiveTab('explore');
      return true;
    });
    return () => subscription.remove();
  }, [activeTab, tripScreen]);

  const selectCity = (key: string) => {
    const selected = destinations[key];
    if (!selected) return;
    setCityKey(key);
    setQuery(selected.name);
    setCategory('all');
    setSearchFocused(false);
  };
  const reset = () => {
    setCityKey(null);
    setQuery('');
    setCategory('all');
    setSearchFocused(false);
    setShowPlan(false);
  };
  const focusSpot = (spot: HotSpot) => {
    runMap('focusSpot', [spot.lat, spot.lng]);
  };
  const onMapMessage = (raw: string) => {
    try {
      const message = JSON.parse(raw) as MapMessage;
      if (message.type === 'city' && message.key) selectCity(message.key);
      if (message.type === 'spot' && message.id) {
        const spot = destination?.hotSpots.find((item) => item.id === message.id);
        if (spot) focusSpot(spot);
      }
    } catch { /* Ignore messages outside the map protocol. */ }
  };
  const previewRoad = async () => {
    const points = stops.filter((stop) => typeof stop.lat === 'number' && typeof stop.lng === 'number');
    if (points.length < 2) return Alert.alert('Chưa có tuyến đường', 'Lịch trình cần ít nhất hai điểm có tọa độ.');
    setRouteBusy(true);
    try {
      const coordinates = points.map((stop) => `${stop.lng},${stop.lat}`).join(';');
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error('route request failed');
      const result = await response.json() as { routes?: { geometry: { coordinates: [number, number][] } }[] };
      const route = result.routes?.[0]?.geometry.coordinates;
      if (!route?.length) throw new Error('route unavailable');
      setShowPlan(false);
      setTimeout(() => runMap('showRoute', [route.map(([lng, lat]) => [lat, lng])]), 250);
    } catch {
      Alert.alert('Không tải được tuyến đường', 'Vui lòng thử lại khi có kết nối mạng.');
    } finally { setRouteBusy(false); }
  };

  const openCreate = (selectedCityKey?: string, title?: string) => {
    setShowPlan(false);
    setActiveTab('trips');
    setTripScreen({ kind: 'create', cityKey: selectedCityKey, title });
  };
  if (tripScreen?.kind === 'create') return <CreateTripScreen initialCityKey={tripScreen.cityKey} initialTitle={tripScreen.title} onBack={() => setTripScreen(null)} onSave={(trip) => {
    setTrips((current) => [trip, ...current]);
    setTripScreen({ kind: 'track', id: trip.id });
  }} />;
  if (tripScreen?.kind === 'track') {
    const trip = trips.find((item) => item.id === tripScreen.id);
    if (trip) return <TrackTripScreen trip={trip} onBack={() => setTripScreen(null)} onUpdate={(updated) => setTrips((current) => current.map((item) => item.id === updated.id ? updated : item))} />;
  }

  return <View style={styles.root}>
    {activeTab === 'chat' ? <ChatHome session={chatSession} user={user} trips={trips} onExit={() => setActiveTab('explore')} onTrip={(id) => setTripScreen({ kind: 'track', id })} /> : activeTab === 'profile' ? <ProfileScreen user={user} onExplore={() => setActiveTab('explore')} onTrips={() => setActiveTab('trips')} onLogout={onLogout} /> : activeTab === 'trips' ? <ManageTripsScreen trips={trips} onCreate={() => openCreate()} onTrack={(id) => setTripScreen({ kind: 'track', id })} /> : <>
    <View style={[styles.mapWrap, destination ? styles.mapSelected : styles.mapOverview]}>
      <WebView ref={mapRef} source={{ html: mapHtml, baseUrl: 'https://unpkg.com' }} originWhitelist={['*']}
        javaScriptEnabled domStorageEnabled scrollEnabled={false} style={styles.map}
        onLoadEnd={() => { mapReady.current = true; runMap('updateMap', [{ key: cityKey, category }]); }}
        onMessage={(event) => onMapMessage(event.nativeEvent.data)} />
      <View style={styles.mapHeader} pointerEvents="box-none">
        <View style={styles.mapPill}><Icon name="navigation-variant-outline" size={14} /><Text style={styles.mapPillText}>{destination?.name ?? 'Toàn cảnh Việt Nam'}</Text>
          {destination && <Pressable onPress={reset} style={styles.mapReset}><Text style={styles.blueSmall}>Về toàn cảnh</Text></Pressable>}</View>
        <View style={styles.mapPill}><Icon name="compass-outline" size={13} /><Text style={styles.osmText}>OpenStreetMap</Text></View>
      </View>
      <View style={styles.mapHint}><Text style={styles.hintText}>{destination ? 'Bản đồ địa điểm du lịch OpenStreetMap' : 'Chạm ghim trên bản đồ để khám phá'}</Text></View>
      <View style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap · CARTO</Text></View>
    </View>

    <View style={[styles.sheet, destination && styles.sheetSelected]}>
      <View style={[styles.searchWrap, destination && styles.searchSelected]}>
        <View style={styles.searchField}><Icon name="magnify" size={19} tint={color.muted} />
          <TextInput value={query} onChangeText={setQuery} onFocus={() => setSearchFocused(true)}
            placeholder="Tìm kiếm tỉnh thành để xem gợi ý lộ trình..." placeholderTextColor={color.muted}
            style={styles.searchInput} autoCapitalize="none" returnKeyType="search" accessibilityLabel="Tìm điểm đến" />
          {query.length > 0 && <Pressable onPress={reset} accessibilityLabel="Xóa tìm kiếm"><Icon name="close" size={17} tint={color.muted} /></Pressable>}
        </View>
        {searchFocused && matches.length > 0 && <View style={styles.results}>{matches.map(([key, item]) => <Pressable key={key} style={styles.result} onPress={() => selectCity(key)}>
          <View style={styles.grow}><Text style={styles.resultName}>{item.name}</Text><Text style={styles.subText} numberOfLines={1}>{item.fullName ?? item.province}</Text></View><Text style={styles.blueSmall}>Khám phá</Text>
        </Pressable>)}</View>}
      </View>

      {!destination ? <View style={styles.suggestions}>
        <View style={styles.rowBetween}><Text style={styles.label}>Điểm đến nổi tiếng</Text><Text style={styles.label}>Chạm để khám phá</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>{popularCities.map((key) => <Pressable key={key} style={styles.chip} onPress={() => selectCity(key)}><Text style={styles.chipText}>{destinations[key].name}</Text></Pressable>)}</ScrollView>
      </View> : <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.rowBetween}><View style={styles.grow}><Text style={styles.sectionTitle}>Khám phá {destination.name}</Text><Text style={styles.subText}>Địa điểm nổi bật và gợi ý hành trình trọn vẹn</Text></View><Pressable onPress={reset}><Text style={styles.blueSmall}>Đóng</Text></Pressable></View>
        {dayPlans.length > 0 && <Pressable style={styles.tripCard} onPress={() => setShowPlan(true)}>
          <View style={styles.tripIcon}><Icon name="navigation-variant-outline" size={23} tint={color.white} /></View>
          <View style={styles.grow}><View style={styles.tripMeta}><Text style={styles.tripBadge}>LỊCH TRÌNH ĐỀ XUẤT</Text><Text style={styles.tripDuration}>• {duration}</Text></View>
            <Text style={styles.tripTitle} numberOfLines={1}>Xem lịch trình toàn cảnh {destination.name}</Text><Text style={styles.tripSub}>{stops.length} điểm dừng • Gom gọn toàn bộ {dayPlans.length} ngày</Text></View>
          <Icon name="chevron-right" size={22} tint={color.white} />
        </Pressable>}
        <View style={styles.hotHeading}><View style={styles.grow}><Text style={styles.hotTitle}>Địa điểm hot tại {destination.name}</Text><Text style={styles.subText}>Check-in, danh lam thắng cảnh và ẩm thực nổi tiếng</Text></View><Text style={styles.count}>{spots.length} địa điểm</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>{categories.map((item) => <Pressable key={item.key} style={[styles.filterChip, category === item.key && styles.filterActive]} onPress={() => setCategory(item.key)}><Text style={[styles.filterText, category === item.key && styles.filterTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
        {destination.hotSpots.length === 0 && <Text style={styles.subText}>Chưa có gợi ý địa điểm cho {destination.name}.</Text>}
        {spots.map((spot) => <Pressable key={spot.id} style={styles.spotCard} onPress={() => focusSpot(spot)}>
          <View style={styles.spotIcon}><Icon name="map-marker-outline" size={22} /></View><View style={styles.grow}><View style={styles.spotTitleRow}><Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text><Text style={styles.spotCategory}>{spot.categoryLabel ?? spot.category}</Text></View><Text style={styles.spotNote} numberOfLines={1}>{spot.note}</Text></View><Text style={styles.spotAction}>Xem vị trí</Text>
        </Pressable>)}
      </ScrollView>}
    </View>
    </>}

    <View style={styles.bottomNav}>{[
      { label: 'Khám phá', icon: 'compass-outline' as const, action: () => setActiveTab('explore'), active: activeTab === 'explore' },
      { label: 'Chuyến đi', icon: 'map-outline' as const, action: () => setActiveTab('trips'), active: activeTab === 'trips' },
      { label: 'Tin nhắn', icon: 'message-outline' as const, action: () => setActiveTab('chat'), active: activeTab === 'chat' },
      { label: 'Cá nhân', icon: 'account-outline' as const, action: () => setActiveTab('profile'), active: activeTab === 'profile' },
    ].map((tab) => <Pressable key={tab.label} style={styles.navItem} onPress={tab.action} accessibilityRole="tab" accessibilityState={{ selected: tab.active }}><Icon name={tab.icon} size={22} tint={tab.active ? color.blue : color.muted} /><Text style={[styles.navLabel, tab.active && styles.navActive]}>{tab.label}</Text></Pressable>)}</View>

    <Modal visible={showPlan && !!destination} transparent animationType="slide" onRequestClose={() => setShowPlan(false)}><View style={styles.modalBackdrop}><Pressable style={styles.backdropTouch} onPress={() => setShowPlan(false)} /><View style={styles.modalSheet}>
      <View style={styles.handle} /><View style={styles.modalHeader}><View style={styles.grow}><Text style={styles.modalMeta}>{destination?.name}  •  {duration}  •  {stops.length} điểm dừng</Text><Text style={styles.modalTitle}>Lịch trình toàn cảnh {destination?.name} ({duration})</Text></View><Pressable style={styles.closeButton} onPress={() => setShowPlan(false)}><Icon name="close" size={18} tint={color.muted} /></Pressable></View>
      {destination?.image && <ImageBackground source={{ uri: destination.image }} style={styles.preview} imageStyle={styles.previewImage}><View style={styles.previewOverlay}><Text style={styles.previewText} numberOfLines={2}>{dayPlans.map((day) => day.highlight || day.dayTitle).join(' • ')}</Text></View></ImageBackground>}
      <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}><View style={styles.rowBetween}><Text style={styles.timelineHeading}>CHI TIẾT LỊCH TRÌNH THEO NGÀY</Text><Text style={styles.blueSmall}>{dayPlans.length} ngày trọn gói</Text></View>{dayPlans.map((day, index) => <View key={index} style={styles.dayCard}><View style={styles.dayHeader}><Text style={styles.dayBadge}>Ngày {day.dayNumber ?? index + 1}</Text><Text style={styles.dayTitle} numberOfLines={1}>{day.dayTitle}</Text><Text style={styles.dayCount}>{day.stops.length} trạm</Text></View>{day.highlight && <Text style={styles.dayHighlight}>{day.highlight}</Text>}{day.stops.map((stop, stopIndex) => <View key={`${stop.name}-${stopIndex}`} style={styles.stop}><View style={styles.stopDot} /><View style={styles.grow}><Text style={styles.stopName}>{stop.name}</Text>{stop.note && <Text style={styles.stopNote}>{stop.note}</Text>}</View><Text style={styles.stopTime}>{stop.time ?? '09:00'}</Text></View>)}</View>)}</ScrollView>
      <View style={styles.modalActions}><Pressable style={styles.routeButton} onPress={previewRoad} disabled={routeBusy}><Icon name="eye-outline" size={16} /><Text style={styles.routeText}>{routeBusy ? 'Đang vẽ...' : 'Xem đường bộ'}</Text></Pressable><Pressable style={styles.createButton} onPress={() => openCreate(cityKey ?? undefined, `Khám phá ${destination?.name ?? ''}`)}><Icon name="plus" size={16} tint={color.white} /><Text style={styles.createText}>Tạo chuyến đi này</Text></Pressable></View>
    </View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.white }, mapWrap: { backgroundColor: color.pale, position: 'relative' }, mapOverview: { flex: 1 }, mapSelected: { height: '42%', minHeight: 200 }, map: { flex: 1, backgroundColor: color.pale },
  mapHeader: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, mapPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: color.border, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 7, elevation: 2 }, mapPillText: { fontSize: 12, fontWeight: '600', color: color.ink }, osmText: { fontSize: 10, fontWeight: '600', color: color.blue }, mapReset: { borderLeftWidth: 1, borderColor: color.border, paddingLeft: 6, marginLeft: 3 }, blueSmall: { fontSize: 11, fontWeight: '600', color: color.blue }, mapHint: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.94)', borderColor: color.border, borderWidth: 1, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5 }, hintText: { fontSize: 10, color: color.muted }, attribution: { position: 'absolute', bottom: 2, right: 3, backgroundColor: '#ffffffcc', paddingHorizontal: 3 }, attributionText: { color: color.muted, fontSize: 8 },
  sheet: { backgroundColor: color.white, borderTopWidth: 1, borderColor: color.border, padding: 12 }, sheetSelected: { flex: 1, padding: 0 }, searchWrap: { zIndex: 5 }, searchSelected: { padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }, searchField: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: color.border, borderRadius: 25, backgroundColor: color.pale, paddingHorizontal: 12 }, searchInput: { flex: 1, padding: 0, fontSize: 12, color: color.ink }, results: { position: 'absolute', bottom: 42, left: 0, right: 0, backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 16, elevation: 8, overflow: 'hidden' }, result: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' }, resultName: { fontSize: 12, fontWeight: '600', color: color.ink }, grow: { flex: 1, minWidth: 0 }, subText: { fontSize: 11, color: color.muted }, suggestions: { marginTop: 10, gap: 6 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, label: { fontSize: 11, color: color.muted }, chipList: { gap: 6, paddingVertical: 2 }, chip: { borderRadius: 30, borderWidth: 1, borderColor: color.border, backgroundColor: color.pale, paddingHorizontal: 12, paddingVertical: 6 }, chipText: { fontSize: 11, fontWeight: '500', color: color.ink },
  details: { flex: 1 }, detailsContent: { padding: 12, paddingTop: 8, gap: 12, paddingBottom: 20 }, sectionTitle: { fontSize: 14, fontWeight: '600', color: color.ink }, tripCard: { backgroundColor: color.blue, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, tripIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' }, tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 }, tripBadge: { color: color.white, backgroundColor: '#ffffff33', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontWeight: '700' }, tripDuration: { fontSize: 10, color: '#ffffffdd' }, tripTitle: { color: color.white, fontSize: 13, fontWeight: '600', marginTop: 3 }, tripSub: { color: '#ffffffcc', fontSize: 11, marginTop: 2 }, hotHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }, hotTitle: { fontSize: 13, fontWeight: '600', color: color.ink }, count: { color: color.blue, backgroundColor: color.pale, borderWidth: 1, borderColor: color.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '600' }, filterChip: { backgroundColor: color.pale, borderWidth: 1, borderColor: color.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }, filterActive: { backgroundColor: color.blue, borderColor: color.blue }, filterText: { fontSize: 10, fontWeight: '500', color: color.muted }, filterTextActive: { color: color.white }, spotCard: { borderWidth: 1, borderColor: color.border, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, spotIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: color.border, backgroundColor: color.pale, alignItems: 'center', justifyContent: 'center' }, spotTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, spotName: { flexShrink: 1, color: color.ink, fontSize: 13, fontWeight: '600' }, spotCategory: { color: color.blue, backgroundColor: '#e8f2fc', fontSize: 9, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }, spotNote: { color: color.muted, fontSize: 11, marginTop: 3 }, spotAction: { color: color.blue, backgroundColor: color.pale, borderColor: color.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: '600' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: color.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: color.white }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2 }, navLabel: { fontSize: 10, color: color.muted }, navActive: { color: color.blue, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' }, backdropTouch: { flex: 1 }, modalSheet: { height: '85%', backgroundColor: color.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, gap: 12 }, handle: { width: 40, height: 4, borderRadius: 3, backgroundColor: '#d2d2d7', alignSelf: 'center' }, modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, modalMeta: { color: color.blue, fontSize: 10, fontWeight: '600' }, modalTitle: { color: color.ink, fontSize: 15, fontWeight: '600', marginTop: 5 }, closeButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.pale, alignItems: 'center', justifyContent: 'center' }, preview: { height: 112, justifyContent: 'flex-end' }, previewImage: { borderRadius: 16 }, previewOverlay: { backgroundColor: '#1d1d1faa', padding: 10, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }, previewText: { color: color.white, fontSize: 11 }, timeline: { flex: 1 }, timelineContent: { gap: 10, paddingBottom: 10 }, timelineHeading: { fontSize: 10, fontWeight: '600', color: color.muted }, dayCard: { backgroundColor: color.pale, borderWidth: 1, borderColor: color.border, borderRadius: 12, padding: 12, gap: 7 }, dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dayBadge: { color: color.white, backgroundColor: color.blue, fontSize: 9, fontWeight: '700', borderRadius: 20, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 }, dayTitle: { flex: 1, color: color.ink, fontSize: 12, fontWeight: '600' }, dayCount: { color: color.muted, fontSize: 10 }, dayHighlight: { fontSize: 10, color: color.muted }, stop: { borderLeftWidth: 2, borderColor: '#b8d9f4', marginLeft: 8, paddingLeft: 14, paddingBottom: 8, flexDirection: 'row', gap: 6 }, stopDot: { position: 'absolute', left: -5, top: 3, width: 9, height: 9, borderRadius: 5, backgroundColor: color.blue, borderWidth: 1, borderColor: color.white }, stopName: { color: color.ink, fontSize: 11, fontWeight: '600' }, stopNote: { color: color.muted, fontSize: 10, marginTop: 2 }, stopTime: { color: color.muted, fontSize: 10 }, modalActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 10 }, routeButton: { flex: 1, height: 40, borderRadius: 25, borderWidth: 1, borderColor: color.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, routeText: { fontSize: 12, color: color.blue, fontWeight: '600' }, createButton: { flex: 1, height: 40, borderRadius: 25, backgroundColor: color.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, createText: { color: color.white, fontSize: 12, fontWeight: '600' },
});
