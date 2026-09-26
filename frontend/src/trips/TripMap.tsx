import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { TripStop } from './tripModel';
import { c, s } from './tripUi';

const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;background:#f5f5f7}.pin{width:20px;height:20px;border:2px solid white;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font:700 10px sans-serif;box-shadow:0 1px 5px #0003}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="window.ReactNativeWebView.postMessage('map-error')"></script><script>
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([16.0544,108.2022],12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:18,attribution:'© OpenStreetMap © CARTO'}).addTo(map);
const markers=L.layerGroup().addTo(map);let route=null,version=0,controller=null,cachedKey='',cachedLine=null;
function drawRoute(line){route=L.polyline(line,{color:'#0066cc',weight:4}).addTo(map);}
window.setTrip=function(data){
  markers.clearLayers();if(route){map.removeLayer(route);route=null;}
  const points=[];
  data.stops.forEach((stop,index)=>{
    if(typeof stop.lat!=='number'||typeof stop.lng!=='number')return;
    points.push([stop.lat,stop.lng]);
    const color=stop.status==='completed'?'#34c759':stop.status==='active'?'#0066cc':'#7a7a7a';
    L.marker([stop.lat,stop.lng],{icon:L.divIcon({html:'<div class="pin" style="background:'+color+'">'+(index+1)+'</div>',className:'',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(markers);
  });
  if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[25,25]});else map.setView(points[0]||data.coords,13);
  const request=++version;if(controller)controller.abort();
  if(points.length<2){window.ReactNativeWebView.postMessage('ready');return;}
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
</script></body></html>`;

export default function TripMap({ coords, stops, height = 176, label, rounded = true }: { coords: number[]; stops: TripStop[]; height?: number; label?: string; rounded?: boolean }) {
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
    const payload = JSON.stringify({ coords, stops }).replace(/</g, '\\u003c');
    ref.current?.injectJavaScript(`window.setTrip&&window.setTrip(${payload});true;`);
  };
  useEffect(() => { if (ready.current) update(); }, [coords, stops]);
  return <View style={{ height, borderRadius: rounded ? 16 : 0, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
    <WebView ref={ref} source={{ html, baseUrl: 'https://unpkg.com' }} originWhitelist={['*']} scrollEnabled={false}
      onError={() => setMapError(true)} onMessage={(event) => {
        if (event.nativeEvent.data === 'loaded') { ready.current = true; setMapError(false); update(); }
        if (event.nativeEvent.data === 'map-error') setMapError(true);
        if (event.nativeEvent.data === 'route-error') setRouteError(true);
      }} />
    <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 8, right: 8, alignItems: 'flex-start' }}><Text style={[s.badge, { backgroundColor: '#fffffff2' }]}>{mapError ? 'Không tải được bản đồ' : routeError ? 'Chưa tải được đường bộ • đang hiển thị vị trí các trạm' : label ?? `Lộ trình đường bộ OSRM • ${stops.length} trạm`}</Text></View>
  </View>;
}
