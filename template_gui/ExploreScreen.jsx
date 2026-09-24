import React, { useState, useEffect, useRef } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { 
  Search, X, MapPin, ChevronRight, Navigation, Plus, Eye, 
  Clock, Compass, Calendar, Sparkles 
} from 'lucide-react';
import L from 'leaflet';

export default function ExploreScreen() {
  const { push, showToast } = useNav();
  const [currentCityKey, setCurrentCityKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUnifiedModal, setSelectedUnifiedModal] = useState(null);
  const [roadInfo, setRoadInfo] = useState(null);
  const [isLoadingRoad, setIsLoadingRoad] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const cityMarkersRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routeCasingRef = useRef(null);

  // Initialize Leaflet Map with full national overview
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      }).setView([16.0544, 107.5], 6);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      cityMarkersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Add city pins across Vietnam
      const allDests = TripsStore.getOsmDestinations();
      for (const key in allDests) {
        const d = allDests[key];
        const pinHtml = `
          <div class="flex items-center space-x-1.5 bg-[#ffffff] px-2.5 py-1 rounded-full border border-[#e0e0e0] shadow-sm cursor-pointer hover:border-[#0066cc] hover:scale-105 transition apple-press">
            <span class="w-2 h-2 rounded-full bg-[#0066cc]"></span>
            <span class="text-[11px] font-semibold text-[#1d1d1f]">${d.name}</span>
          </div>
        `;
        const icon = L.divIcon({ html: pinHtml, className: '', iconSize: [80, 24], iconAnchor: [40, 12] });
        const marker = L.marker(d.coords, { icon: icon }).addTo(markersGroupRef.current);
        marker.on('click', () => {
          handleSelectCity(key);
        });
      }
    }
  }, []);

  // Destination and hot spots resolution
  const currentDest = currentCityKey 
    ? (TripsStore.getOsmDestination(currentCityKey) || TripsStore.createDynamicDestination(currentCityKey))
    : null;

  const currentHotSpots = currentDest 
    ? (TripsStore.getHotSpots(currentCityKey, selectedCategory) || [])
    : [];

  // PROMPT.MD: Lịch trình bây giờ sẽ gôm lại gồm các ngày với nhau thành 1 chuyến đi nhất thống.
  const unifiedTrip = (() => {
    if (!currentDest) return null;
    const dayPlans = (currentDest.dayPlans && currentDest.dayPlans.length > 0) 
      ? currentDest.dayPlans 
      : (currentDest.tours || []);
    const daysCount = dayPlans.length || 1;
    const durationStr = daysCount <= 1 ? '1 ngày' : `${daysCount} ngày ${daysCount - 1} đêm`;

    const allStops = [];
    const seenNames = new Set();
    dayPlans.forEach(p => {
      (p.stops || []).forEach(s => {
        const norm = (s.name || '').trim().toLowerCase();
        if (norm && !seenNames.has(norm)) {
          seenNames.add(norm);
          allStops.push(s);
        }
      });
    });

    const highlightSummary = dayPlans.map(p => p.highlight || p.dayTitle).filter(Boolean).join(' • ');

    return {
      title: `Lịch trình toàn cảnh ${currentDest.name} (${durationStr})`,
      duration: durationStr,
      highlight: highlightSummary || `Khám phá trọn vẹn danh lam thắng cảnh và ẩm thực tại ${currentDest.name}`,
      dayPlans: dayPlans,
      stops: allStops,
      stopsCount: allStops.length
    };
  })();

  // Render hot spot markers when a city is selected
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (cityMarkersRef.current) {
      cityMarkersRef.current.clearLayers();
    } else {
      cityMarkersRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    if (currentDest && currentHotSpots.length > 0) {
      currentHotSpots.forEach(spot => {
        if (!spot.lat || !spot.lng) return;
        const pinHtml = `
          <div class="flex items-center space-x-1.5 bg-[#ffffff] px-2 py-0.5 rounded-full border border-[#0066cc] shadow-md cursor-pointer hover:bg-[#0066cc] hover:text-[#ffffff] group transition apple-press">
            <span class="w-1.5 h-1.5 rounded-full bg-[#0066cc] group-hover:bg-[#ffffff]"></span>
            <span class="text-[10px] font-semibold text-[#1d1d1f] group-hover:text-[#ffffff] max-w-[110px] truncate">${spot.name}</span>
          </div>
        `;
        const icon = L.divIcon({ html: pinHtml, className: '', iconSize: [120, 22], iconAnchor: [60, 11] });
        const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(cityMarkersRef.current);
        marker.on('click', () => {
          handleFocusHotSpot(spot);
        });
      });
    }

    // Invalidate map size so it smoothly expands or contracts
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 180);
  }, [currentCityKey, selectedCategory]);

  const handleSelectCity = (cityKey, coordsOverride, nameOverride) => {
    setCurrentCityKey(cityKey);
    const dest = TripsStore.getOsmDestination(cityKey) || (nameOverride ? TripsStore.createDynamicDestination(nameOverride, coordsOverride) : null);
    if (dest) {
      setSearchQuery(dest.name);
      setSearchResults([]);
      const targetCoords = coordsOverride || dest.coords;
      if (mapInstanceRef.current && targetCoords) {
        mapInstanceRef.current.flyTo(targetCoords, 12, { duration: 0.9 });
      }
      showToast(dest.name, `Đang hiển thị địa điểm nổi bật tại ${dest.fullName || dest.name}`);
    }
  };

  const resetExploreMap = () => {
    setCurrentCityKey(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCategory('all');
    setSelectedUnifiedModal(null);
    if (cityMarkersRef.current) {
      cityMarkersRef.current.clearLayers();
    }
    if (routePolylineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (routeCasingRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeCasingRef.current);
      routeCasingRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([16.0544, 107.5], 6, { duration: 1.0 });
    }
    showToast('Toàn cảnh Việt Nam', 'Bản đồ du lịch OpenStreetMap');
  };

  const handleSearchInput = async (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await TripsStore.searchOsmLocation(val);
      setSearchResults(results.slice(0, 5));
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // PROMPT.MD & IMAGE.PNG FIX: Handle picking search result with complete properties
  const handlePickSearchResult = (item) => {
    const cityName = item.name || item.city;
    const cityKey = item.key || item.cityKey || cityName;
    const coords = item.coords || (item.lat && item.lon ? [item.lat, item.lon] : null);

    setSearchQuery(cityName);
    setSearchResults([]);
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, 12, { duration: 1.0 });
    }
    handleSelectCity(cityKey, coords, cityName);
  };

  const handleFocusHotSpot = (spot) => {
    if (spot.lat && spot.lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([spot.lat, spot.lng], 14, { duration: 0.7 });
      showToast(spot.name, spot.note || spot.categoryLabel || 'Địa điểm nổi bật');
    }
  };

  // Preview road on map inside modal
  const handlePreviewRoad = async (stops) => {
    if (!stops || stops.length < 2) {
      showToast('Thông báo', 'Cần ít nhất 2 điểm dừng để tính tuyến đường');
      return;
    }
    setIsLoadingRoad(true);
    showToast('Đang tải tuyến đường', 'Đang tính toán đường bộ thực tế qua OSRM...');

    try {
      const road = await TripsStore.getRoadRoute(stops);
      setRoadInfo(road);

      if (mapInstanceRef.current) {
        if (routeCasingRef.current) mapInstanceRef.current.removeLayer(routeCasingRef.current);
        if (routePolylineRef.current) mapInstanceRef.current.removeLayer(routePolylineRef.current);

        routeCasingRef.current = L.polyline(road.latLngs, {
          color: '#ffffff',
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = L.polyline(road.latLngs, {
          color: '#0066cc',
          weight: 4,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [30, 30] });
      }
      showToast('Đường bộ OSM', `${road.distanceKm ? road.distanceKm + ' km • ' : ''}Khoảng ${road.durationMins || 45} phút`);
    } catch (e) {
      showToast('Thông báo', 'Đã căn chỉnh vị trí trên bản đồ');
    } finally {
      setIsLoadingRoad(false);
    }
  };

  const handleCreateTripFromTour = (tripObj, dest) => {
    setSelectedUnifiedModal(null);
    push('createTrip', { 
      city: dest.name, 
      tourTitle: tripObj.title,
      durationDays: (tripObj.dayPlans && tripObj.dayPlans.length) || 2
    });
  };

  const popularCities = ['Đà Lạt', 'Hội An', 'Phú Quốc', 'Sa Pa', 'Nha Trang', 'Hà Giang'];

  return (
    <div className="h-full flex flex-col bg-[#ffffff] overflow-hidden relative">

      {/* TOP FLOATING MINIMAL HEADER */}
      <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-between">
        <div className="pointer-events-auto flex items-center space-x-1.5 bg-[#ffffff]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#e0e0e0] shadow-sm">
          <Navigation className="w-3.5 h-3.5 text-[#0066cc]" />
          <span className="text-[12px] font-semibold text-[#1d1d1f]">
            {currentDest ? currentDest.name : 'Toàn cảnh Việt Nam'}
          </span>
          {currentCityKey && (
            <button
              type="button"
              onClick={resetExploreMap}
              className="text-[11px] text-[#0066cc] font-semibold hover:underline pl-1 border-l border-[#e0e0e0] apple-press"
            >
              Về toàn cảnh
            </button>
          )}
        </div>

        <div className="pointer-events-auto bg-[#ffffff]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#e0e0e0] text-[10px] font-semibold text-[#0066cc] shadow-sm flex items-center space-x-1">
          <Compass className="w-3 h-3" />
          <span>OpenStreetMap</span>
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className={`w-full transition-all duration-300 relative ${
        currentCityKey ? 'h-[42%] min-h-[200px]' : 'flex-1 h-full'
      }`}>
        <div ref={mapContainerRef} className="w-full h-full bg-[#f5f5f7]" />

        {/* Floating Zoom & Location Hint */}
        <div className="absolute bottom-3 left-3 z-10 bg-[#ffffff]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#e0e0e0] text-[10px] text-[#7a7a7a] pointer-events-none shadow-2xs">
          {currentCityKey ? 'Bản đồ địa điểm du lịch OpenStreetMap' : 'Chạm ghim trên bản đồ để khám phá'}
        </div>
      </div>

      {/* BOTTOM SECTION: THANH TÌM KIẾM ĐEM XUỐNG CHỖ GỢI Ý */}
      <div className={`bg-[#ffffff] border-t border-[#e0e0e0] transition-all duration-300 flex flex-col shrink-0 z-20 ${
        currentCityKey ? 'flex-1 min-h-0 overflow-hidden' : 'p-3 space-y-2.5'
      }`}>

        {/* SEARCH BAR (Đem xuống chỗ gợi ý) */}
        <div className={`relative ${currentCityKey ? 'p-3 pb-2 border-b border-[#f0f0f0]' : ''}`}>
          <div className="relative">
            <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-2.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Tìm kiếm tỉnh thành để xem gợi ý lộ trình..."
              className="w-full h-9 pl-9 pr-8 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={resetExploreMap}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7a7a7a] hover:text-[#1d1d1f]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown - PROMPT.MD & IMAGE.PNG FIX */}
          {searchResults.length > 0 && (
            <div className="absolute bottom-11 left-0 right-0 bg-[#ffffff] border border-[#e0e0e0] rounded-2xl shadow-lg z-50 overflow-hidden divide-y divide-[#f0f0f0]">
              {searchResults.map((item, idx) => {
                const title = item.name || item.city;
                const subtitle = item.fullName || item.display_name || item.province || 'Việt Nam';
                return (
                  <div
                    key={idx}
                    onClick={() => handlePickSearchResult(item)}
                    className="p-2.5 hover:bg-[#f5f5f7] cursor-pointer flex items-center justify-between text-[12px] apple-press"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-[#1d1d1f] truncate">{title}</p>
                      <p className="text-[10px] text-[#7a7a7a] truncate">{subtitle}</p>
                    </div>
                    <span className="text-[10px] text-[#0066cc] font-semibold shrink-0">Khám phá</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TRẠNG THÁI 1: KHI CHƯA CHỌN TỈNH THÀNH -> ẨN GỢI Ý, CHỈ HIỆN CÁC CHIP GỢI Ý NHANH ĐỂ XEM MAP RÕ */}
        {!currentCityKey && (
          <div className="space-y-1.5 pb-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#7a7a7a]">
              <span>Điểm đến nổi tiếng</span>
              <span>Chạm để khám phá</span>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              {popularCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#f5f5f7] hover:bg-[#e0e0e0] text-[#1d1d1f] border border-[#e0e0e0] shrink-0 apple-press"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TRẠNG THÁI 2: KHI ĐÃ CHỌN TỈNH THÀNH */}
        {currentCityKey && currentDest && (
          <div className="flex-1 overflow-y-auto p-3 pt-2 space-y-3 no-scrollbar">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-[#1d1d1f]">
                  Khám phá {currentDest.name}
                </h2>
                <p className="text-[11px] text-[#7a7a7a]">
                  Địa điểm nổi bật và gợi ý hành trình trọn vẹn
                </p>
              </div>

              <button
                type="button"
                onClick={resetExploreMap}
                className="text-[11px] text-[#0066cc] font-medium hover:underline apple-press shrink-0"
              >
                Đóng (Xem bản đồ)
              </button>
            </div>

            {/* PROMPT.MD: Gợi ý cũ đổi thành 1 button để người dùng chọn vào nếu muốn xem lịch trình nhất thống */}
            {unifiedTrip && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUnifiedModal(unifiedTrip);
                  setRoadInfo(null);
                }}
                className="w-full p-3.5 bg-gradient-to-r from-[#0066cc] to-[#0052a3] text-[#ffffff] rounded-2xl shadow-sm apple-press flex items-center justify-between text-left transition hover:opacity-95"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-[#ffffff]/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Navigation className="w-5 h-5 text-[#ffffff]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-[#ffffff]/25 text-[#ffffff] px-2 py-0.5 rounded-full">
                        Lịch trình đề xuất
                      </span>
                      <span className="text-[10px] text-[#ffffff]/90">• {unifiedTrip.duration}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-[#ffffff] truncate mt-0.5">
                      Xem lịch trình toàn cảnh {currentDest.name}
                    </p>
                    <p className="text-[11px] text-[#ffffff]/80 truncate">
                      {unifiedTrip.stopsCount} điểm dừng • Gom gọn toàn bộ {unifiedTrip.dayPlans.length} ngày
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#ffffff] shrink-0" />
              </button>
            )}

            {/* PROMPT.MD: Ở chỗ gợi ý lịch trình trong trang khám phá, sẽ hiển thị những địa điểm hot của chỗ đó */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold text-[#1d1d1f]">
                    Địa điểm hot tại {currentDest.name}
                  </h3>
                  <p className="text-[11px] text-[#7a7a7a]">
                    Check-in, danh lam thắng cảnh và ẩm thực nổi tiếng
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-[#0066cc] bg-[#f5f5f7] px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                  {currentHotSpots.length} địa điểm
                </span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'nature', label: 'Thắng cảnh' },
                  { key: 'checkin', label: 'Check-in' },
                  { key: 'food', label: 'Ẩm thực' },
                  { key: 'culture', label: 'Văn hóa' },
                  { key: 'cafe', label: 'Cà phê' }
                ].map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 apple-press transition ${
                      selectedCategory === cat.key 
                        ? 'bg-[#0066cc] text-[#ffffff]' 
                        : 'bg-[#f5f5f7] text-[#7a7a7a] hover:bg-[#e0e0e0] border border-[#e0e0e0]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Hot spots cards list */}
              <div className="space-y-2 pb-6">
                {currentHotSpots.map((spot, idx) => (
                  <article
                    key={spot.id || idx}
                    onClick={() => handleFocusHotSpot(spot)}
                    className="p-3 bg-[#ffffff] border border-[#e0e0e0] rounded-2xl hover:border-[#0066cc] transition cursor-pointer apple-press flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center text-[#0066cc] shrink-0 font-bold text-[12px]">
                        <MapPin className="w-5 h-5 text-[#0066cc]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-semibold text-[#1d1d1f] text-[13px] truncate">
                            {spot.name}
                          </h4>
                          <span className="text-[9px] font-medium text-[#0066cc] bg-[#0066cc]/10 px-1.5 py-0.2 rounded shrink-0">
                            {spot.categoryLabel || spot.category || 'Nổi bật'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7a7a7a] truncate mt-0.5">
                          {spot.note || `Điểm khám phá nổi bật tại ${currentDest.name}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusHotSpot(spot);
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] text-[#0066cc] text-[10px] font-semibold hover:bg-[#0066cc] hover:text-[#ffffff] transition shrink-0 apple-press"
                    >
                      Xem vị trí
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* PROMPT.MD: Detail Modal Sheet - Hiển thị chi tiết ngày đi cụ thể và lịch trình nhất thống */}
      {selectedUnifiedModal && currentDest && (
        <div 
          className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setSelectedUnifiedModal(null)}
        >
          <div 
            className="w-full max-w-[420px] bg-[#ffffff] rounded-t-[28px] border-t border-[#e0e0e0] p-4 space-y-3.5 anim-sheet-up max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="w-10 h-1 bg-[#d2d2d7] rounded-full mx-auto shrink-0"></div>

            {/* Modal Header */}
            <div className="flex items-start justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-semibold text-[#0066cc] bg-[#f5f5f7] px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                    {currentDest.name}
                  </span>
                  <span className="text-[11px] text-[#7a7a7a]">
                    • {selectedUnifiedModal.duration}
                  </span>
                  <span className="text-[11px] text-[#7a7a7a]">
                    • {selectedUnifiedModal.stopsCount} điểm dừng
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mt-1">
                  {selectedUnifiedModal.title}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedUnifiedModal(null)}
                className="w-7 h-7 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] apple-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview & Highlight */}
            <div className="relative rounded-2xl overflow-hidden h-28 bg-[#f5f5f7] border border-[#e0e0e0] shrink-0">
              <img 
                src={currentDest.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'} 
                alt={selectedUnifiedModal.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1d1d1f]/80 via-transparent to-transparent flex items-end p-3">
                <p className="text-[11px] text-[#ffffff] line-clamp-2">
                  {selectedUnifiedModal.highlight}
                </p>
              </div>
            </div>

            {/* Stops Timeline: Grouped by day ("Hiển thị chi tiết ngày đi cụ thể và lịch trình như nào") */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 min-h-[160px] pr-1">
              <div className="flex items-center justify-between text-[11px] text-[#7a7a7a] sticky top-0 bg-[#ffffff] py-1 z-10 border-b border-[#f0f0f0]">
                <span className="font-semibold uppercase tracking-wider">Chi tiết lịch trình theo ngày</span>
                <span className="text-[#0066cc] font-medium">{selectedUnifiedModal.dayPlans.length} ngày trọn gói</span>
              </div>

              {selectedUnifiedModal.dayPlans.map((day, dIdx) => (
                <div key={dIdx} className="bg-[#f5f5f7] rounded-xl p-3 border border-[#e0e0e0] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#0066cc] text-[#ffffff] text-[9px] font-bold">
                        Ngày {day.dayNumber || (dIdx + 1)}
                      </span>
                      <h4 className="text-[12px] font-semibold text-[#1d1d1f] truncate max-w-[200px]">
                        {day.dayTitle}
                      </h4>
                    </div>
                    <span className="text-[10px] text-[#7a7a7a] font-medium">
                      {(day.stops || []).length} trạm
                    </span>
                  </div>

                  {day.highlight && (
                    <p className="text-[10px] text-[#7a7a7a]">
                      {day.highlight}
                    </p>
                  )}

                  <div className="space-y-2 border-l-2 border-[#0066cc]/25 ml-2 pl-3 pt-1">
                    {(day.stops || []).map((stop, sIdx) => (
                      <div key={sIdx} className="relative text-[11px] pb-1">
                        <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-[#0066cc] border border-[#ffffff]"></span>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1d1d1f]">{stop.name}</span>
                          <span className="text-[10px] text-[#7a7a7a]">{stop.time || '09:00'}</span>
                        </div>
                        {stop.note && (
                          <p className="text-[10px] text-[#7a7a7a] mt-0.5">{stop.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Bar */}
            <div className="pt-2 border-t border-[#f0f0f0] flex space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePreviewRoad(selectedUnifiedModal.stops)}
                disabled={isLoadingRoad}
                className="flex-1 h-10 rounded-full border border-[#0066cc] text-[#0066cc] text-[12px] font-semibold flex items-center justify-center space-x-1.5 apple-press hover:bg-[#0066cc]/5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isLoadingRoad ? 'Đang vẽ...' : 'Xem đường bộ'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateTripFromTour(selectedUnifiedModal, currentDest)}
                className="flex-1 h-10 rounded-full bg-[#0066cc] text-[#ffffff] text-[12px] font-semibold flex items-center justify-center space-x-1.5 apple-press hover:bg-[#0071e3]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo chuyến đi này</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
