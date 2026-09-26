import React, { useState, useEffect, useRef } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { 
  ArrowLeft, Navigation, CheckCircle2, Clock, MapPin, 
  DollarSign, CheckSquare, Share2, AlertTriangle, Plus, ChevronRight, Users, Trash2, X 
} from 'lucide-react';
import L from 'leaflet';

export default function TrackTripScreen({ params = {} }) {
  const { pop, showToast } = useNav();
  const [trip, setTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary', 'expenses', 'checklist'
  const [expenses, setExpenses] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpensePayer, setNewExpensePayer] = useState('Bạn (Trưởng đoàn)');
  const [newChecklistText, setNewChecklistText] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(null);
  const polylineRef = useRef(null);
  const casingRef = useRef(null);

  useEffect(() => {
    let foundTrip = null;
    if (params.id) {
      foundTrip = TripsStore.getTripById(params.id);
    }
    if (!foundTrip) {
      const all = TripsStore.getAllTrips();
      foundTrip = all[0] || null;
    }
    setTrip(foundTrip);

    if (foundTrip) {
      setExpenses(TripsStore.getExpenses(foundTrip.id));
      setChecklist(TripsStore.getChecklist(foundTrip.id));
    }
  }, [params.id]);

  // Leaflet Map integration
  useEffect(() => {
    if (!trip || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const coords = trip.coords || [16.0544, 108.2022];
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      }).setView(coords, 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    renderRoute();
  }, [trip]);

  const renderRoute = async () => {
    if (!mapInstanceRef.current || !markersRef.current || !trip || !trip.stops) return;
    markersRef.current.clearLayers();

    if (casingRef.current) mapInstanceRef.current.removeLayer(casingRef.current);
    if (polylineRef.current) mapInstanceRef.current.removeLayer(polylineRef.current);

    trip.stops.forEach((s, idx) => {
      if (!s.lat || !s.lng) return;
      const isCompleted = s.status === 'completed';
      const isActive = s.status === 'active';
      const bgCol = isCompleted ? 'bg-[#34c759]' : (isActive ? 'bg-[#0066cc]' : 'bg-[#7a7a7a]');

      const pinHtml = `
        <div class="w-5 h-5 rounded-full ${bgCol} border-2 border-[#ffffff] flex items-center justify-center text-[#ffffff] text-[10px] font-bold shadow-sm">
          ${idx + 1}
        </div>
      `;
      const icon = L.divIcon({ html: pinHtml, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
      L.marker([s.lat, s.lng], { icon }).addTo(markersRef.current);
    });

    if (trip.stops.length > 1) {
      try {
        const road = await TripsStore.getRoadRoute(trip.stops);
        casingRef.current = L.polyline(road.latLngs, {
          color: '#ffffff',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapInstanceRef.current);

        polylineRef.current = L.polyline(road.latLngs, {
          color: '#0066cc',
          weight: 3.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [20, 20] });
      } catch (e) {
        mapInstanceRef.current.setView([trip.stops[0].lat, trip.stops[0].lng], 12);
      }
    }
  };

  const handleToggleStop = (stopId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : (currentStatus === 'active' ? 'completed' : 'active');
    const res = TripsStore.updateStopStatus(trip.id, stopId, nextStatus);
    if (res && res.trip) {
      setTrip({ ...res.trip });
      showToast('Cập nhật trạm dừng', `${res.stop.name}: ${nextStatus}`);
    }
  };

  // Helper to extract clean member details
  const getMemberInfo = (m) => {
    if (!m) return null;
    if (typeof m === 'string') {
      const trimmed = m.trim();
      if (!trimmed) return null;
      return {
        name: trimmed,
        initial: trimmed.charAt(0).toUpperCase() || '?',
        phone: ''
      };
    }
    const name = (m.name || m.fullName || m.username || '').trim();
    if (!name) return null;
    const initial = (m.avatar && m.avatar.length <= 2) ? m.avatar : (name.charAt(0).toUpperCase() || '?');
    return {
      name,
      initial,
      phone: m.phone || ''
    };
  };

  const otherMembers = Array.isArray(trip?.members)
    ? trip.members
        .map(getMemberInfo)
        .filter(info => {
          if (!info) return false;
          const norm = info.name.toLowerCase();
          return !norm.includes('bản thân') && !norm.includes('trưởng đoàn') && norm !== 'tôi' && norm !== 'bạn';
        })
    : [];

  const hasCompanions = otherMembers.length > 0;

  const handleAddExpense = () => {
    if (!newExpenseName.trim() || !newExpenseAmount) return;
    const item = TripsStore.addExpense(trip.id, {
      title: newExpenseName.trim(),
      name: newExpenseName.trim(),
      amount: parseInt(newExpenseAmount, 10) || 0,
      payer: hasCompanions ? newExpensePayer : 'Bạn (Trưởng đoàn)',
      category: 'Khác'
    });
    setExpenses([item, ...expenses]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    showToast('Chi phí', `Đã thêm ${item.title || item.name}`);
  };

  const handleDeleteMember = (memberName) => {
    if (!trip) return;
    const updatedTrip = TripsStore.removeTripMember(trip.id, memberName);
    if (updatedTrip) {
      setTrip({ ...updatedTrip });
      showToast('Thành viên', `Đã xóa ${memberName} khỏi chuyến đi`);
      if (newExpensePayer === memberName) {
        setNewExpensePayer('Bạn (Trưởng đoàn)');
      }
    }
  };

  const handleDeleteExpense = (expenseId, expenseTitle) => {
    if (!trip) return;
    const updatedExpenses = TripsStore.deleteExpense(trip.id, expenseId);
    setExpenses([...updatedExpenses]);
    showToast('Chi phí', `Đã xóa ${expenseTitle || 'khoản chi'}`);
  };

  const handleToggleChecklist = (itemId) => {
    const updated = TripsStore.toggleChecklist(trip.id, itemId);
    setChecklist([...updated]);
  };

  const handleAddChecklist = () => {
    if (!newChecklistText.trim() || !trip) return;
    const item = TripsStore.addChecklistItem(trip.id, newChecklistText.trim());
    if (item) {
      setChecklist([...checklist, item]);
      setNewChecklistText('');
      showToast('Chuẩn bị', `Đã thêm: ${item.text}`);
    }
  };

  const handleDeleteChecklist = (itemId, itemText) => {
    if (!trip) return;
    const updated = TripsStore.deleteChecklistItem(trip.id, itemId);
    setChecklist([...updated]);
    showToast('Chuẩn bị', `Đã xóa: ${itemText}`);
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  if (!trip) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-[13px] text-[#7a7a7a]">Không tìm thấy thông tin chuyến đi.</p>
      </div>
    );
  }

  const completedCount = (trip.stops || []).filter(s => s.status === 'completed').length;
  const totalStops = (trip.stops || []).length;
  const progressPercent = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 z-20">
        <button
          type="button"
          onClick={pop}
          className="w-8 h-8 rounded-full border border-[#e0e0e0] bg-[#ffffff] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center min-w-0 px-2">
          <h1 className="text-[14px] font-semibold text-[#1d1d1f] truncate">{trip.title}</h1>
          <p className="text-[10px] text-[#7a7a7a] truncate">
            {trip.destination}
            {hasCompanions ? ` • ${otherMembers.length + 1} người tham gia` : ''}
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => showToast('Chia sẻ lộ trình', 'Đã sao chép liên kết OpenStreetMap')}
            className="w-8 h-8 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Screen Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Road Route Map */}
        <div className="h-44 bg-[#f5f5f7] border-b border-[#e0e0e0] relative shrink-0">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-2 left-2 bg-[#ffffff]/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-[#e0e0e0] text-[9px] font-semibold text-[#0066cc] z-10">
            {progressPercent}% hoàn thành ({completedCount}/{totalStops} trạm)
          </div>
        </div>

        {/* Segment Tabs */}
        <div className="bg-[#ffffff] border-b border-[#e0e0e0] px-4 py-2 flex space-x-2 shrink-0">
          {[
            { key: 'itinerary', label: 'Lịch trình', icon: Navigation },
            { key: 'expenses', label: 'Chi phí', icon: DollarSign },
            { key: 'checklist', label: 'Chuẩn bị', icon: CheckSquare }
          ].map(t => {
            const IconComp = t.icon;
            const isSel = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-1.5 rounded-full text-[12px] font-medium flex items-center justify-center space-x-1 apple-press ${
                  isSel ? 'bg-[#0066cc] text-[#ffffff]' : 'bg-[#f5f5f7] text-[#7a7a7a]'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panel Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">

          {/* TAB 1: ITINERARY TIMELINE */}
          {activeTab === 'itinerary' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#7a7a7a] pb-1">
                <span>Bấm vào trạm để đổi trạng thái</span>
                <span className="text-[#0066cc]">OSRM Road Route</span>
              </div>

              {trip.stops.map((stop, idx) => {
                const isCompleted = stop.status === 'completed';
                const isActive = stop.status === 'active';

                return (
                  <div
                    key={stop.id || idx}
                    onClick={() => handleToggleStop(stop.id, stop.status)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer apple-press transition ${
                      isActive 
                        ? 'border-[#0066cc] bg-[#0066cc]/5' 
                        : (isCompleted ? 'border-[#e0e0e0] bg-[#f5f5f7] opacity-80' : 'border-[#e0e0e0] bg-[#ffffff]')
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#ffffff] shrink-0 ${
                        isCompleted ? 'bg-[#34c759]' : (isActive ? 'bg-[#0066cc]' : 'bg-[#7a7a7a]')
                      }`}>
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${isCompleted ? 'line-through text-[#7a7a7a]' : 'text-[#1d1d1f]'}`}>
                          {stop.name}
                        </p>
                        <p className="text-[10px] text-[#7a7a7a] mt-0.5 truncate">{stop.time} • {stop.note || 'Trạm dừng'}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      isCompleted 
                        ? 'bg-[#34c759]/10 text-[#34c759]' 
                        : (isActive ? 'bg-[#0066cc] text-[#ffffff]' : 'bg-[#f5f5f7] text-[#7a7a7a]')
                    }`}>
                      {isCompleted ? 'Đã đến' : (isActive ? 'Đang đi' : 'Chưa đến')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {/* Summary Card */}
              <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#7a7a7a]">Tổng chi phí dự kiến</p>
                    <p className="text-[18px] font-bold text-[#0066cc]">{totalExpense.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-[10px] text-[#7a7a7a] bg-[#f5f5f7] px-2.5 py-1 rounded-full border border-[#e0e0e0]">
                      {expenses.length} khoản chi
                    </span>
                    {hasCompanions && (
                      <span className="text-[10px] text-[#0066cc] bg-[#0066cc]/10 px-2 py-0.5 rounded-full font-medium">
                        {otherMembers.length + 1} người tham gia
                      </span>
                    )}
                  </div>
                </div>

                {/* Per-person split: chỉ hiển thị khi có thành viên khác tham gia */}
                {hasCompanions && (
                  <div className="mt-3 pt-3 border-t border-[#f0f0f2] flex items-center justify-between text-[11px]">
                    <span className="text-[#7a7a7a]">Bình quân mỗi người:</span>
                    <span className="font-semibold text-[#1d1d1f]">
                      ~{Math.round(totalExpense / (otherMembers.length + 1)).toLocaleString('vi-VN')} đ / người
                    </span>
                  </div>
                )}
              </div>

              {/* Participating Members Card: Nếu chỉ có bản thân thì không hiển thị ai */}
              {hasCompanions && (
                <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-[#0066cc]" />
                      <span className="text-[12px] font-semibold text-[#1d1d1f]">
                        Thành viên tham gia ({otherMembers.length + 1})
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7a7a7a] bg-[#f5f5f7] px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                      Chia đều chi phí
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Bạn (Trưởng đoàn) */}
                    <div className="p-2.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#0066cc] text-[#ffffff] font-bold text-[11px] flex items-center justify-center shrink-0">
                        B
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[#1d1d1f] truncate">Bạn (Tôi)</p>
                        <span className="text-[9px] text-[#0066cc] font-semibold bg-[#0066cc]/10 px-1.5 py-0.5 rounded">
                          Trưởng đoàn
                        </span>
                      </div>
                    </div>

                    {/* Các thành viên đồng hành */}
                    {otherMembers.map((m, idx) => (
                      <div key={idx} className="p-2.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0 pr-1">
                          <div className="w-7 h-7 rounded-full bg-[#e5e5ea] text-[#1d1d1f] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {m.initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[#1d1d1f] truncate">{m.name}</p>
                            <span className="text-[9px] text-[#7a7a7a]">Thành viên</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMember(m.name);
                          }}
                          title={`Xoá ${m.name}`}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors shrink-0 apple-press"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Expense Form */}
              <div className="bg-[#ffffff] rounded-2xl p-3.5 border border-[#e0e0e0] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#1d1d1f]">Thêm khoản chi</span>
                  {hasCompanions && (
                    <span className="text-[10px] text-[#7a7a7a]">Ghi nhận chi tiêu nhóm</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newExpenseName}
                    onChange={(e) => setNewExpenseName(e.target.value)}
                    placeholder="Tên khoản chi (ăn uống, xăng xe...)"
                    className="flex-1 h-9 px-3 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl outline-none focus:border-[#0066cc]"
                  />
                  <input
                    type="number"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    placeholder="Số tiền (đ)"
                    className="w-24 h-9 px-2 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  {hasCompanions && (
                    <div className="flex-1 flex items-center space-x-1.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl px-2.5 h-9">
                      <span className="text-[10px] text-[#7a7a7a] whitespace-nowrap">Người chi:</span>
                      <select
                        value={newExpensePayer}
                        onChange={(e) => setNewExpensePayer(e.target.value)}
                        className="bg-transparent text-[11px] text-[#1d1d1f] font-medium outline-none w-full"
                      >
                        <option value="Bạn (Trưởng đoàn)">Bạn (Trưởng đoàn)</option>
                        {otherMembers.map((m, idx) => (
                          <option key={idx} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className={`${hasCompanions ? 'px-4' : 'w-full'} h-9 bg-[#0066cc] text-[#ffffff] rounded-xl text-[12px] font-semibold flex items-center justify-center space-x-1 apple-press`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Expense Items List */}
              <div className="space-y-1.5">
                {expenses.length === 0 ? (
                  <div className="p-6 text-center bg-[#ffffff] rounded-2xl border border-[#e0e0e0] text-[#7a7a7a] text-[12px]">
                    Chưa có khoản chi nào được ghi nhận.
                  </div>
                ) : (
                  expenses.map((exp, idx) => (
                    <div key={exp.id || idx} className="p-3 bg-[#ffffff] rounded-2xl border border-[#e0e0e0] flex items-center justify-between text-[13px] shadow-2xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-[#1d1d1f] truncate">
                          {exp.title || exp.name || 'Khoản chi tiêu'}
                        </p>
                        <p className="text-[10px] text-[#7a7a7a] mt-0.5 truncate">
                          {exp.payer || 'Bạn (Trưởng đoàn)'} • {exp.category || 'Chi phí chung'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-semibold text-[#0066cc]">
                          {(exp.amount || 0).toLocaleString('vi-VN')} đ
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id, exp.title || exp.name)}
                          title="Xoá khoản chi"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors apple-press"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              {/* Header & Progress Card */}
              <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[#7a7a7a] uppercase tracking-wider block">
                      Đồ dùng cần chuẩn bị
                    </span>
                    <p className="text-[15px] font-bold text-[#1d1d1f] mt-0.5">
                      {checklist.filter(i => i.checked).length} / {checklist.length} món đồ
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#e0e0e0] bg-[#f5f5f7] text-[#0066cc]">
                    {checklist.length > 0 
                      ? `${Math.round((checklist.filter(i => i.checked).length / checklist.length) * 100)}% hoàn tất`
                      : '0% hoàn tất'}
                  </span>
                </div>
              </div>

              {/* Add Checklist Item Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddChecklist();
                }}
                className="bg-[#ffffff] rounded-2xl p-3 border border-[#e0e0e0] flex items-center space-x-2 shadow-2xs"
              >
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Thêm đồ dùng (áo ấm, thuốc men, sạc...)"
                  className="flex-1 h-9 px-3 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl outline-none focus:border-[#0066cc]"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="h-9 px-4 bg-[#0066cc] text-[#ffffff] rounded-xl text-[12px] font-semibold flex items-center justify-center space-x-1 apple-press disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </form>

              {/* Checklist Items List */}
              <div className="space-y-1.5">
                {checklist.length === 0 ? (
                  <div className="p-6 text-center bg-[#ffffff] rounded-2xl border border-[#e0e0e0] text-[#7a7a7a] text-[12px]">
                    Chưa có đồ dùng chuẩn bị nào. Hãy nhập đồ dùng cần thiết ở ô trên!
                  </div>
                ) : (
                  checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer apple-press transition shadow-2xs ${
                        item.checked ? 'border-[#34c759]/30 bg-[#34c759]/5' : 'border-[#e0e0e0] bg-[#ffffff]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition ${
                          item.checked ? 'bg-[#34c759] border-[#34c759] text-[#ffffff]' : 'border-[#d1d1d6] bg-[#ffffff]'
                        }`}>
                          {item.checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-[12.5px] truncate ${
                          item.checked ? 'line-through text-[#7a7a7a]' : 'text-[#1d1d1f] font-medium'
                        }`}>
                          {item.text}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChecklist(item.id, item.text);
                        }}
                        title={`Xoá ${item.text}`}
                        aria-label={`Xoá ${item.text}`}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors shrink-0 apple-press"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
