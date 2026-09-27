import L from 'leaflet';

const cartoKey = (import.meta.env.VITE_CARTO_BASEMAPS_KEY || '').trim();
const tileUrl = 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png';

export function addBasemap(map) {
  L.control.attribution({ position: 'topleft', prefix: false }).addTo(map);
  return L.tileLayer(`${tileUrl}${cartoKey ? `?key=${encodeURIComponent(cartoKey)}` : ''}`, {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);
}
