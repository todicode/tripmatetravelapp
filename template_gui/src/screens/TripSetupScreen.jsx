import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, X, Search, MapPin, List, ChevronRight, Calendar, Sparkles, Landmark, Trees, Utensils, ShoppingBag, Camera, Check, ChevronDown, BedDouble, House, Users, ArrowRight } from 'lucide-react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import TripDatePicker, { DayWheel } from '../components/TripDatePicker';
import { countDays, parseLocalDate } from '../utils/tripSetup';
import { getSpotLists } from '../store/savedSpots';
import ManualPlannerScreen from './ManualPlannerScreen';
import SamplePlanScreen from './SamplePlanScreen';
import StablePopup from '../components/StablePopup';
import TripPlanLoading from '../components/TripPlanLoading';
import HotelSetupScreen from './HotelSetupScreen';

const interests = [
  { label: 'Nổi bật', icon: MapPin }, { label: 'Bảo tàng', icon: Landmark },
  { label: 'Thiên nhiên', icon: Trees }, { label: 'Ẩm thực', icon: Utensils },
  { label: 'Lịch sử', icon: Camera }, { label: 'Mua sắm', icon: ShoppingBag }
];
const trending = ['Đà Lạt', 'Đà Nẵng', 'Hà Nội', 'Hội An', 'TP. Hồ Chí Minh'];
const actionClass = 'min-h-11 px-5 rounded-full bg-primary text-white text-[14px] font-semibold apple-press disabled:opacity-40 disabled:cursor-not-allowed';
const cardClass = 'rounded-[18px] bg-canvas p-4';

function SetupSection({ id, title, summary, expanded, disabled, onOpen, children }) {
  const [mounted, setMounted] = useState(expanded);
  useEffect(() => {
    if (expanded) { setMounted(true); return; }
    const timer = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(timer);
  }, [expanded]);
  return (
    <section className="rounded-[18px] bg-canvas overflow-hidden">
      <button type="button" id={`${id}-heading`} aria-expanded={expanded} aria-controls={`${id}-content`} disabled={disabled} onClick={onOpen}
        className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left apple-press disabled:cursor-default">
        <span className={`text-[17px] font-semibold ${disabled ? 'text-ink-muted' : 'text-ink'}`}>{title}</span>
        {!expanded && <span className="ml-auto text-right text-[14px] leading-[1.43] text-primary line-clamp-2 max-w-[65%]">{summary}</span>}
        <ChevronDown aria-hidden="true" className={`shrink-0 w-4 h-4 text-ink-muted transition-transform duration-300 ${expanded ? 'ml-auto rotate-180' : ''}`} />
      </button>
      <div id={`${id}-content`} role="region" aria-labelledby={`${id}-heading`} aria-hidden={!expanded} inert={!expanded}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">{mounted && <div className={`px-4 pb-4 ${expanded ? 'anim-trip-step-down' : ''}`}>{children}</div>}</div>
      </div>
    </section>
  );
}

function RoutePreview() {
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-parchment aspect-[4/3] w-full max-w-[360px] mx-auto">
      <svg viewBox="0 0 360 270" className="w-full h-full" role="img" aria-label="Minh họa hành trình từ điểm xuất phát qua hai địa điểm đến điểm kết thúc">
        <path d="M0 220L0 270H150L90 170L65 0H0Z" fill="#dce9f5" />
        <path d="M65 0H360V210L150 245L95 150Z" fill="#e8eddf" />
        <path d="M65 55H240C315 55 315 125 230 125H150C70 125 70 200 170 200H280" fill="none" stroke="#0066cc" strokeWidth="6" strokeLinecap="round" />
        {[{ x: 65, y: 55, t: 'S' }, { x: 230, y: 55, t: '1' }, { x: 150, y: 125, t: '2' }, { x: 280, y: 200, t: '✓' }].map(p => <g key={p.t}><circle cx={p.x} cy={p.y} r="17" fill="white" stroke="#0066cc" strokeWidth="3" /><text x={p.x} y={p.y + 5} textAnchor="middle" fill="#0066cc" fontSize="16" fontFamily="system-ui">{p.t}</text></g>)}
      </svg>
      <span className="absolute top-[31%] right-4 bg-canvas rounded-lg px-3 py-2 text-[12px] text-ink">Điểm tham quan</span>
      <span className="absolute top-[57%] left-4 bg-canvas rounded-lg px-3 py-2 text-[12px] text-ink">Nơi bạn yêu thích</span>
    </div>
  );
}

