import TripMembers from '../components/TripMembers';
import HotelSetupScreen from './HotelSetupScreen';
import TripUtilities from '../components/TripUtilities';
import HotelStaySummary from '../components/HotelStaySummary';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Plus, X, BookmarkPlus, LoaderCircle, Calendar, Sparkles, Car, Footprints, Navigation, MapPin, Trees, Utensils, ShoppingBag, Landmark, Coffee } from 'lucide-react';
import PlannerMap from '../components/PlannerMap';
import PlannerPlacePicker from '../components/PlannerPlacePicker';
import PlaceDetailsSheet from '../components/PlaceDetailsSheet';
import HorizontalScroll from '../components/HorizontalScroll';
import { TripsStore } from '../store/tripsStore';
import { useNav } from '../context/NavContext';
import { sampleDayPlans, mockTransfers } from '../utils/samplePlan';
import { isDuplicateStop, manualTripPayload } from '../utils/manualPlanner';

const dayColors = ['bg-primary', 'bg-danger', 'bg-warning'];
const categoryStyles = {
  food: { label: 'Ẩm thực', icon: Utensils, style: 'bg-warning/10 text-[#875000]' },
  restaurant: { label: 'Nhà hàng', icon: Utensils, style: 'bg-warning/10 text-[#875000]' },
  cafe: { label: 'Cà phê', icon: Coffee, style: 'bg-warning/10 text-[#875000]' },
  nature: { label: 'Thiên nhiên', icon: Trees, style: 'bg-success/10 text-[#247339]' },
  parks: { label: 'Công viên', icon: Trees, style: 'bg-success/10 text-[#247339]' },
  shopping: { label: 'Mua sắm', icon: ShoppingBag, style: 'bg-[#af52de]/10 text-[#8040a0]' },
  culture: { label: 'Văn hóa', icon: Landmark, style: 'bg-danger/10 text-[#b52b24]' },
  attractions: { label: 'Tham quan', icon: Landmark, style: 'bg-danger/10 text-[#b52b24]' },
  checkin: { label: 'Tham quan', icon: MapPin, style: 'bg-primary/10 text-primary' }
};

function DayPlaces({ stops, onRemove, onLocate, onDetails }) {
  return <div>{stops.map((stop, index) => {
    const category = categoryStyles[(stop.category || '').toLowerCase()] || { label: 'Địa điểm', icon: MapPin, style: 'bg-primary/10 text-primary' };
    const Icon = category.icon;
    const transfer = mockTransfers[index % mockTransfers.length];
    const TravelIcon = transfer.mode === 'walk' ? Footprints : Car;
    return <div key={stop.id}>
      <div className="flex items-center gap-2 py-2">
        <span className="w-4 shrink-0 text-center text-[12px] text-ink-muted">{index + 1}</span>
        <button type="button" onClick={() => onDetails(stop)} aria-label={`Xem thông tin ${stop.name}`} className="min-w-0 flex-1 flex items-center gap-3 text-left rounded-[11px] apple-press">
          <img src={stop.image} alt="" loading="lazy" className="w-12 h-12 shrink-0 rounded-lg object-cover bg-parchment" />
        <span className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-[1.43] font-semibold text-ink">{stop.name}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 mt-1 text-[12px] leading-none ${category.style}`}><Icon size={12} aria-hidden="true" />{category.label}</span>
        </span>
        </button>
        <button type="button" onClick={() => onRemove(stop.id)} aria-label={`Xóa ${stop.name} khỏi lịch trình`} className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:bg-danger/10 hover:text-danger apple-press"><X size={18} /></button>
      </div>
      <div className="ml-6 flex items-center justify-between gap-2 pb-1">
        {index < stops.length - 1 ? <span title="Dữ liệu di chuyển mẫu" aria-label={`${transfer.mode === 'walk' ? 'Đi bộ' : 'Ô tô'}: ${transfer.minutes} phút, ${transfer.distance}, dữ liệu mẫu`} className="inline-flex items-center gap-1.5 rounded-full bg-parchment px-3 py-2 text-[12px] text-ink-muted"><TravelIcon size={16} className="text-primary" aria-hidden="true" />{transfer.minutes} phút · {transfer.distance}</span> : <span className="text-[12px] text-ink-muted">Điểm cuối trong ngày</span>}
        <button type="button" onClick={() => onLocate(stop)} aria-label={`Chỉ đường đến ${stop.name} trên bản đồ của app`} className="min-h-11 px-3 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 text-[12px] font-semibold apple-press"><Navigation size={14} />Chỉ đường</button>
      </div>
    </div>;
  })}{stops.length > 1 && <p className="text-[12px] text-ink-muted pt-1">Thời gian và khoảng cách di chuyển là dữ liệu mẫu.</p>}{!stops.length && <p className="py-5 text-[14px] text-ink-muted">Ngày tự do — thêm một địa điểm bạn muốn ghé.</p>}</div>;
}

