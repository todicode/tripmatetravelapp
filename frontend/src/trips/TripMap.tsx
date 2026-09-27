import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { TripStop } from './tripModel';
import { useTripUi } from './tripUi';
import { useAppTheme } from '../theme/AppTheme';

const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;background:#f5f5f7}.pin{width:20px;height:20px;border:2px solid white;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font:700 10px sans-serif;box-shadow:0 1px 5px #0003}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="window.ReactNativeWebView.postMessage('map-error')"></script><script>
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([16.0544,108.2022],12);
const tiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:18,attribution:'© OpenStreetMap © CARTO'}).addTo(map);
window.setTheme=function(dark){tiles.setUrl('https://{s}.basemaps.cartocdn.com/'+(dark?'dark_all':'light_all')+'/{z}/{x}/{y}{r}.png');document.body.style.background=dark?'#191b20':'#f5f5f7';};
const markers=L.layerGroup().addTo(map);let route=null,version=0,controller=null,cachedKey='',cachedLine=null;
function drawRoute(line){route=L.polyline(line,{color:'#0066cc',weight:4}).addTo(map);}
window.setTrip=function(data){
  markers.clearLayers();if(route){map.removeLayer(route);route=null;}
  const points=[];
  data.stops.forEach((stop,index)=>{
    if(typeof stop.lat!=='number'||typeof stop.lng!=='number')return;
    points.push([stop.lat,stop.lng]);
    const color=data.routeEnabled===false?'#ff3b30':stop.status==='completed'?'#34c759':stop.status==='active'?'#0066cc':'#7a7a7a';
    L.marker([stop.lat,stop.lng],{icon:L.divIcon({html:'<div class="pin" style="background:'+color+'">'+(data.routeEnabled===false?'':index+1)+'</div>',className:'',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(markers).on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'stop',id:stop.id})));
  });
  if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[25,25]});else map.setView(points[0]||data.coords,points.length ? 13 : data.initialZoom||13);
  if(data.focus&&typeof data.focus.lat==='number'&&typeof data.focus.lng==='number'){map.setView([data.focus.lat,data.focus.lng],15);if(data.focus.id==='position')L.circleMarker([data.focus.lat,data.focus.lng],{radius:7,color:'white',weight:2,fillColor:'#0066cc',fillOpacity:1}).addTo(markers);}
  const request=++version;if(controller)controller.abort();
  if(data.routeEnabled===false||points.length<2){window.ReactNativeWebView.postMessage('ready');return;}
  const key=JSON.stringify(points);
  if(key===cachedKey&&cachedLine){drawRoute(cachedLine);window.ReactNativeWebView.postMessage('ready');return;}
  const aborter=new AbortController();controller=aborter;
  const timeout=setTimeout(()=>aborter.abort(),10000);
  fetch('https://router.project-osrm.org/route/v1/driving/'+points.map(p=>p[1]+','+p[0]).join(';')+'?overview=full&geometries=geojson',{signal:aborter.signal})
    .then(r=>{if(!r.ok)throw Error();return r.json();})
    .then(data=>{if(request!==version)return;const line=data.routes&&data.routes[0];if(!line)throw Error();cachedKey=key;cachedLine=line.geometry.coordinates.map(p=>[p[1],p[0]]);drawRoute(cachedLine);window.ReactNativeWebView.postMessage('ready');})
    .catch(()=>{if(request===version)window.ReactNativeWebView.postMessage('route-error');})
    .finally(()=>clearTimeout(timeout));
};
window.addEventListener('resize',()=>map.invalidateSize());window.ReactNativeWebView.postMessage('loaded');
window.focusStop=function(lat,lng){map.setView([lat,lng],15);};
</script></body></html>`;

export default function TripMap({ coords, stops, height = 176, label, rounded = true, focusedStop, onSelect, routeEnabled = true, initialZoom = 13, showLabel = true }: { coords: number[]; stops: TripStop[]; height?: number; label?: string; rounded?: boolean; focusedStop?: TripStop | null; onSelect?: (id: string) => void; routeEnabled?: boolean; initialZoom?: number; showLabel?: boolean }) {
  const { c, s } = useTripUi();
  const { mode } = useAppTheme();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const [routeError, setRouteError] = useState(false);
  const [mapError, setMapError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => { if (!ready.current) setMapError(true); }, 12000);
    return () => clearTimeout(timer);
  }, []);
  const update = () => {
    setRouteError(false);
    const payload = JSON.stringify({ coords, stops, routeEnabled, initialZoom, focus: focusedStop }).replace(/</g, '\\u003c');
    ref.current?.injectJavaScript(`window.setTheme&&window.setTheme(${mode === 'dark'});window.setTrip&&window.setTrip(${payload});true;`);
  };
  useEffect(() => { if (ready.current) update(); }, [coords, stops, routeEnabled, initialZoom, mode]);
  useEffect(() => { if (focusedStop && typeof focusedStop.lat === 'number' && typeof focusedStop.lng === 'number') ref.current?.injectJavaScript(`window.focusStop&&window.focusStop(${focusedStop.lat},${focusedStop.lng});true;`); }, [focusedStop]);
  return <View style={{ height, borderRadius: rounded ? 16 : 0, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
    <WebView ref={ref} source={{ html, baseUrl: 'https://unpkg.com' }} originWhitelist={['*']} scrollEnabled={false}
      onError={() => setMapError(true)} onMessage={(event) => {
        if (event.nativeEvent.data === 'loaded') { ready.current = true; setMapError(false); update(); }
        if (event.nativeEvent.data === 'map-error') setMapError(true);
        if (event.nativeEvent.data === 'route-error') setRouteError(true);
        try { const message = JSON.parse(event.nativeEvent.data); if (message.type === 'stop') onSelect?.(String(message.id)); } catch {}
      }} />
    {showLabel && <View pointerEvents="none" style={{ position: 'absolute', bottom: 28, left: 8, right: 8, alignItems: 'flex-start' }}><Text style={[s.badge, { backgroundColor: c.white }]}>{mapError ? 'Không tải được bản đồ' : routeError ? 'Chưa tải được đường bộ • đang hiển thị vị trí các trạm' : label ?? `Lộ trình đường bộ OSRM • ${stops.length} trạm`}</Text></View>}
  </View>;
}
