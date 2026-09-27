import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { addBasemap } from '../map/basemap';

export default function PlannerMap({ coords, stops, routePlans = null, focusedStop = null }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  useEffect(() => {
    const map = L.map(container.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true
    }).setView(coords, 12);
    addBasemap(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [coords]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layerRef.current.clearLayers();
    markersRef.current.clear();
    const points = stops.filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
    if (routePlans) routePlans.forEach((plan, day) => {
      const route = plan.stops.filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)).map(stop => [stop.lat, stop.lng]);
      if (route.length > 1) L.polyline(route, { color: ['#0066cc', '#ff3b30', '#ff9500'][day % 3], weight: 3, dashArray: '6 5' }).addTo(layerRef.current);
    });
    points.forEach((stop, i) => {
      const icon = L.divIcon({ className: '', html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#0066cc;color:white;border:2px solid white;font:600 12px system-ui">${i + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
      const label = document.createElement('span'); label.textContent = stop.name;
      const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(layerRef.current).bindTooltip(label);
      markersRef.current.set(stop.id, marker);
    });
    if (points.length) map.fitBounds(points.map(s => [s.lat, s.lng]), { padding: [35, 30], maxZoom: 14 });
    else map.setView(coords, 12);
  }, [coords, stops, routePlans]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedStop || !Number.isFinite(focusedStop.lat) || !Number.isFinite(focusedStop.lng)) return;
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo([focusedStop.lat, focusedStop.lng], 16, { animate, duration: .45 });
    markersRef.current.get(focusedStop.id)?.openTooltip();
  }, [focusedStop, coords, stops, routePlans]);
  return <div ref={container} aria-label="Bản đồ các điểm dừng trong ngày" className="w-full h-full bg-parchment" />;
}