export default function SamplePlanScreen({ setup, onBack, savedTrip = null, onHotelStaysChange, onMembersChange }) {
  const { push, showToast } = useNav();
  const [tab, setTab] = useState('overview');
  const [hotelSetupOpen, setHotelSetupOpen] = useState(false);
  const [hotelDraft, setHotelDraft] = useState(() => setup.hotelStays || []);
  const [mapTarget, setMapTarget] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const closeDetails = useCallback(() => setSelectedPlace(null), []);
  const listRef = useRef(null);
  useEffect(() => { listRef.current?.scrollTo(0, 0); }, [tab]);
  const saveLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const sample = useMemo(() => {
    if (savedTrip) return { setup, destination: setup.destination, plans: savedTrip.dayPlans, title: savedTrip.title, fallback: false };
    const known = ['dalat', 'hanoi', 'danang', 'hoian', 'saigon', 'barcelona'].map(key => TripsStore.getOsmDestination(key));
    const destination = known.find(item => item.name === setup.destination.name) || known[0];
    const sampleSetup = { ...setup, destination };
    const plans = sampleDayPlans(destination, setup.days);
    return { setup: sampleSetup, destination, plans, title: `Khám phá ${destination.name} · ${plans.length} ngày`, fallback: destination.name !== setup.destination.name };
  }, [setup, savedTrip]);
  const [plans, setPlans] = useState(() => sample.plans);
  const [pickerDay, setPickerDay] = useState(null);
  const closePicker = useCallback(() => setPickerDay(null), []);
  const stops = useMemo(() => plans.flatMap(day => day.stops), [plans]);
  const shownPlans = useMemo(() => tab === 'overview' ? plans : [plans[Number(tab)]], [plans, tab]);
  const shownStops = tab === 'overview' ? stops : shownPlans[0].stops;
  const payload = savedTrip || manualTripPayload(sample.setup, sample.title, plans);
  const removePlace = (dayNumber, id) => {
    if (mapTarget?.id === id) setMapTarget(null);
    setPlans(previous => previous.map(day => day.dayNumber === dayNumber ? { ...day, stops: day.stops.filter(stop => stop.id !== id) } : day));
  };
  const addPlace = place => {
    if (pickerDay === null || isDuplicateStop(plans, place)) return;
    const stop = { ...place, id: `sample_added_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, dayNumber: pickerDay + 1, status: 'pending', image: place.image || sample.destination.image };
    setPlans(previous => previous.map((day, index) => index === pickerDay ? { ...day, stops: [...day.stops, stop] } : day));
    closePicker();
    showToast('Đã thêm địa điểm', place.name);
  };
  const save = () => {
    if (saveLock.current || (!savedTrip && !stops.length)) return;
    saveLock.current = true;
    setSaving(true);
    try {
      if (savedTrip) {
        TripsStore.updateTripPlans(savedTrip.id, plans);
        saveLock.current = false; setSaving(false);
        showToast('Đã lưu thay đổi', 'Lịch trình đã được cập nhật.');
        return;
      }
      const trip = TripsStore.createTrip({ ...payload, image: sample.destination.image, aiScheduled: false, aiPrompt: setup.aiNotes || '' });
      showToast('Đã lưu lịch trình mẫu', 'Bạn có thể xem lại trong Chuyến đi.');
      push('trackTrip', { id: trip.id });
    } catch {
      saveLock.current = false;
      setSaving(false);
      showToast('Chưa lưu được', 'Vui lòng thử lại.');
    }
  };
  return <div className="relative h-full min-h-0 flex flex-col bg-canvas text-ink">
    <div className="relative trip-map min-h-0 shrink-0">
      <PlannerMap coords={sample.destination.coords} stops={shownStops} routePlans={shownPlans} focusedStop={mapTarget} />
      <button type="button" onClick={onBack} aria-label="Quay lại lựa chọn lên lịch" className="absolute top-3 left-3 z-[400] ui-icon-button !bg-canvas"><ArrowLeft size={20} /></button>
      <button type="button" onClick={save} disabled={saving || (!savedTrip && !stops.length)} aria-label={saving ? 'Đang lưu chuyến đi' : 'Lưu chuyến đi'} title="Lưu chuyến đi" aria-busy={saving} className="absolute top-3 right-3 z-[400] min-h-11 rounded-full bg-canvas px-3 flex items-center justify-center gap-1.5 text-primary text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed apple-press">
        {saving ? <LoaderCircle size={20} className="animate-spin" /> : <BookmarkPlus size={20} />}
        <span>{saving ? 'Đang lưu…' : savedTrip ? 'Lưu thay đổi' : 'Lưu'}</span>
      </button>
      {mapTarget && <div className="absolute bottom-5 left-3 right-3 z-[400] bg-canvas rounded-[11px] flex items-center gap-2 pl-3"><MapPin size={16} className="text-primary shrink-0" /><span className="flex-1 min-w-0 truncate text-[14px] font-semibold">{mapTarget.name}</span><button type="button" onClick={() => setMapTarget(null)} aria-label="Đóng vị trí đang xem" className="w-11 h-11 shrink-0 flex items-center justify-center text-ink-muted"><X size={16} /></button></div>}
    </div>
    <div className="relative z-[401] trip-panel min-h-0 shrink-0 flex flex-col rounded-t-[18px] bg-canvas">
      <div aria-hidden="true" className="w-10 h-1 rounded-full bg-hairline mx-auto my-2 shrink-0" />
      <div className="px-4 pb-2 flex items-center gap-3 shrink-0">
        <img src={sample.destination.image} alt="" className="w-12 h-14 rounded-lg object-cover shrink-0" />
        <div className="min-w-0"><h1 className="text-[16px] leading-[1.3] font-semibold">{sample.title}</h1><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1"><p className="text-[12px] text-ink-muted">{plans.length} ngày · {stops.length} địa điểm</p><span className="inline-flex items-center gap-1 text-[12px] text-primary"><Sparkles size={12} />{savedTrip ? 'Lịch trình của bạn' : 'Lịch trình mẫu'}</span></div></div>
      </div>
      {savedTrip && <TripMembers trip={savedTrip} onChange={onMembersChange} />}
      <HorizontalScroll role="group" aria-label="Xem lịch trình theo ngày" className="flex gap-4 px-4 border-b border-hairline shrink-0">
        {[{ id: 'overview', label: 'Tổng quan' }, ...plans.map((day, index) => ({ id: String(index), label: `Ngày ${day.dayNumber}` }))].map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={event => { setTab(item.id); setMapTarget(null); const button = event.currentTarget; button.parentElement.scrollTo({ left: Math.max(0, button.offsetLeft - button.parentElement.offsetLeft - 16), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }} className={`relative min-h-11 shrink-0 whitespace-nowrap text-[14px] font-semibold apple-press ${tab === item.id ? 'text-ink' : 'text-ink-muted'}`}>{item.label}{tab === item.id && <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />}</button>)}
      </HorizontalScroll>
      <div key={tab} ref={listRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-3 space-y-5 anim-content-switch">
        {!savedTrip && tab === 'overview' && <p className="text-[12px] text-ink-muted leading-[1.43]">Đây là mẫu có sẵn, chưa được tạo bằng AI. Nét đứt thể hiện thứ tự ghé các điểm.{sample.fallback && ` Tạm minh họa bằng Đà Lạt vì chưa có mẫu cho ${setup.destination.name}.`}</p>}
        {tab === 'overview' && setup.aiNotes && <div className="rounded-[11px] bg-parchment p-3 text-[14px]"><p className="font-semibold mb-1">Lời nhắn cho AI</p><p className="text-ink-muted whitespace-pre-wrap break-words">{setup.aiNotes}</p></div>}
        {savedTrip && tab === 'overview' && !setup.hotelStays?.length && <div className="rounded-[11px] border border-dashed border-hairline bg-parchment p-3"><p className="text-[14px] text-ink-muted mb-2">Bạn chưa chọn khách sạn cho chuyến đi.</p><button type="button" onClick={() => { setHotelDraft(setup.hotelStays || []); setHotelSetupOpen(true); }} className="min-h-11 flex items-center gap-2 text-primary text-[14px] font-semibold apple-press"><Plus size={18} />Thêm khách sạn</button></div>}
        {shownPlans.map(day => <div key={day.dayNumber}>
          {tab === 'overview' && <HotelStaySummary stays={(setup.hotelStays || []).filter(stay => stay.startDay === day.dayNumber)} />}
          {tab === 'overview' && <div className="flex items-center gap-2 mb-2"><span className={`rounded-full px-2 py-1 text-[12px] text-white font-semibold ${dayColors[(day.dayNumber - 1) % dayColors.length]}`}>Ngày {day.dayNumber}</span><h2 className="flex-1 min-w-0 text-[14px] font-semibold truncate">{sample.destination.name}</h2><span className="text-[12px] text-ink-muted">{day.stops.length} địa điểm</span></div>}
          {tab === 'overview' ? <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{day.stops.map(stop => <button type="button" key={stop.id} onClick={() => setSelectedPlace(stop)} aria-label={`Xem ${stop.name} trong ngày ${day.dayNumber}`} className="shrink-0 rounded-lg apple-press"><img src={stop.image} alt={stop.name} loading="lazy" className="w-12 h-14 rounded-lg object-cover" /></button>)}{!day.stops.length && <p className="text-[14px] text-ink-muted">Ngày tự do — thêm một địa điểm bạn muốn ghé.</p>}</div> : <DayPlaces stops={day.stops} onRemove={id => removePlace(day.dayNumber, id)} onLocate={stop => setMapTarget({ ...stop })} onDetails={setSelectedPlace} />}
          <button type="button" onClick={() => setPickerDay(day.dayNumber - 1)} aria-label={`Thêm địa điểm vào ngày ${day.dayNumber}`} className="min-h-11 mt-2 flex items-center gap-2 text-[14px] text-primary rounded-full px-2 apple-press"><Plus size={18} />Thêm địa điểm</button>
        </div>)}
        <p className="flex gap-2 items-center text-[12px] text-ink-muted"><Calendar size={14} />{setup.dateMode === 'flexible' ? 'Ngày khởi hành linh hoạt' : `${payload.startDate} – ${payload.endDate}`}</p>
      </div>
    </div>
    {savedTrip && <TripUtilities trip={savedTrip} />}
    {selectedPlace && <PlaceDetailsSheet contained key={selectedPlace.id} place={selectedPlace} city={sample.destination.name} onClose={closeDetails} onLocate={place => { setTab(String(place.dayNumber - 1)); setMapTarget({ ...place }); closeDetails(); }} />}
    {pickerDay !== null && <div data-modal-layer className="trip-panel-overlay z-[500]"><PlannerPlacePicker destination={sample.destination} plans={plans} day={pickerDay} onAdd={addPlace} onClose={closePicker} /></div>}
    {hotelSetupOpen && <div data-modal-layer className="absolute inset-0 z-[700] bg-canvas">
      <HotelSetupScreen destination={setup.destination} days={plans.length} stays={hotelDraft} onChange={setHotelDraft} onBack={() => setHotelSetupOpen(false)} onDone={() => {
        try {
          onHotelStaysChange(hotelDraft);
          setHotelSetupOpen(false);
          showToast('Đã lưu khách sạn', 'Nơi nghỉ đã được thêm vào chuyến đi.');
        } catch { showToast('Chưa lưu được', 'Vui lòng kiểm tra ngày lưu trú và thử lại.'); }
      }} />
    </div>}
  </div>;
}
