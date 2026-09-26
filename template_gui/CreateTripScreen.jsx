import React, { useState, useEffect, useRef } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { 
  ArrowLeft, Search, MapPin, Calendar, Clock, Plus, Trash2, 
  Users, Sparkles, Navigation, Check, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import L from 'leaflet';

export default function CreateTripScreen({ params = {} }) {
  const { pop, push, showToast } = useNav();

  // Destination selection state
  const [isDestinationSelected, setIsDestinationSelected] = useState(false);
  const [destSearchInput, setDestSearchInput] = useState(params.city || '');
  const [destSearchResults, setDestSearchResults] = useState([]);
  const [currentCityKey, setCurrentCityKey] = useState(null);
  const [destinationName, setDestinationName] = useState('');
  const [tripCoords, setTripCoords] = useState([16.0544, 108.2022]);
  const [tripTitle, setTripTitle] = useState('');

  // Calendar & Duration State (Mặc định không set ngày sẵn - người dùng tự chọn 100%)
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false); // Default OFF as requested

  // Day Plans & Stops State
  const [dayPlans, setDayPlans] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeStops, setActiveStops] = useState([]);

  // Toggles (Default OFF)
  const [isCustomStopsOn, setIsCustomStopsOn] = useState(false);
  const [isInviteFriendsOn, setIsInviteFriendsOn] = useState(false);
  const [isAiOn, setIsAiOn] = useState(false);

  // Custom Place & Hot Spots
  const [customPlaceInput, setCustomPlaceInput] = useState('');
  const [hotSpotsCategory, setHotSpotsCategory] = useState('all');

  // Friends selection
  const [friendsList, setFriendsList] = useState([
    { id: 'f1', name: 'Bạn đồng hành B', phone: '0912 345 678', selected: false },
    { id: 'f2', name: 'Bạn đồng hành C', phone: '0987 654 321', selected: false },
    { id: 'f3', name: 'Bạn đồng hành D', phone: '0903 123 456', selected: false }
  ]);

  // AI Preferences
  const [aiPreferences, setAiPreferences] = useState(['Nghỉ dưỡng thư giãn', 'Ẩm thực bản địa']);
  const [aiPrompt, setAiPrompt] = useState('Thích khám phá danh lam thắng cảnh, quán cafe view đẹp, chi phí vừa phải, thưởng thức đặc sản.');

  // Map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routeCasingRef = useRef(null);

  // Auto-resolve city if passed from Explore Screen
  useEffect(() => {
    if (params.city) {
      applyDestination(params.city);
    }
  }, [params.city]);

  const applyDestination = (cityName) => {
    const dest = TripsStore.getOsmDestination(cityName) || TripsStore.createDynamicDestination(cityName);
    setCurrentCityKey(dest.key);
    setDestinationName(dest.fullName || dest.name);
    setTripCoords(dest.coords || [16.0544, 108.2022]);
    setTripTitle(params.tourTitle || `Khám phá ${dest.name}`);
    setIsDestinationSelected(true);

    // Không tự động set 2 ngày 1 đêm - người dùng tự chọn 100%
    if (startDate && endDate) {
      const days = tripDaysCount || 1;
      syncDayPlans(days, dest);
    } else {
      syncDayPlans(1, dest);
    }
    showToast('Đã chọn điểm đến', `Khám phá tại ${dest.name}`);
  };

  // Synchronize Day Plans with target number of days (Đảm bảo KHÔNG LẶP LẠI địa điểm giữa các ngày)
  const syncDayPlans = (targetDays, destOverride) => {
    const dObj = destOverride || TripsStore.getOsmDestination(currentCityKey) || TripsStore.createDynamicDestination(destinationName);
    const basePlans = TripsStore.getDayPlans(dObj?.key || dObj?.name || 'custom') || [];
    let plans = JSON.parse(JSON.stringify(basePlans));

    const daysCount = Math.max(1, targetDays);
    const safeCity = dObj?.name || destinationName || 'Địa phương';
    const lat = dObj?.coords ? dObj.coords[0] : 16.0544;
    const lng = dObj?.coords ? dObj.coords[1] : 108.2022;

    // Tập hợp toàn bộ tên địa điểm đã xuất hiện trong chuyến đi để chống trùng lặp
    const usedPlaceNames = new Set();
    plans.forEach(p => {
      (p.stops || []).forEach(s => {
        if (s.name) usedPlaceNames.add(s.name.trim().toLowerCase());
      });
    });

    const cityHotSpots = TripsStore.getHotSpots(dObj?.key || dObj?.name, 'all') || [];

    while (plans.length < daysCount) {
      const d = plans.length + 1;
      // Lọc các điểm chưa từng xuất hiện trong bất kỳ ngày nào trước đó
      const availableSpots = cityHotSpots.filter(s => !usedPlaceNames.has(s.name.trim().toLowerCase()));

      let dayStops = [];
      if (availableSpots.length >= 2) {
        dayStops = availableSpots.slice(0, 3).map((s, idx) => ({
          id: `stop_${d}_${idx}_${Date.now()}`,
          name: s.name,
          time: idx === 0 ? '08:30' : (idx === 1 ? '14:00' : '18:30'),
          lat: s.lat,
          lng: s.lng,
          status: 'pending',
          note: s.note || `Điểm khám phá Ngày ${d}`
        }));
      } else if (availableSpots.length === 1) {
        dayStops = [
          {
            id: `stop_${d}_1_${Date.now()}`,
            name: availableSpots[0].name,
            time: '09:00',
            lat: availableSpots[0].lat,
            lng: availableSpots[0].lng,
            status: 'pending',
            note: availableSpots[0].note || `Điểm khám phá Ngày ${d}`
          },
          {
            id: `stop_${d}_2_${Date.now()}`,
            name: `Ẩm thực & Cafe Ngày ${d} (${safeCity})`,
            time: '16:00',
            lat: +(lat - 0.015 * d).toFixed(4),
            lng: +(lng + 0.018 * d).toFixed(4),
            status: 'pending',
            note: `Thư giãn ẩm thực Ngày ${d}`
          }
        ];
      } else {
        dayStops = [
          {
            id: `stop_${d}_1_${Date.now()}`,
            name: `Thắng cảnh & Check-in Ngày ${d} (${safeCity})`,
            time: '09:00',
            lat: +(lat + 0.012 * d).toFixed(4),
            lng: +(lng + 0.010 * d).toFixed(4),
            status: 'pending',
            note: `Khám phá các điểm mới mẻ tại ${safeCity}`
          },
          {
            id: `stop_${d}_2_${Date.now()}`,
            name: `Ẩm thực & Cafe Ngày ${d} (${safeCity})`,
            time: '15:30',
            lat: +(lat - 0.015 * d).toFixed(4),
            lng: +(lng + 0.018 * d).toFixed(4),
            status: 'pending',
            note: `Thư giãn và trải nghiệm ẩm thực bản địa`
          }
        ];
      }

      // Đánh dấu các địa điểm mới đã dùng để các ngày tiếp theo không trùng lại
      dayStops.forEach(s => usedPlaceNames.add(s.name.trim().toLowerCase()));

      plans.push({
        dayNumber: d,
        dayTitle: `Ngày ${d}: Khám phá mở rộng & ẩm thực ${safeCity}`,
        duration: '1 ngày',
        highlight: `Trải nghiệm các điểm đến mới mẻ, thư giãn và thưởng thức ẩm thực Ngày ${d}`,
        badge: `Ngày ${d}`,
        stops: dayStops
      });
    }

    if (plans.length > daysCount) {
      plans = plans.slice(0, daysCount);
    }

    plans.forEach((p, idx) => {
      p.dayNumber = idx + 1;
      p.badge = `Ngày ${idx + 1}`;
    });

    setDayPlans(plans);
    const selectedIdx = Math.min(activeDayIndex, plans.length - 1);
    setActiveDayIndex(selectedIdx);
    setActiveStops(plans[selectedIdx]?.stops || []);
  };

  // Add a Day (+ Thêm ngày)
  const handleAddNewDay = () => {
    const newDays = dayPlans.length + 1;
    if (startDate) {
      const newEnd = new Date(startDate.getTime() + (newDays - 1) * 24 * 60 * 60 * 1000);
      setEndDate(newEnd);
    }
    syncDayPlans(newDays);
    setActiveDayIndex(newDays - 1);
    showToast(`Đã thêm Ngày ${newDays}`, 'Lịch trình đã tự động kéo dài thêm 1 ngày');
  };

  // Remove a Day
  const handleRemoveDay = (idx, e) => {
    if (e) e.stopPropagation();
    if (dayPlans.length <= 1) {
      showToast('Không thể xóa', 'Chuyến đi cần tối thiểu 1 ngày');
      return;
    }
    const newDays = dayPlans.length - 1;
    if (startDate) {
      const newEnd = new Date(startDate.getTime() + (newDays - 1) * 24 * 60 * 60 * 1000);
      setEndDate(newEnd);
    }
    const remaining = dayPlans.filter((_, i) => i !== idx).map((p, i) => ({
      ...p,
      dayNumber: i + 1,
      badge: `Ngày ${i + 1}`
    }));
    setDayPlans(remaining);
    const nextIdx = Math.min(activeDayIndex, remaining.length - 1);
    setActiveDayIndex(nextIdx);
    setActiveStops(remaining[nextIdx]?.stops || []);
    showToast('Đã xóa ngày', 'Lịch trình và thời gian đã được rút ngắn tương ứng');
  };

  // Today reference (00:00:00)
  const getToday = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  };

  // Month navigation for calendar (Không cho lùi về các tháng trong quá khứ)
  const isPastMonth = (() => {
    const today = getToday();
    return calYear < today.getFullYear() || (calYear === today.getFullYear() && calMonth <= today.getMonth());
  })();

  const handlePrevMonth = () => {
    if (isPastMonth) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  // Date calculations
  const tripDaysCount = (() => {
    if (!startDate || !endDate) return 1;
    const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  })();

  const formatDateDisplay = (d) => {
    if (!d) return '--/--/----';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Calendar cell click (Người dùng tự chọn 100% trên lịch, không cho chọn ngày đã qua)
  const handleSelectCalDate = (y, m, d) => {
    const picked = new Date(y, m, d);
    picked.setHours(0, 0, 0, 0);

    const today = getToday();
    if (picked.getTime() < today.getTime()) {
      showToast('Không thể chọn', 'Không thể chọn ngày đã qua');
      return;
    }

    if (!startDate || (startDate && endDate)) {
      // Bấm lần đầu: chọn ngày khởi hành
      setStartDate(picked);
      setEndDate(null);
      showToast('Đã chọn ngày khởi hành', `${formatDateDisplay(picked)} • Chạm thêm ngày kết thúc`);
    } else if (startDate && !endDate) {
      // Bấm lần hai: chọn ngày kết thúc
      let s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      let e = picked;
      if (picked.getTime() < s.getTime()) {
        e = s;
        s = picked;
      }
      setStartDate(s);
      setEndDate(e);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      syncDayPlans(days);
      showToast('Đã chọn thời gian', days === 1 ? '1 ngày' : `${days} ngày ${days - 1} đêm`);
    }
  };

  // Initialize and update preview map
  useEffect(() => {
    if (!isDestinationSelected || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      }).setView(tripCoords, 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView(tripCoords, 12);
    }

    // Render markers & OSRM road route
    renderMapRoute();
  }, [isDestinationSelected, tripCoords, activeStops]);

  const renderMapRoute = async () => {
    if (!mapInstanceRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    if (routeCasingRef.current) mapInstanceRef.current.removeLayer(routeCasingRef.current);
    if (routePolylineRef.current) mapInstanceRef.current.removeLayer(routePolylineRef.current);

    if (activeStops && activeStops.length > 0) {
      activeStops.forEach((s, idx) => {
        if (!s.lat || !s.lng) return;
        const pinHtml = `
          <div class="w-5 h-5 rounded-full bg-[#0066cc] border-2 border-[#ffffff] flex items-center justify-center text-[#ffffff] text-[10px] font-bold shadow-sm">
            ${idx + 1}
          </div>
        `;
        const icon = L.divIcon({ html: pinHtml, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
        L.marker([s.lat, s.lng], { icon }).addTo(markersRef.current);
      });

      if (activeStops.length > 1) {
        try {
          const road = await TripsStore.getRoadRoute(activeStops);
          routeCasingRef.current = L.polyline(road.latLngs, {
            color: '#ffffff',
            weight: 5,
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(mapInstanceRef.current);

          routePolylineRef.current = L.polyline(road.latLngs, {
            color: '#0066cc',
            weight: 3.5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(mapInstanceRef.current);

          mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [20, 20] });
        } catch (e) {
          mapInstanceRef.current.setView([activeStops[0].lat, activeStops[0].lng], 12);
        }
      } else {
        mapInstanceRef.current.setView([activeStops[0].lat, activeStops[0].lng], 13);
      }
    }
  };

  // Add custom place (Có ràng buộc chống trùng lặp với các địa điểm đã có/đã đi)
  const handleAddCustomPlace = async () => {
    if (!customPlaceInput.trim()) return;
    const query = customPlaceInput.trim();
    setCustomPlaceInput('');

    const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    // Kiểm tra xem địa điểm này đã có trong bất kỳ ngày nào của chuyến đi chưa
    const allExistingStops = [];
    dayPlans.forEach(p => (p.stops || []).forEach(s => allExistingStops.push(s)));
    activeStops.forEach(s => allExistingStops.push(s));

    const isAlreadyInTrip = allExistingStops.some(s => 
      norm(s.name) === norm(query)
    );

    if (isAlreadyInTrip) {
      showToast('Đã có trong chuyến đi', `"${query}" đã có trong lịch trình, không thể thêm lại.`);
      return;
    }

    try {
      const results = await TripsStore.searchOsmPlaces(currentCityKey, query);
      const first = results && results[0];
      const placeName = first ? first.name : query;

      // Kiểm tra lại với tên chuẩn hoặc tọa độ tương đương (< 80m) từ OpenStreetMap
      const isResolvedDuplicate = allExistingStops.some(s => {
        if (norm(s.name) === norm(placeName)) return true;
        if (first && s.lat && s.lng && first.lat && first.lng) {
          const latDiff = Math.abs(s.lat - first.lat);
          const lngDiff = Math.abs(s.lng - first.lng);
          if (latDiff < 0.0008 && lngDiff < 0.0008) return true;
        }
        return false;
      });

      if (isResolvedDuplicate) {
        showToast('Đã có trong chuyến đi', `"${placeName}" đã tồn tại trong hành trình.`);
        return;
      }

      const newStop = {
        id: `custom_${Date.now()}`,
        name: placeName,
        time: '14:00',
        lat: first ? first.lat : tripCoords[0],
        lng: first ? first.lng : tripCoords[1],
        status: 'pending',
        note: first ? (first.note || 'Địa điểm khám phá') : 'Địa điểm tự nhập'
      };
      const updated = [...activeStops, newStop];
      setActiveStops(updated);
      if (dayPlans[activeDayIndex]) {
        dayPlans[activeDayIndex].stops = updated;
      }
      showToast('Đã thêm điểm', newStop.name);
    } catch (e) {
      showToast('Lỗi', 'Không thể xác định vị trí');
    }
  };

  // Save Trip Submission
  const handleSubmitTrip = () => {
    if (!startDate || !endDate) {
      showToast('Chưa chọn ngày', 'Vui lòng chọn ngày đi và ngày về trên lịch');
      setIsEditingSchedule(true);
      return;
    }

    const durationStr = tripDaysCount <= 1 ? '1 ngày' : `${tripDaysCount} ngày ${tripDaysCount - 1} đêm`;
    const selectedFriends = friendsList.filter(f => f.selected);

    // Đồng bộ các trạm của ngày hiện tại vào dayPlans
    const updatedDayPlans = [...dayPlans];
    if (updatedDayPlans[activeDayIndex]) {
      updatedDayPlans[activeDayIndex] = {
        ...updatedDayPlans[activeDayIndex],
        stops: activeStops
      };
    }

    // Tập hợp toàn bộ các trạm qua các ngày với cơ chế chống trùng lặp tuyệt đối
    const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const allUniqueStops = [];
    const seenNames = new Set();
    updatedDayPlans.forEach(plan => {
      (plan.stops || []).forEach(s => {
        const key = norm(s.name);
        if (key && !seenNames.has(key)) {
          seenNames.add(key);
          allUniqueStops.push(s);
        }
      });
    });

    const finalStops = allUniqueStops.length > 0 ? allUniqueStops : activeStops;

    const newTrip = TripsStore.createTrip({
      title: tripTitle || `Chuyến đi ${destinationName}`,
      destination: destinationName,
      city: destinationName.split(',')[0].trim(),
      cityKey: currentCityKey,
      coords: tripCoords,
      startDate: formatDateDisplay(startDate),
      endDate: formatDateDisplay(endDate),
      duration: durationStr,
      status: 'upcoming',
      members: selectedFriends,
      aiScheduled: isAiOn,
      aiPrompt: isAiOn ? aiPrompt : '',
      aiPreferences: isAiOn ? aiPreferences : [],
      stops: finalStops,
      dayPlans: updatedDayPlans
    });

    showToast('Thành công', 'Đã lưu chuyến đi!');
    push('trackTrip', { id: newTrip.id });
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Top Header */}
      <header className="px-4 py-3 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 z-20">
        <button
          type="button"
          onClick={() => {
            if (isDestinationSelected) {
              setIsDestinationSelected(false);
            } else {
              pop();
            }
          }}
          className="w-8 h-8 rounded-full border border-[#e0e0e0] bg-[#ffffff] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-[15px] font-semibold text-[#1d1d1f]">
          {isDestinationSelected ? 'Kế hoạch chuyến đi' : 'Chọn điểm đến'}
        </h1>
        <div className="w-8" />
      </header>

      {/* STAGE 1: CHỌN ĐỊA ĐIỂM NẾU CHƯA CHỌN */}
      {!isDestinationSelected ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
            <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Bạn muốn đi đâu?</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3 top-3" />
              <input
                type="search"
                value={destSearchInput}
                onChange={async (e) => {
                  setDestSearchInput(e.target.value);
                  if (e.target.value.length >= 2) {
                    const res = await TripsStore.searchOsmLocation(e.target.value);
                    setDestSearchResults(res.slice(0, 5));
                  } else {
                    setDestSearchResults([]);
                  }
                }}
                placeholder="Nhập tên tỉnh thành, địa danh (Đà Lạt, Hội An, Phú Quốc...)"
                className="w-full h-10 pl-9 pr-4 text-[13px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
              />
            </div>

            {destSearchResults.length > 0 && (
              <div className="border border-[#e0e0e0] rounded-xl overflow-hidden divide-y divide-[#f0f0f0]">
                {destSearchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => applyDestination(item.name || item.city)}
                    className="p-2.5 hover:bg-[#f5f5f7] cursor-pointer flex items-center justify-between text-[12px] apple-press"
                  >
                    <div>
                      <p className="font-semibold text-[#1d1d1f]">{item.name || item.city}</p>
                      <p className="text-[10px] text-[#7a7a7a]">{item.fullName || item.display_name || item.province}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7a7a7a]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Popular Destinations */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#7a7a7a] uppercase tracking-wider">
              Điểm đến phổ biến
            </span>
            <div className="grid grid-cols-2 gap-2">
              {['Đà Lạt', 'Hội An', 'Phú Quốc', 'Sa Pa', 'Nha Trang', 'Hà Giang'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => applyDestination(city)}
                  className="p-3 bg-[#ffffff] border border-[#e0e0e0] rounded-xl text-left hover:border-[#0066cc] apple-press flex items-center justify-between"
                >
                  <span className="text-[13px] font-semibold text-[#1d1d1f]">{city}</span>
                  <ChevronRight className="w-3 h-3 text-[#7a7a7a]" />
                </button>
              ))}
            </div>
          </div>

          {/* PROMPT.MD: Dời cái lịch ở khâu tạo lịch trình vô chỗ trong ảnh image.png */}
          <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#0066cc] uppercase tracking-wider">Thời gian</span>
                <h2 className="text-[14px] font-semibold text-[#1d1d1f] mt-0.5">Thời gian chuyến đi</h2>
                <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                  {!startDate && !endDate
                    ? 'Chạm ngày đi và ngày về trên lịch'
                    : startDate && !endDate
                    ? `Khởi hành: ${formatDateDisplay(startDate)} • Chạm ngày về trên lịch`
                    : `Khởi hành: ${formatDateDisplay(startDate)} • Trở về: ${formatDateDisplay(endDate)}`}
                </p>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                startDate && endDate
                  ? 'bg-[#0066cc] text-[#ffffff]'
                  : startDate && !endDate
                  ? 'bg-[#0066cc]/10 text-[#0066cc]'
                  : 'bg-[#f5f5f7] text-[#7a7a7a] border border-[#e0e0e0]'
              }`}>
                {!startDate && !endDate
                  ? 'Chưa chọn ngày'
                  : startDate && !endDate
                  ? 'Chọn ngày về...'
                  : tripDaysCount <= 1
                  ? '1 ngày'
                  : `${tripDaysCount} ngày ${tripDaysCount - 1} đêm`}
              </span>
            </div>

            {/* Calendar Grid (Người dùng tự chọn 100%) */}
            <div className="border-t border-[#f0f0f0] pt-2 space-y-1">
              <div className="flex items-center justify-between pb-1 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={isPastMonth}
                  className={`p-1 rounded-full text-[#1d1d1f] transition ${
                    isPastMonth ? 'opacity-25 cursor-not-allowed' : 'hover:bg-[#f5f5f7] apple-press'
                  }`}
                  title={isPastMonth ? 'Không thể xem các tháng trước' : 'Tháng trước'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="font-semibold text-[13px] text-[#1d1d1f]">
                  Tháng {calMonth + 1}, {calYear}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-full hover:bg-[#f5f5f7] text-[#1d1d1f] apple-press"
                  title="Tháng sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#7a7a7a]">
                <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                {Array.from({ length: (new Date(calYear, calMonth, 1).getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-s1-${i}`} className="h-7" />
                ))}
                {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => {
                  const cellDate = new Date(calYear, calMonth, d);
                  cellDate.setHours(0, 0, 0, 0);
                  const today = getToday();
                  const isPast = cellDate.getTime() < today.getTime();
                  const isToday = cellDate.getTime() === today.getTime();
                  const isStart = startDate && startDate.getTime() === cellDate.getTime();
                  const isEnd = endDate && endDate.getTime() === cellDate.getTime();
                  const isBetween = startDate && endDate && cellDate.getTime() > startDate.getTime() && cellDate.getTime() < endDate.getTime();

                  let cellStyle = 'hover:bg-[#f5f5f7] text-[#1d1d1f]';
                  if (isPast) {
                    cellStyle = 'text-[#c7c7cc] opacity-35 cursor-not-allowed';
                  } else if (isStart || isEnd) {
                    cellStyle = 'bg-[#0066cc] text-[#ffffff] font-bold shadow-sm';
                  } else if (isBetween) {
                    cellStyle = 'bg-[#0066cc]/10 text-[#0066cc] font-medium';
                  } else if (isToday) {
                    cellStyle = 'border border-[#0066cc] text-[#0066cc] font-semibold hover:bg-[#0066cc]/10';
                  }

                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={isPast}
                      onClick={() => !isPast && handleSelectCalDate(calYear, calMonth, d)}
                      className={`h-7 w-full rounded-full flex items-center justify-center transition-colors ${
                        isPast ? '' : 'apple-press'
                      } ${cellStyle}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STAGE 2: CHI TIẾT TẠO CHUYẾN ĐI */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">

            {/* SECTION 1: Destination Header & EXPANDED OSRM Map */}
            <section className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#0066cc] uppercase tracking-wider">
                    Điểm đến đã chọn
                  </span>
                  <h2 className="text-[15px] font-semibold text-[#1d1d1f] mt-0.5">{destinationName}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDestinationSelected(false)}
                  className="text-[11px] text-[#0066cc] font-medium hover:underline apple-press"
                >
                  Đổi điểm đến
                </button>
              </div>

              {/* Trip Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[#7a7a7a] uppercase tracking-wider">
                  Tên chuyến đi
                </label>
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  className="w-full h-9 px-3 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
                />
              </div>

              {/* PROMPT.MD: Hiển thị map to hơn để người dùng dễ theo dõi lộ trình */}
              <div className="h-64 rounded-2xl overflow-hidden border border-[#e0e0e0] relative shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute top-2.5 left-2.5 bg-[#ffffff]/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#0066cc] border border-[#e0e0e0] z-10 shadow-xs flex items-center space-x-1.5">
                  <Navigation className="w-3 h-3 text-[#0066cc]" />
                  <span>Lộ trình đường bộ OSRM • {activeStops.length} trạm</span>
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-[#ffffff]/95 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] text-[#7a7a7a] border border-[#e0e0e0] z-10">
                  OpenStreetMap
                </div>
              </div>
            </section>

            {/* SECTION 2: THỜI GIAN CHUYẾN ĐI (PROMPT.MD: TỐI GIẢN LẠI, MẶC ĐỊNH LÀ TẮT) */}
            <section className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-[#0066cc]/10 border border-[#0066cc]/20 flex items-center justify-center text-[#0066cc] shrink-0">
                    <Calendar className="w-5 h-5 text-[#0066cc]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-semibold text-[#0066cc] uppercase tracking-wider">
                        Thời gian chuyến đi
                      </span>
                      <span className="text-[10px] text-[#7a7a7a]">
                        • {startDate && endDate ? (tripDaysCount <= 1 ? '1 ngày' : `${tripDaysCount} ngày ${tripDaysCount - 1} đêm`) : 'Chưa chọn ngày'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-[#1d1d1f] truncate mt-0.5">
                      {startDate && endDate
                        ? `${formatDateDisplay(startDate)} — ${formatDateDisplay(endDate)}`
                        : startDate && !endDate
                        ? `Khởi hành: ${formatDateDisplay(startDate)} (chưa chọn ngày về)`
                        : 'Chưa chọn ngày (nhấn Chỉnh sửa lịch)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(!isEditingSchedule)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center space-x-1 apple-press transition shrink-0 ${
                    isEditingSchedule
                      ? 'bg-[#0066cc] text-[#ffffff]'
                      : 'bg-[#f5f5f7] hover:bg-[#e0e0e0] text-[#0066cc] border border-[#e0e0e0]'
                  }`}
                >
                  <span>{isEditingSchedule ? 'Đóng lịch' : 'Chỉnh sửa lịch'}</span>
                </button>
              </div>

              {/* Khi người dùng bấm Chỉnh sửa lịch */}
              {isEditingSchedule && (
                <div className="border-t border-[#f0f0f0] pt-3 space-y-3 anim-sheet-up">
                  {/* Calendar Grid (Người dùng tự chọn 100%) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between pb-1 px-1">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        disabled={isPastMonth}
                        className={`p-1 rounded-full text-[#1d1d1f] transition ${
                          isPastMonth ? 'opacity-25 cursor-not-allowed' : 'hover:bg-[#f5f5f7] apple-press'
                        }`}
                        title={isPastMonth ? 'Không thể xem các tháng trước' : 'Tháng trước'}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="font-semibold text-[12px] text-[#1d1d1f]">
                        Tháng {calMonth + 1}, {calYear}
                      </div>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 rounded-full hover:bg-[#f5f5f7] text-[#1d1d1f] apple-press"
                        title="Tháng sau"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#7a7a7a]">
                      <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                      {Array.from({ length: (new Date(calYear, calMonth, 1).getDay() + 6) % 7 }).map((_, i) => (
                        <div key={`empty-s2-${i}`} className="h-7" />
                      ))}
                      {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => {
                        const cellDate = new Date(calYear, calMonth, d);
                        cellDate.setHours(0, 0, 0, 0);
                        const today = getToday();
                        const isPast = cellDate.getTime() < today.getTime();
                        const isToday = cellDate.getTime() === today.getTime();
                        const isStart = startDate && startDate.getTime() === cellDate.getTime();
                        const isEnd = endDate && endDate.getTime() === cellDate.getTime();
                        const isBetween = startDate && endDate && cellDate.getTime() > startDate.getTime() && cellDate.getTime() < endDate.getTime();

                        let cellStyle = 'hover:bg-[#f5f5f7] text-[#1d1d1f]';
                        if (isPast) {
                          cellStyle = 'text-[#c7c7cc] opacity-35 cursor-not-allowed';
                        } else if (isStart || isEnd) {
                          cellStyle = 'bg-[#0066cc] text-[#ffffff] font-bold shadow-sm';
                        } else if (isBetween) {
                          cellStyle = 'bg-[#0066cc]/10 text-[#0066cc] font-medium';
                        } else if (isToday) {
                          cellStyle = 'border border-[#0066cc] text-[#0066cc] font-semibold hover:bg-[#0066cc]/10';
                        }

                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={isPast}
                            onClick={() => !isPast && handleSelectCalDate(calYear, calMonth, d)}
                            className={`h-7 w-full rounded-full flex items-center justify-center transition-colors ${
                              isPast ? '' : 'apple-press'
                            } ${cellStyle}`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 3: GỢI Ý CHUYẾN ĐI (PROMPT.MD: CHO PHÉP THÊM NGÀY, LỊCH TỰ KÉO DÀI TƯƠNG ỨNG) */}
            <section className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Gợi ý chuyến đi</h2>
                  <p className="text-[11px] text-[#7a7a7a]">Lịch trình chi tiết theo từng ngày</p>
                </div>
                <span className="text-[10px] text-[#0066cc] bg-[#f5f5f7] px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                  {dayPlans.length} ngày
                </span>
              </div>

              {/* Day Plans Cards */}
              <div className="space-y-2">
                {dayPlans.map((plan, idx) => {
                  const isSelected = activeDayIndex === idx;
                  const stopsSummary = (plan.stops || []).map((s, i) => `${i + 1}. ${s.name}`).slice(0, 3).join(' • ');

                  return (
                    <article
                      key={idx}
                      onClick={() => {
                        if (dayPlans[activeDayIndex]) {
                          dayPlans[activeDayIndex].stops = activeStops;
                        }
                        setActiveDayIndex(idx);
                        setActiveStops(plan.stops || []);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer apple-press transition ${
                        isSelected
                          ? 'border-[#0066cc] bg-[#0066cc]/5'
                          : 'border-[#e0e0e0] bg-[#ffffff] hover:border-[#0066cc]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-semibold text-[#0066cc]">
                              Ngày {plan.dayNumber}
                            </span>
                            <span className="text-[10px] text-[#7a7a7a]">• 1 ngày</span>
                          </div>
                          <h3 className="text-[13px] font-semibold text-[#1d1d1f] mt-0.5 truncate">
                            {plan.dayTitle}
                          </h3>
                          <p className="text-[11px] text-[#7a7a7a] mt-0.5 line-clamp-1">{plan.highlight}</p>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            isSelected ? 'bg-[#0066cc] text-[#ffffff]' : 'bg-[#f5f5f7] text-[#7a7a7a]'
                          }`}>
                            {isSelected ? 'Đang chọn' : 'Xem'}
                          </span>

                          {dayPlans.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveDay(idx, e)}
                              className="w-6 h-6 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#7a7a7a] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10"
                              title="Xóa ngày này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-[#f0f0f0] flex items-center justify-between text-[10px] text-[#7a7a7a]">
                        <span className="truncate max-w-[220px]">{stopsSummary || 'Chưa có điểm dừng'}</span>
                        <span className="text-[#0066cc] font-semibold shrink-0">{(plan.stops || []).length} điểm</span>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Add Day Button */}
              <button
                type="button"
                onClick={handleAddNewDay}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#0066cc] text-[#0066cc] hover:bg-[#0066cc]/5 flex items-center justify-center space-x-1 text-[12px] font-medium apple-press transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm ngày (Ngày {dayPlans.length + 1})</span>
              </button>
            </section>

            {/* SECTION 4: ĐỊA ĐIỂM CHUYẾN ĐI (PROMPT.MD: MẶC ĐỊNH TẮT) */}
            <section className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Địa điểm chuyến đi</h2>
                  <p className="text-[11px] text-[#7a7a7a]">Tùy chỉnh điểm dừng trong hành trình</p>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => setIsCustomStopsOn(!isCustomStopsOn)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out apple-press ${
                    isCustomStopsOn ? 'bg-[#0066cc]' : 'bg-[#e0e0e0]'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-[#ffffff] shadow-sm transition duration-200 ${
                    isCustomStopsOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {isCustomStopsOn ? (
                <div className="pt-2 border-t border-[#f0f0f0] space-y-3">
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      value={customPlaceInput}
                      onChange={(e) => setCustomPlaceInput(e.target.value)}
                      placeholder="Tự nhập điểm đến (quán cafe, thắng cảnh...)"
                      className="flex-1 h-9 px-3 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomPlace(); }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomPlace}
                      className="h-9 px-3 bg-[#0066cc] text-[#ffffff] text-[12px] font-medium rounded-full apple-press shrink-0"
                    >
                      + Thêm
                    </button>
                  </div>

                  {/* Active stops list */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                    {activeStops.map((stop, idx) => (
                      <div key={idx} className="p-2 bg-[#f5f5f7] rounded-lg border border-[#e0e0e0] flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="w-4 h-4 rounded-full bg-[#0066cc] text-[#ffffff] text-[9px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-[#1d1d1f] truncate">{stop.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = activeStops.filter((_, i) => i !== idx);
                            setActiveStops(updated);
                            if (dayPlans[activeDayIndex]) dayPlans[activeDayIndex].stops = updated;
                          }}
                          className="text-[#7a7a7a] hover:text-[#ff3b30] text-[11px] font-medium"
                        >
                          Gỡ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[#7a7a7a]">
                  Bật để tùy chỉnh thêm, bớt hoặc tự nhập các địa điểm theo ý thích.
                </p>
              )}
            </section>

            {/* SECTION 5: THÀNH VIÊN THAM GIA (PROMPT.MD: MẶC ĐỊNH TẮT) */}
            <section className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Thành viên tham gia</h2>
                  <p className="text-[11px] text-[#7a7a7a]">Mời bạn bè cùng tham gia chuyến đi</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteFriendsOn(!isInviteFriendsOn)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out apple-press ${
                    isInviteFriendsOn ? 'bg-[#0066cc]' : 'bg-[#e0e0e0]'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-[#ffffff] shadow-sm transition duration-200 ${
                    isInviteFriendsOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {isInviteFriendsOn ? (
                <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
                  {friendsList.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        const updated = [...friendsList];
                        updated[idx].selected = !updated[idx].selected;
                        setFriendsList(updated);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer apple-press transition ${
                        f.selected ? 'border-[#0066cc] bg-[#0066cc]/5' : 'border-[#e0e0e0] bg-[#f5f5f7]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center font-bold text-[11px] text-[#1d1d1f]">
                          {f.name.charAt(f.name.length - 1)}
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-[#1d1d1f]">{f.name}</p>
                          <p className="text-[10px] text-[#7a7a7a]">{f.phone}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-medium ${f.selected ? 'text-[#0066cc]' : 'text-[#7a7a7a]'}`}>
                        {f.selected ? 'Đã chọn' : '+ Mời'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#7a7a7a]">
                  Bật để mời bạn bè cùng tham gia và chia sẻ lịch trình.
                </p>
              )}
            </section>

            {/* SECTION 6: NHỜ AI TỐI ƯU (PROMPT.MD: MẶC ĐỊNH TẮT) */}
            <section className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Nhờ AI tối ưu lịch trình</h2>
                  <p className="text-[11px] text-[#7a7a7a]">Sắp xếp thứ tự các điểm dừng hợp lý</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiOn(!isAiOn)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out apple-press ${
                    isAiOn ? 'bg-[#0066cc]' : 'bg-[#e0e0e0]'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-[#ffffff] shadow-sm transition duration-200 ${
                    isAiOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {isAiOn ? (
                <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {['Nghỉ dưỡng thư giãn', 'Khám phá & check-in', 'Ẩm thực bản địa', 'Gần gũi thiên nhiên'].map((pref) => {
                      const isSelected = aiPreferences.includes(pref);
                      return (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => {
                            setAiPreferences(prev => 
                              prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-[11px] apple-press ${
                            isSelected ? 'bg-[#0066cc] text-[#ffffff]' : 'bg-[#f5f5f7] text-[#1d1d1f] border border-[#e0e0e0]'
                          }`}
                        >
                          {pref}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows="2"
                    className="w-full p-2.5 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f] resize-none"
                  />
                </div>
              ) : (
                <p className="text-[12px] text-[#7a7a7a]">
                  Bật để AI tự động sắp xếp điểm đến theo cung đường ngắn nhất.
                </p>
              )}
            </section>

          </div>

          {/* Floating Save CTA */}
          <div className="p-4 bg-[#ffffff] border-t border-[#e0e0e0] shrink-0">
            <button
              type="button"
              onClick={handleSubmitTrip}
              className="w-full h-11 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[14px] font-semibold rounded-full flex items-center justify-center space-x-2 apple-press"
            >
              <span>Lưu chuyến đi & Theo dõi hành trình</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
