import React, { useState, useEffect, useRef } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { getSavedSpots, saveSpots, getSpotLists } from '../store/savedSpots';
import SavedListDialog from '../components/SavedListDialog';
import StablePopup from '../components/StablePopup';
import {
  Search, Plus, MapPin, Compass, Navigation, X, Star,
  Bookmark, Check, List, Sparkles, ExternalLink, ChevronRight, CornerUpRight,
  ChevronUp, ChevronDown, LocateFixed, LoaderCircle
} from 'lucide-react';
import L from 'leaflet';
import { addBasemap } from '../map/basemap';

const categoryLabels = {
  Attractions: 'Tham quan', Culture: 'Văn hóa', Destination: 'Điểm đến',
  Food: 'Ẩm thực', Nature: 'Thiên nhiên', Shopping: 'Mua sắm',
  Cafe: 'Cà phê', Restaurant: 'Nhà hàng', Hotel: 'Lưu trú'
};
const localizeCategory = (category) => categoryLabels[category] || category;

export default function ExploreScreen({ params = {} }) {
  const { push, showToast } = useNav();

  // Active filter: 'all', 'lists', 'nearby'
  const [activeFilter, setActiveFilter] = useState(params.filter || 'all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isAddSpotsModalOpen, setIsAddSpotsModalOpen] = useState(!!params.addSpots);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isListDialogOpen, setIsListDialogOpen] = useState(!!params.createList);

  // Bottom Sheet expansion state: false = normal (half-screen), true = collapsed (peek dock bar for full map)
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const currentDragYRef = useRef(0);

  // User saved spots state
  const [savedSpots, setSavedSpots] = useState(getSavedSpots);
  useEffect(() => { saveSpots(savedSpots); }, [savedSpots]);

  // Leaflet map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const locationRequestRef = useRef(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on a global / regional perspective
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      }).setView([20.0, 30.0], 3);

      addBasemap(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    renderPinsOnMap();
  }, [savedSpots]);

  // Render Red & Action Blue location pins on map matching images/kham_pha/image.png
  const renderPinsOnMap = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    savedSpots.forEach((spot) => {
      if (!spot.lat || !spot.lng) return;

      // Small clean red circular pin matching the screenshot's red dot marker
      const pinHtml = `
        <div class="relative flex items-center justify-center cursor-pointer apple-press">
          <div class="w-4 h-4 rounded-full bg-[#ff3b30] border-2 border-[#ffffff]  hover:scale-125 transition-transform"></div>
        </div>
      `;
      const icon = L.divIcon({ html: pinHtml, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
      const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(markersLayerRef.current);
      marker.on('click', () => {
        setSelectedSpot(spot);
      });
    });
  };

  // Re-center map to view all spots or default view
  const handleRecenterMap = () => {
    if (!mapInstanceRef.current) return;
    if (savedSpots.length > 0) {
      const bounds = L.latLngBounds(savedSpots.map(s => [s.lat, s.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      showToast('Bản đồ', 'Đã căn chỉnh góc nhìn toàn cảnh');
    } else {
      mapInstanceRef.current.setView([20.0, 30.0], 3, { animate: true });
    }
  };

  const handleLocateCurrentPosition = () => {
    if (!mapInstanceRef.current || locationRequestRef.current) return;
    if (!navigator.geolocation) {
      showToast('Vị trí hiện tại', 'Trình duyệt không hỗ trợ định vị.');
      return;
    }

    locationRequestRef.current = true;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locationRequestRef.current = false;
        if (!mapContainerRef.current) return;
        setIsLocating(false);
        const position = [coords.latitude, coords.longitude];
        setCurrentPosition(position);
        const map = mapInstanceRef.current;
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setLatLng(position);
        } else {
          currentLocationMarkerRef.current = L.circleMarker(position, {
            radius: 7, color: '#ffffff', weight: 3,
            fillColor: '#0066cc', fillOpacity: 1
          }).addTo(map).bindTooltip('Vị trí hiện tại của bạn');
        }
        map.setView(position, 16, { animate: true });
        showToast('Vị trí hiện tại', 'Đã phóng tới vị trí của bạn.');
      },
      (error) => {
        locationRequestRef.current = false;
        if (!mapContainerRef.current) return;
        setIsLocating(false);
        const messages = {
          1: 'Hãy cho phép truy cập vị trí trong trình duyệt rồi thử lại.',
          2: 'Chưa xác định được vị trí. Vui lòng thử lại.',
          3: 'Định vị quá lâu. Vui lòng thử lại.'
        };
        showToast('Không thể định vị', messages[error.code] || 'Vui lòng thử lại.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Invalidate Leaflet map size when sheet expands or collapses so map redraws smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [isSheetCollapsed]);

  // Pointer drag gestures for the handle bar
  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    dragStartYRef.current = clientY;
    currentDragYRef.current = clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    currentDragYRef.current = clientY;
    const delta = clientY - dragStartYRef.current;
    if (!isSheetCollapsed && delta > 0) {
      setDragY(Math.min(delta, 250));
    } else if (isSheetCollapsed && delta < 0) {
      setDragY(Math.max(delta, -250));
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const delta = currentDragYRef.current - dragStartYRef.current;
    if (!isSheetCollapsed && delta > 40) {
      setIsSheetCollapsed(true);
    } else if (isSheetCollapsed && delta < -40) {
      setIsSheetCollapsed(false);
    }
    setDragY(0);
  };

  // Toggle on click / tap if not dragged
  const handleHandleClick = (e) => {
    const delta = Math.abs(currentDragYRef.current - dragStartYRef.current);
    if (e.detail === 0 || delta < 8) {
      setIsSheetCollapsed(prev => !prev);
    }
  };

  // Live spot search handler
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const allDests = TripsStore.getOsmDestinations();
    const results = [];

    // Search destinations and their stops
    for (const key in allDests) {
      const dest = allDests[key];
      if (dest.name.toLowerCase().includes(q) || (dest.fullName && dest.fullName.toLowerCase().includes(q))) {
        results.push({
          id: `dest_${key}`,
          name: dest.name,
          city: dest.name,
          category: 'Destination',
          categoryIcon: '📍',
          lat: dest.coords[0],
          lng: dest.coords[1],
          rating: 4.8,
          reviewsCount: '25,000+',
          image: dest.image,
          description: dest.weather?.tip || `Điểm đến du lịch hấp dẫn tại ${dest.fullName}`
        });
      }

      // Check dayPlans stops
      (dest.dayPlans || []).forEach(p => {
        (p.stops || []).forEach(s => {
          if (s.name.toLowerCase().includes(q) && !results.some(r => r.name === s.name)) {
            results.push({
              id: s.id || `stop_${s.name}`,
              name: s.name,
              city: dest.name,
              category: s.category || 'Attractions',
              categoryIcon: s.categoryIcon || '🏛️',
              lat: s.lat,
              lng: s.lng,
              rating: s.rating || 4.7,
              reviewsCount: s.reviewsCount || '14,200',
              image: s.image || dest.image,
              description: s.description || s.note || `Thắng cảnh nổi tiếng tại ${dest.name}`
            });
          }
        });
      });
    }

    setSearchResults(results.slice(0, 8));
  };

  // Add a spot to saved spots
  const handleAddSpotToSaved = (spot) => {
    if (savedSpots.some(s => s.name === spot.name)) {
      showToast('Đã có trong danh sách', spot.name);
      return;
    }
    const updated = [spot, ...savedSpots];
    setSavedSpots(updated);
    showToast('Đã thêm địa điểm', spot.name);
    setIsAddSpotsModalOpen(false);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    if (mapInstanceRef.current && spot.lat && spot.lng) {
      mapInstanceRef.current.setView([spot.lat, spot.lng], 14, { animate: true });
    }
  };

  const cityLists = getSpotLists(savedSpots);
  const nearbySpots = currentPosition ? savedSpots
    .map(spot => ({ ...spot, distance: L.latLng(currentPosition).distanceTo([spot.lat, spot.lng]) / 1000 }))
    .filter(spot => spot.distance <= 50)
    .sort((a, b) => a.distance - b.distance) : [];

  return (
    <div className="h-full flex flex-col bg-parchment overflow-hidden select-none relative">

      {/* ========================================================
          1. TOP INTERACTIVE MAP LAYER (Background)
          ======================================================== */}
      <div
        className={`relative z-0 overflow-hidden w-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isSheetCollapsed ? 'flex-1 min-h-0' : 'h-1/2'
        } bg-parchment border-b border-hairline shrink-0`}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRecenterMap}
            className="w-11 h-11 rounded-full bg-canvas border border-hairline flex items-center justify-center text-primary hover:bg-parchment apple-press focus-visible:outline-2 focus-visible:outline-primary-focus"
            aria-label="Căn chỉnh góc nhìn toàn cảnh"
            title="Căn chỉnh góc nhìn toàn cảnh"
          >
            <Compass aria-hidden="true" className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleLocateCurrentPosition}
            disabled={isLocating}
            aria-busy={isLocating}
            aria-label={isLocating ? 'Đang tìm vị trí của bạn' : 'Phóng tới vị trí hiện tại'}
            title="Phóng tới vị trí hiện tại"
            className="w-11 h-11 rounded-full bg-canvas border border-hairline flex items-center justify-center text-primary hover:bg-parchment apple-press disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-primary-focus"
          >
            {isLocating ? <LoaderCircle aria-hidden="true" className="w-5 h-5 animate-spin motion-reduce:animate-none" /> : <LocateFixed aria-hidden="true" className="w-5 h-5" />}
          </button>
        </div>
      </div>


      {/* ========================================================
          2. BOTTOM SHEET CONTAINER (Hero of images/kham_pha/image.png)
          ======================================================== */}
      <div
        style={{
          transform: isDragging && dragY !== 0 ? `translateY(${dragY}px)` : undefined
        }}
        className={`relative z-30 bg-canvas border-t border-hairline flex flex-col min-h-0 ${
          isSheetCollapsed ? 'h-[44px] shrink-0 rounded-none' : 'h-1/2 shrink-0 rounded-t-[24px]'
        } overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]`}
      >

        {/* Top Drag Handle & Affordance Area */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleHandleClick}
          className={`w-full min-h-11 shrink-0 flex items-center justify-center cursor-pointer select-none touch-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0066cc] ${
            isSheetCollapsed ? 'h-11 px-4 bg-parchment hover:bg-hairline transition-colors' : 'h-6 !min-h-6 px-4'
          }`}
          aria-expanded={!isSheetCollapsed}
          aria-label={isSheetCollapsed ? "Kéo lên hoặc chạm để mở lại danh sách địa điểm" : "Kéo xuống để xem bản đồ"}
          title={isSheetCollapsed ? "Kéo lên hoặc chạm để xem địa điểm" : "Kéo xuống hoặc chạm để xem toàn cảnh bản đồ"}
        >
          {isSheetCollapsed ? (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <span>Xem địa điểm</span>
              <ChevronUp aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
            </span>
          ) : (
            <>
              {/* Hình chữ nhật nhỏ (Drag handle) khi mở rộng */}
              <span aria-hidden="true" className="w-10 h-1 rounded-full mx-auto transition-colors bg-hairline group-hover:bg-[#8e8e93]" />
            </>
          )}
        </button>

        {/* Nội dung danh sách khi mở rộng */}
        {!isSheetCollapsed && (
          <>
            {/* Filter & Search Bar Row matching screenshot */}
            <div className="px-3 py-2 grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-1.5 shrink-0 border-b border-hairline">

          {/* Circular Search Icon Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition apple-press shrink-0 ${
              isSearchOpen
                ? 'bg-[#1d1d1f] text-[#ffffff] border-[#1d1d1f]'
                : 'bg-parchment text-ink-muted border-hairline hover:text-ink'
            }`}
            aria-label="Tìm kiếm địa điểm"
          >
            <Search className="w-4 h-4 shrink-0" />
          </button>

          {/* Filter Pill: All */}
          <button
            type="button"
            aria-pressed={activeFilter === 'all'}
            onClick={() => {
              setActiveFilter('all');
              setIsSearchOpen(false);
            }}
            className={`px-1 min-h-11 rounded-full text-[12px] whitespace-nowrap font-semibold transition apple-press shrink-0 ${
              activeFilter === 'all'
                ? 'bg-[#1d1d1f] text-[#ffffff] '
                : 'bg-parchment text-ink hover:bg-hairline border border-hairline/70'
            }`}
          >
            Tất cả
          </button>

          {/* Filter Pill: Lists */}
          <button
            type="button"
            aria-pressed={activeFilter === 'lists'}
            onClick={() => {
              setActiveFilter('lists');
              setIsSearchOpen(false);
            }}
            className={`px-1 min-h-11 rounded-full text-[12px] whitespace-nowrap font-semibold transition apple-press shrink-0 flex items-center justify-center gap-1 ${
              activeFilter === 'lists'
                ? 'bg-[#1d1d1f] text-[#ffffff] '
                : 'bg-parchment text-ink hover:bg-hairline border border-hairline/70'
            }`}
          >
            <List aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>Danh sách</span>
          </button>

          {/* Filter Pill: Nearby */}
          <button
            type="button"
            aria-pressed={activeFilter === 'nearby'}
            onClick={() => {
              setActiveFilter('nearby');
              setIsSearchOpen(false);
            }}
            className={`px-1 min-h-11 rounded-full text-[12px] whitespace-nowrap font-semibold transition apple-press shrink-0 flex items-center justify-center gap-1 ${
              activeFilter === 'nearby'
                ? 'bg-[#1d1d1f] text-[#ffffff] '
                : 'bg-parchment text-ink hover:bg-hairline border border-hairline/70'
            }`}
          >
            <MapPin aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>Gần bạn</span>
          </button>
        </div>

        {/* Inline Search Bar (Expanded when search button tapped) */}
        {isSearchOpen && (
          <div className="px-4 py-2 border-b border-hairline bg-parchment shrink-0 anim-sheet-up">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-ink-muted absolute left-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm thành phố, địa danh, quán cà phê..."
                className="w-full h-9 pl-9 pr-8 text-[14px] bg-canvas border border-hairline rounded-xl outline-none focus:border-[#0066cc]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 text-ink-muted hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1 no-scrollbar bg-canvas p-2 rounded-xl border border-hairline ">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddSpotToSaved(item)}
                    className="p-2 rounded-lg hover:bg-parchment flex items-center justify-between cursor-pointer apple-press"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <span className="text-[14px]">{item.categoryIcon}</span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink truncate">{item.name}</p>
                        <p className="text-[10px] text-ink-muted truncate">{item.city} • {localizeCategory(item.category)}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-primary bg-[#0066cc]/10 px-2 py-0.5 rounded-full shrink-0">
                      + Thêm
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* ========================================================
            3. SHEET MAIN CONTENT BODY
            ======================================================== */}
        <div key={activeFilter} className={`flex-1 min-h-0 no-scrollbar bg-canvas anim-content-switch ${activeFilter === 'all' ? 'overflow-hidden pt-3 pb-4 flex flex-col' : 'overflow-y-auto p-4'}`}>

          {/* TAB: ALL (Exact match to images/kham_pha/image.png) */}
          {activeFilter === 'all' && (
            <div className="explore-overview w-full flex-1 min-h-0 grid grid-rows-[auto_minmax(0,1fr)_auto] text-center gap-3">

              {/* Header Title: Gom nơi yêu thích vào một chỗ */}
              <div className="space-y-1 px-4 max-w-[420px] mx-auto">
                <h2 className="text-[21px] font-semibold text-ink tracking-tight leading-snug text-balance">
                  Mọi nơi yêu thích, một chỗ lưu
                </h2>
                <p className="text-[14px] text-ink-muted font-normal leading-relaxed text-balance">
                  Lưu những nơi đáng nhớ cho chuyến đi tiếp theo.
                </p>
              </div>

              {/* Travel Flatlay Illustration / Photograph */}
              <div className="min-h-0 w-full overflow-hidden bg-canvas relative">
                <img
                  src="/images/explore-travel-desk.webp"
                  alt="Bản đồ giấy, máy ảnh và bưu thiếp trên bàn du lịch"
                  width="960"
                  height="640"
                  className="block w-full h-full object-cover object-center"
                />
              </div>

              {/* Action Pill CTA Button: [+ Add Spots] */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsAddSpotsModalOpen(true)}
                  className="h-11 px-6 rounded-full bg-parchment text-primary flex items-center space-x-2.5 mx-auto apple-press hover:bg-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-[14px] font-semibold text-primary">
                    Thêm địa điểm
                  </span>
                </button>
              </div>

            </div>
          )}


          {/* TAB: LISTS (Collections) */}
          {activeFilter === 'lists' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-[16px] font-semibold text-ink">Danh sách của tôi</h3>
                <button type="button" onClick={() => setIsListDialogOpen(true)} className="min-h-11 text-[14px] text-primary px-2">Tạo mới</button>
              </div>

              {cityLists.map(({ id: city, name, spots }) => (
                <button
                  type="button"
                  key={city}
                  aria-expanded={selectedCity === city}
                  onClick={() => setSelectedCity(selectedCity === city ? null : city)}
                  className="w-full p-3 rounded-[18px] bg-canvas border border-hairline flex items-center justify-between text-left hover:border-primary cursor-pointer apple-press"
                >
                  <div className="flex items-center space-x-3">
                    <List aria-hidden="true" className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <span className="block text-[14px] font-semibold text-ink">{name}</span>
                      <span className="block text-[12px] text-ink-muted">{spots.length} địa điểm đã lưu</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-ink-muted bg-parchment px-2.5 py-1 rounded-full border border-hairline">
                    {spots.length}
                  </span>
                </button>
              ))}
              {selectedCity && (
                <div className="space-y-2">
                  <h4 className="text-[14px] font-semibold text-ink">{cityLists.find(list => list.id === selectedCity)?.name}</h4>
                  {cityLists.find(list => list.id === selectedCity)?.spots.map(spot => (
                    <button type="button" key={spot.id} onClick={() => setSelectedSpot(spot)} className="w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-parchment text-left text-[14px] text-ink apple-press">
                      <span>{spot.name}</span>
                      <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0 text-ink-muted" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* TAB: NEARBY */}
          {activeFilter === 'nearby' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-[16px] font-semibold text-ink">Địa điểm gần bạn</h3>
              </div>
              <p className="text-[12px] text-ink-muted">Địa điểm đã lưu trong bán kính 50 km.</p>
              {!currentPosition && <button type="button" onClick={handleLocateCurrentPosition} disabled={isLocating} className="min-h-11 px-4 rounded-full bg-primary text-white text-[14px] apple-press disabled:opacity-60">{isLocating ? 'Đang xác định vị trí…' : 'Dùng vị trí hiện tại'}</button>}
              {currentPosition && nearbySpots.length === 0 && <p className="py-4 text-[14px] text-ink-muted">Bạn chưa lưu địa điểm nào gần đây. Hãy thêm địa điểm trong tab Tất cả.</p>}

              {nearbySpots.map((spot, idx) => (
                <div
                  key={spot.id || idx}
                  onClick={() => setSelectedSpot(spot)}
                  className="p-3 rounded-2xl bg-canvas border border-hairline flex items-center justify-between hover:border-[#0066cc] cursor-pointer apple-press "
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <img
                      src={spot.image}
                      alt={spot.name}
                      className="w-12 h-12 rounded-xl object-cover border border-hairline shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-[13.5px] font-semibold text-ink truncate">{spot.name}</h4>
                      <p className="text-[11px] text-ink-muted mt-0.5">{spot.city} • {spot.distance.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                </div>
              ))}
            </div>
          )}

        </div>
          </>
        )}
      </div>


      {/* ========================================================
          4. ADD SPOTS MODAL SHEET
          ======================================================== */}
      {isListDialogOpen && <SavedListDialog onClose={() => setIsListDialogOpen(false)} onSaved={() => { setIsListDialogOpen(false); showToast('Đã tạo danh sách', 'Danh sách được lưu trên thiết bị.'); }} />}
      {isAddSpotsModalOpen && (
        <StablePopup label="Thêm địa điểm" onClose={() => setIsAddSpotsModalOpen(false)}>
          <div
            className="w-full bg-canvas p-5 pb-6 h-full min-h-0 flex flex-col  overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[20px] font-bold text-ink">Thêm địa điểm</h3>
                <p className="text-[12px] text-ink-muted">Khám phá và lưu vào bản đồ cá nhân</p>
              </div>
              <button
                type="button"
                data-popup-close
                aria-label="Đóng phần thêm địa điểm"
                className="w-11 h-11 rounded-full bg-parchment border border-hairline flex items-center justify-center text-ink-muted hover:text-ink apple-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center mb-3">
              <Search className="w-4 h-4 text-ink-muted absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Nhập tên địa điểm hoặc thành phố..."
                className="w-full h-10 pl-9 pr-8 text-[16px] bg-parchment border border-hairline rounded-xl outline-none focus:border-[#0066cc]"
              />
            </div>

            {/* Suggested Trending Spots */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                {searchQuery ? 'Kết quả tìm kiếm' : 'Gợi ý điểm nổi bật'}
              </span>

              {(searchResults.length > 0 ? searchResults : [
                {
                  id: 'sug_1',
                  name: 'Park Güell',
                  city: 'Barcelona',
                  category: 'Tham quan',
                  categoryIcon: '🏛️',
                  lat: 41.4145,
                  lng: 2.1527,
                  image: 'https://images.unsplash.com/photo-1561632669-7f55f7975606?w=600&auto=format&fit=crop&q=80',
                  description: 'Công viên kiến trúc cổ tích huyền ảo của Gaudí.'
                },
                {
                  id: 'sug_2',
                  name: 'Hồ Xuân Hương',
                  city: 'Đà Lạt',
                  category: 'Tham quan',
                  categoryIcon: '🏛️',
                  lat: 11.9419,
                  lng: 108.4442,
                  image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop&q=80',
                  description: 'Trái tim thơ mộng của thành phố sương mù.'
                },
                {
                  id: 'sug_3',
                  name: 'Chùa Cầu Hội An',
                  city: 'Hội An',
                  category: 'Văn hóa',
                  categoryIcon: '🏛️',
                  lat: 15.8801,
                  lng: 108.3380,
                  image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&auto=format&fit=crop&q=80',
                  description: 'Biểu tượng lịch sử trầm mặc bên sông Hoài.'
                }
              ]).map((spot) => (
                <div
                  key={spot.id}
                  className="p-3 bg-canvas border border-hairline rounded-2xl flex items-center justify-between hover:border-[#0066cc] "
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <img
                      src={spot.image}
                      alt={spot.name}
                      className="w-11 h-11 rounded-xl object-cover border border-hairline shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink truncate">{spot.name}</p>
                      <p className="text-[11px] text-ink-muted truncate">{spot.city} • {localizeCategory(spot.category)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSpotToSaved(spot)}
                    className="min-h-11 px-3 rounded-full bg-[#0066cc] text-[#ffffff] text-[11px] font-semibold flex items-center space-x-1 apple-press hover:bg-[#0071e3] shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lưu</span>
                  </button>
                </div>
              ))}
            </div>

          </div>
        </StablePopup>
      )}


      {/* ========================================================
          5. SPOT DETAIL MODAL (Matching design language)
          ======================================================== */}
      {selectedSpot && (
        <div
          className="fixed inset-0 z-50 bg-[#000000]/45 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setSelectedSpot(null)}
        >
          <div
            className="w-full max-w-[420px] bg-canvas rounded-t-[18px] border-t border-hairline p-5 pb-6 anim-sheet-up max-h-[88vh] flex flex-col  overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-hairline rounded-full mx-auto shrink-0 mb-3" />

            <div className="flex items-start justify-between shrink-0 mb-1">
              <h2 className="text-[22px] font-bold text-ink leading-tight pr-2">
                {selectedSpot.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSpot(null)}
                aria-label="Đóng chi tiết địa điểm"
                className="w-8 h-8 rounded-full bg-parchment border border-hairline flex items-center justify-center text-ink-muted hover:text-ink apple-press shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 text-[14px] text-ink mt-1 mb-2">
              <span className="font-semibold">{selectedSpot.rating || '4.7'}</span>
              <div className="flex items-center text-[#ffb800] space-x-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#ffb800] text-[#ffb800]" />
                ))}
              </div>
              <span className="text-ink-muted text-[14px]">
                ({selectedSpot.reviewsCount || '14,518'})
              </span>
            </div>

            <div className="my-3 rounded-2xl overflow-hidden h-44 bg-parchment border border-hairline/70 shrink-0 ">
              <img
                src={selectedSpot.image}
                alt={selectedSpot.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1 mb-5">
              <h4 className="text-[14px] font-bold text-ink">Giới thiệu địa điểm</h4>
              <p className="text-[14px] text-ink-muted leading-relaxed">
                {selectedSpot.description || `Điểm tham quan nổi bật tại ${selectedSpot.city}.`}
              </p>
            </div>

            <div className="pt-2 border-t border-hairline flex items-center justify-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current && selectedSpot.lat && selectedSpot.lng) {
                    mapInstanceRef.current.setView([selectedSpot.lat, selectedSpot.lng], 15, { animate: true });
                  }
                  setSelectedSpot(null);
                  showToast('Đã định vị', selectedSpot.name);
                }}
                className="flex-1 h-11 rounded-full bg-parchment border border-hairline text-ink text-[14px] font-semibold flex items-center justify-center space-x-2 apple-press hover:bg-[#0066cc] hover:text-[#ffffff] hover:border-[#0066cc] transition "
              >
                <Navigation className="w-4 h-4 text-primary" />
                <span>Xem trên bản đồ</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