export default function TripSetupScreen({ params = {} }) {
  const { pop, push, showToast } = useNav();
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState(() => params.city ? TripsStore.getOsmDestination(params.city) : null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importedSpots, setImportedSpots] = useState([]);
  const [dateMode, setDateMode] = useState('flexible');
  const [days, setDays] = useState(3);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [preferences, setPreferences] = useState([]);
  const [lodgingType, setLodgingType] = useState('undecided');
  const [hotelSetupOpen, setHotelSetupOpen] = useState(false);
  const [hotelStays, setHotelStays] = useState([]);
  const [sampleVisible, setSampleVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiNotesOpen, setAiNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const aiNotesDecision = useRef(null);
  const [editing, setEditing] = useState(false);
  const [plannerDraft, setPlannerDraft] = useState(null);
  const searchInputRef = useRef(null);
  const contentRef = useRef(null);
  const duration = dateMode === 'flexible' ? days : countDays(start, end);
  const cityLists = getSpotLists();
  const setup = useMemo(() => ({ destination, dateMode, days: duration, start: dateMode === 'specific' ? start : '', end: dateMode === 'specific' ? end : '', preferences, importedSpots, aiNotes, lodgingType, hotelStays }), [destination, dateMode, duration, start, end, preferences, importedSpots, aiNotes, lodgingType, hotelStays]);

  useEffect(() => { contentRef.current?.scrollTo(0, 0); }, [step]);
  useEffect(() => { setHotelStays(previous => previous.filter(stay => stay.endDay <= duration && (duration === 1 || stay.endDay > stay.startDay))); }, [duration]);
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) { setResults([]); setSearching(false); setSearchError(''); return; }
    let current = true;
    setResults([]); setSearching(true); setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const locations = await TripsStore.searchOsmLocation(query);
        if (current) setResults(locations.filter(d => d.source !== 'generated' && Number.isFinite(Number(d.coords?.[0] ?? d.lat)) && Number.isFinite(Number(d.coords?.[1] ?? d.lon))));
      } catch { if (current) setSearchError('Không thể tìm kiếm lúc này. Vui lòng thử lại.'); }
      finally { if (current) setSearching(false); }
    }, 450);
    return () => { current = false; clearTimeout(timer); };
  }, [query, searchOpen]);

  const chooseDestination = (item, spots = []) => {
    setDestination({ ...item, name: item.name || item.city, coords: item.coords || [Number(item.lat), Number(item.lon ?? item.lng)] });
    setImportedSpots(spots);
    setHotelStays([]);
    setSearchOpen(false); setImportOpen(false); setQuery(''); setStep(1);
  };
  const back = () => {
    if (searchOpen || importOpen) { setSearchOpen(false); setImportOpen(false); }
    else if (step > 0) setStep(step - 1);
    else pop();
  };
  const dateSummary = dateMode === 'flexible' ? `${days} ngày · Chưa chốt ngày đi` : duration ? `${parseLocalDate(start).toLocaleDateString('vi-VN')} — ${parseLocalDate(end).toLocaleDateString('vi-VN')}` : 'Chọn ngày đi và ngày về';
  const continueManually = () => {
    if (!destination || !duration) return;
    setEditing(true);
  };

  if (hotelSetupOpen) return <HotelSetupScreen destination={destination} days={duration} stays={hotelStays} onChange={setHotelStays} onBack={() => setHotelSetupOpen(false)} onDone={() => { setHotelSetupOpen(false); setStep(4); }} />;
  if (editing) return <ManualPlannerScreen setup={setup} tourTitle={params.tourTitle} draft={plannerDraft} onDraftChange={setPlannerDraft} onBack={() => setEditing(false)} />;
  if (generating) return <TripPlanLoading setup={setup} onCancel={() => setGenerating(false)} onComplete={() => { setGenerating(false); setSampleVisible(true); }} />;
  if (sampleVisible) return <SamplePlanScreen setup={setup} onBack={() => setSampleVisible(false)} />;

  return (
    <div className="relative h-full min-h-0 flex flex-col bg-parchment text-ink">
      <header className="h-14 shrink-0 flex items-center justify-between px-3 bg-canvas border-b border-hairline">
        <button type="button" onClick={back} className="w-11 h-11 flex items-center justify-center apple-press" aria-label="Quay lại"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-[17px] font-semibold">Tạo chuyến đi</h1>
        <button type="button" onClick={pop} className="w-11 h-11 flex items-center justify-center apple-press" aria-label="Đóng tạo chuyến đi"><X className="w-5 h-5" /></button>
      </header>
      <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 space-y-3">
        {(searchOpen || importOpen) ? (
          <section className={`${cardClass} mt-3 min-h-full`}>
            <h2 className="text-[21px] font-semibold mb-4">{importOpen ? 'Nhập từ danh sách' : 'Bạn muốn đi đâu?'}</h2>
            {searchOpen && <>
              <div className="relative mb-3"><Search aria-hidden="true" className="absolute left-3 top-3.5 w-4 h-4 text-ink-muted" /><input ref={searchInputRef} aria-label="Tìm điểm đến" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm thành phố hoặc địa điểm" className="w-full h-11 rounded-full bg-parchment pl-9 pr-11 text-[14px] outline-none focus:ring-2 focus:ring-primary-focus" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center"><X className="w-4 h-4" /></button>}</div>
              <p role="status" className="text-[14px] text-ink-muted">{query.trim().length < 2 ? 'Nhập ít nhất 2 ký tự để tìm kiếm.' : searching ? 'Đang tìm điểm đến…' : searchError || (!results.length ? 'Không tìm thấy điểm đến. Thử tên khác.' : '')}</p>
              {results.map((item, i) => <button type="button" key={`${item.key || item.name}-${i}`} onClick={() => chooseDestination(item)} className="w-full min-h-16 py-3 flex gap-3 items-center text-left border-b border-hairline apple-press"><MapPin className="w-5 h-5 text-primary shrink-0" /><span className="min-w-0"><span className="block text-[17px]">{item.name || item.city}</span><span className="block text-[12px] text-ink-muted">{item.fullName || item.display_name}</span></span></button>)}
            </>}
            {importOpen && cityLists.map(({ id, name, spots }) => <button type="button" key={id} disabled={!spots.length} onClick={() => chooseDestination({ name: spots[0].city, fullName: spots[0].city, coords: [spots[0].lat, spots[0].lng] }, spots)} className="w-full min-h-16 py-3 flex items-center gap-3 text-left border-b border-hairline apple-press disabled:opacity-40"><List className="w-5 h-5 text-primary" /><span className="flex-1"><span className="block text-[17px]">{name}</span><span className="block text-[12px] text-ink-muted">{spots.length} địa điểm đã lưu</span></span><ChevronRight className="w-4 h-4" /></button>)}
            {importOpen && !cityLists.length && <p className="text-[14px] text-ink-muted">Chưa có danh sách địa điểm. Bạn có thể tìm điểm đến trước.</p>}
          </section>
        ) : step < 4 ? <>
          <SetupSection id="trip-destination" title="Điểm đến" summary={destination?.name || 'Chọn điểm đến'} expanded={step === 0} onOpen={() => setStep(0)}>
            <button type="button" onClick={() => setSearchOpen(true)} className="w-full min-h-11 flex items-center gap-2 text-[14px] text-ink-muted bg-parchment rounded-full px-3 text-left"><Search className="w-4 h-4" />Tìm điểm đến</button>
            {destination && <button type="button" onClick={() => setStep(1)} className="mt-3 w-full text-left flex items-center gap-2 text-primary min-h-11"><MapPin className="w-5 h-5" />{destination.name}<ChevronRight className="ml-auto w-4 h-4" /></button>}
            <button type="button" onClick={() => setImportOpen(true)} className="w-full mt-3 min-h-16 rounded-[11px] border border-hairline p-3 flex items-center gap-3 text-left apple-press"><List className="w-5 h-5 text-primary" /><span className="flex-1"><span className="block text-[14px] font-semibold">Nhập từ danh sách của tôi</span><span className="block text-[12px] text-ink-muted">Dùng những địa điểm bạn đã lưu</span></span><ChevronRight className="w-4 h-4" /></button>
            <p className="text-[12px] text-ink-muted mt-5 mb-1">Điểm đến nổi bật</p>
            {trending.map(city => <button type="button" key={city} onClick={() => chooseDestination(TripsStore.getOsmDestination(city))} className="w-full min-h-12 py-2 flex items-center gap-3 text-left apple-press"><MapPin className="w-5 h-5 text-primary" /><span><span className="block text-[17px]">{city}</span><span className="block text-[12px] text-ink-muted">Việt Nam</span></span></button>)}
          </SetupSection>
          <SetupSection id="trip-dates" title="Ngày đi" summary={destination ? dateSummary : 'Chọn ngày đi'} expanded={step === 1} disabled={!destination} onOpen={() => setStep(1)}>
          <div className="flex rounded-full bg-parchment p-1 mb-5" role="group" aria-label="Cách chọn ngày">{[['flexible', 'Linh hoạt'], ['specific', 'Ngày cụ thể']].map(([mode, label]) => <button type="button" key={mode} aria-pressed={dateMode === mode} onClick={() => setDateMode(mode)} className={`flex-1 min-h-11 rounded-full text-[14px] ${dateMode === mode ? 'bg-canvas text-primary font-semibold' : 'text-ink-muted'}`}>{label}</button>)}</div>
          {dateMode === 'flexible' ? <><p className="flex items-center justify-center gap-2 text-[14px] text-ink-muted"><Calendar className="w-4 h-4" />Số ngày của chuyến đi</p><DayWheel value={days} onChange={setDays} /><p className="text-center text-[14px] text-ink-muted">{days} ngày · Chốt ngày khởi hành sau</p></> : <TripDatePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />}
          <div className="flex justify-between items-center mt-5"><button type="button" className="min-h-11 text-primary text-[14px] px-2" onClick={() => { setStart(''); setEnd(''); setDays(3); }}>Đặt lại</button><button type="button" disabled={!duration} onClick={() => setStep(2)} className={actionClass}>Tiếp tục</button></div>
          </SetupSection>
          <SetupSection id="trip-preferences" title="Sở thích" summary={preferences.length ? preferences.join(', ') : 'Thêm sở thích'} expanded={step === 2} disabled={!destination || !duration} onOpen={() => setStep(2)}>
          <p className="text-[14px] text-ink-muted leading-[1.43] mt-2 mb-5">Chọn một hoặc nhiều sở thích cho chuyến đi.</p>
          <div className="grid grid-cols-2 gap-3">{interests.map(({ label, icon: Icon }) => { const selected = preferences.includes(label); return <button key={label} type="button" aria-pressed={selected} onClick={() => setPreferences(prev => selected ? prev.filter(p => p !== label) : [...prev, label])} className={`min-h-20 rounded-[11px] px-3 py-4 flex items-center gap-2 text-left text-[14px] border apple-press ${selected ? 'border-primary bg-primary-light text-primary' : 'border-hairline bg-canvas text-ink'}`}><Icon className="w-5 h-5 shrink-0" /><span className="flex-1">{label}</span>{selected && <Check className="w-4 h-4 shrink-0" />}</button>; })}</div>
          <button type="button" onClick={() => { setPreferences([]); setStep(3); }} className="min-h-11 w-full text-primary text-[14px] mt-5 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />Bỏ qua, làm tôi bất ngờ nhé!</button>
          <button type="button" onClick={() => setStep(3)} className={`${actionClass} w-full mt-2`}>Tiếp tục</button>
          </SetupSection>
          <SetupSection id="trip-stay" title="Bạn sẽ nghỉ ở đâu?" summary={{ hotel: hotelStays.length ? `${hotelStays.length} khách sạn` : 'Khách sạn', friends: 'Ở cùng bạn bè', undecided: 'Quyết định sau' }[lodgingType]} expanded={step === 3} disabled={!destination || !duration} onOpen={() => setStep(3)}>
            <p className="text-[14px] text-ink-muted mb-4">Bỏ qua nếu bạn chưa quyết định.</p>
            <div className="space-y-2">{[
              { value: 'hotel', label: 'Khách sạn', icon: BedDouble, color: 'text-primary' },
              { value: 'friends', label: 'Ở cùng bạn bè', icon: Users, color: 'text-success' },
              { value: 'undecided', label: 'Quyết định sau', icon: ArrowRight, color: 'text-ink-muted' }
            ].map(({ value, label, icon: Icon, color }) => <button key={value} type="button" onClick={() => { setLodgingType(value); if (value === 'hotel') setHotelSetupOpen(true); else { setHotelStays([]); setStep(4); } }} className={`w-full min-h-16 rounded-[11px] border px-3 flex items-center gap-3 text-left apple-press transition-colors ${lodgingType === value && value !== 'undecided' ? 'border-primary/40 bg-primary-light' : 'border-transparent bg-parchment hover:border-hairline'}`}><Icon size={24} className={`${color} shrink-0`} /><span className="flex-1 text-[14px] font-semibold">{label}</span>{lodgingType === value && value !== 'undecided' && <Check size={18} className="text-primary" />}</button>)}</div>
          </SetupSection>
        </> : <section className={`${cardClass} space-y-4 text-center anim-trip-step-down`}>
          <h2 className="text-[21px] font-semibold">Cùng lên kế hoạch chuyến đi</h2>
          <p className="text-[14px] text-ink-muted">Chúng tôi sẽ gợi ý những địa điểm bạn sẽ yêu thích.</p>
          <RoutePreview />
          <button type="button" onClick={() => { aiNotesDecision.current = null; setAiNotesOpen(true); }} className={`${actionClass} w-full flex items-center justify-center gap-2`}><Sparkles className="w-4 h-4" />Có, lên lịch giúp tôi!</button>
          <button type="button" onClick={continueManually} className="w-full min-h-11 rounded-full bg-parchment text-primary text-[14px] apple-press">Không, tôi sẽ tự lên lịch</button>
        </section>}
      </div>
      {aiNotesOpen && <StablePopup label="Ghi chú cho AI" onClose={() => {
        setAiNotesOpen(false);
        if (aiNotesDecision.current !== null) {
          setAiNotes(aiNotesDecision.current);
          setGenerating(true);
        }
      }}>{requestClose => <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3"><h2 className="text-[20px] font-semibold">Bạn muốn nhắn gì với AI?</h2><button type="button" data-popup-close aria-label="Đóng ghi chú cho AI" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-parchment"><X size={20} /></button></header>
        <p className="text-[14px] text-ink-muted leading-relaxed">Có điều gì bạn muốn ưu tiên hoặc tránh trong chuyến đi? Thêm một lời nhắn để hành trình hợp ý bạn hơn.</p>
        <label className="text-[14px] font-semibold">Lời nhắn của bạn <span className="font-normal text-ink-muted">(không bắt buộc)</span><textarea value={notesDraft} onChange={event => setNotesDraft(event.target.value)} maxLength={1000} rows={5} className="mt-2 w-full resize-none rounded-[11px] border border-hairline bg-parchment p-3 text-[16px] font-normal outline-none focus:border-primary" /></label>
        <p className="text-[12px] text-ink-muted text-right">{notesDraft.length}/1.000 ký tự</p>
        <p className="text-[12px] text-ink-muted leading-relaxed">Hiện tại app hiển thị lịch trình mẫu. Lời nhắn được lưu cùng chuyến đi để dùng khi tích hợp AI.</p>
        <div className="mt-auto space-y-2"><button type="button" disabled={!notesDraft.trim()} className={`${actionClass} w-full`} onClick={() => { const notes = notesDraft.trim(); if (!notes) return; aiNotesDecision.current = notes; requestClose(); }}>Tiếp tục với lời nhắn</button><button type="button" className="w-full min-h-11 text-primary text-[14px] rounded-full apple-press" onClick={() => { aiNotesDecision.current = ''; requestClose(); }}>Bỏ qua, tạo lịch trình</button></div>
      </div>}</StablePopup>}
    </div>
  );
}
