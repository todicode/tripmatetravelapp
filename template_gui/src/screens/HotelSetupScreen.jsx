import React, { useEffect, useState } from 'react';
import { ArrowLeft, BedDouble, Search, Check, Plus, Clock, Pencil, X, ChevronDown } from 'lucide-react';
import { TripsStore } from '../store/tripsStore';
import HotelDayWheel from '../components/HotelDayWheel';
import { nextStayGap, validStayRange } from '../utils/hotelStays';

const buttonClass = 'ui-primary-button w-full apple-press disabled:opacity-40';
export default function HotelSetupScreen({ destination, days, stays, onChange, onBack, onDone }) {
  const [phase, setPhase] = useState(stays.length ? 'summary' : 'search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hotel, setHotel] = useState(null);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(days);
  const [timesOpen, setTimesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [notes, setNotes] = useState('');
  const gap = nextStayGap(days, stays);
  const valid = validStayRange(days, stays, startDay, endDay);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    let current = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await TripsStore.searchOsmPlaces(destination.name, query.trim(), { countryCodes: null });
        if (current) setResults(found.filter(item => item.id?.startsWith('osm_')));
      } catch { if (current) setResults([]); }
      finally { if (current) setLoading(false); }
    }, 500);
    return () => { current = false; clearTimeout(timer); };
  }, [query, destination.name]);
  const choose = place => {
    if (!gap) return;
    setHotel(place); setStartDay(gap.startDay); setEndDay(gap.endDay);
    setTimesOpen(false); setNotesOpen(false); setCheckInTime(''); setCheckOutTime(''); setNotes(''); setPhase('dates');
  };
  const back = () => {
    if (phase === 'details') setPhase('dates');
    else if (phase === 'dates') setPhase('search');
    else if (phase === 'search' && stays.length) setPhase('summary');
    else onBack();
  };
  const save = () => {
    if (!hotel || !valid) return;
    onChange([...stays, { id: `stay_${Date.now()}`, hotel, startDay, endDay, checkInTime, checkOutTime, notes: notes.trim() }]);
    setPhase('summary');
  };
  const hotelRow = place => <div className="flex items-center gap-3"><span className="w-12 h-14 rounded-[11px] bg-primary-light flex items-center justify-center shrink-0"><BedDouble size={24} className="text-primary" /></span><div className="min-w-0"><h3 className="text-[16px] font-semibold truncate">{place.name}</h3><p className="text-[12px] text-ink-muted line-clamp-2 mt-1">{place.note || destination.name}{place.sample && ' · Dữ liệu mẫu'}</p></div></div>;
  return <div className="h-full min-h-0 flex flex-col bg-parchment text-ink">
    <header className="h-14 flex items-center px-3 bg-chrome shrink-0"><button type="button" onClick={back} aria-label="Quay lại" className="w-11 h-11 flex items-center justify-center apple-press"><ArrowLeft size={20} /></button><h1 className="text-[17px] font-semibold">Tạo chuyến đi</h1></header>
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 space-y-3">
      <div className="rounded-[18px] bg-canvas p-4 flex gap-2 items-center text-[14px] font-semibold"><Check size={18} className="text-primary" />{destination.name}</div>
      <section key={phase} className="rounded-[18px] bg-canvas p-4 space-y-4 anim-content-switch">
        <h2 className="text-[20px] font-semibold">{phase === 'summary' ? 'Nơi nghỉ của bạn' : 'Thêm khách sạn'}</h2>
        {phase === 'search' && <>
          <div className="relative"><Search size={18} className="absolute left-3 top-3.5 text-ink-muted" /><input value={query} onChange={event => setQuery(event.target.value)} aria-label="Tìm khách sạn" placeholder="Tên khách sạn" className="w-full h-11 pl-10 pr-3 bg-parchment rounded-full text-[16px] outline-none focus:ring-2 focus:ring-primary" /></div>
          {query.trim().length >= 2 ? <><p role="status" className="text-[12px] text-ink-muted">{loading ? 'Đang tìm khách sạn…' : results.length ? 'Kết quả địa điểm từ OpenStreetMap — kiểm tra đúng khách sạn trước khi chọn.' : 'Chưa tìm thấy. Bạn có thể thêm theo tên đã nhập.'}</p>{!loading && results.map(place => <button type="button" key={place.id} onClick={() => choose(place)} className="w-full text-left py-3 border-b border-hairline apple-press">{hotelRow(place)}</button>)}<button type="button" onClick={() => choose({ id: `custom_${Date.now()}`, name: query.trim(), note: 'Địa điểm do bạn nhập, chưa xác minh' })} className="w-full min-h-11 flex gap-2 items-center text-primary text-[14px] apple-press"><Plus size={18} />Dùng tên “{query.trim()}”</button></> : <><p className="text-[12px] text-ink-muted">Khách sạn minh họa để thử giao diện. Nhập tên để tìm địa điểm thật.</p>{['Khách sạn trung tâm', 'Khách sạn ven thành phố'].map((name, index) => <button key={name} type="button" onClick={() => choose({ id: `sample_hotel_${index}`, name, sample: true })} className="w-full text-left py-3 border-b border-hairline apple-press">{hotelRow({ name, sample: true })}</button>)}</>}
        </>}
        {(phase === 'dates' || phase === 'details') && <>{hotelRow(hotel)}
          {phase === 'dates' ? <><p className="text-[14px] text-ink-muted">Chọn ngày nhận và trả phòng trong chuyến đi.</p><div className="grid grid-cols-2 gap-3 py-3"><HotelDayWheel label="Nhận phòng" value={startDay} max={days} onChange={setStartDay} /><HotelDayWheel label="Trả phòng" value={endDay} max={days} onChange={setEndDay} /></div><p role="status" className={`text-[14px] text-center ${valid ? 'text-primary' : 'text-danger'}`}>{valid ? `${endDay - startDay} đêm · Ngày ${startDay} – Ngày ${endDay}` : 'Ngày trả phải sau ngày nhận và không trùng nơi nghỉ đã chọn.'}</p>{days === 1 && <p className="text-[12px] text-ink-muted">Chuyến đi trong ngày, không có đêm lưu trú.</p>}</> : <><p className="text-[14px] text-primary">{endDay - startDay} đêm · Ngày {startDay} – Ngày {endDay}</p><button type="button" onClick={() => setTimesOpen(!timesOpen)} aria-expanded={timesOpen} className="w-full min-h-14 flex gap-2 items-center text-left text-[14px]"><Plus size={20} className="text-primary" /><span className="flex-1">Giờ nhận / trả phòng</span><span className="text-[12px] text-ink-muted">Không bắt buộc</span><ChevronDown size={16} /></button>{timesOpen && <div className="grid grid-cols-2 gap-3 anim-content-switch">{[{ label: 'Giờ nhận', value: checkInTime, change: setCheckInTime }, { label: 'Giờ trả', value: checkOutTime, change: setCheckOutTime }].map(item => <label key={item.label} className="text-[12px] text-ink-muted">{item.label}<input type="time" value={item.value} onChange={event => item.change(event.target.value)} className="w-full h-11 mt-2 bg-parchment px-2 rounded-lg text-[16px] text-ink" /></label>)}</div>}<button type="button" onClick={() => setNotesOpen(!notesOpen)} aria-expanded={notesOpen} className="w-full min-h-14 flex gap-2 items-center text-left text-[14px]"><Pencil size={20} className="text-primary" /><span className="flex-1">Ghi chú</span><span className="text-[12px] text-ink-muted">Không bắt buộc</span><ChevronDown size={16} /></button>{notesOpen && <textarea aria-label="Ghi chú khách sạn" value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} rows={3} className="w-full bg-parchment p-3 rounded-[11px] text-[16px] outline-none focus:ring-2 focus:ring-primary anim-content-switch" />}</>}
        </>}
        {phase === 'summary' && <>{stays.map(stay => <div key={stay.id} className="rounded-[11px] border border-hairline p-3 space-y-2">{hotelRow(stay.hotel)}<div className="flex items-center gap-2"><p className="flex-1 text-[14px] text-primary">{stay.endDay - stay.startDay} đêm · Ngày {stay.startDay} – {stay.endDay}</p><button type="button" onClick={() => onChange(stays.filter(item => item.id !== stay.id))} aria-label={`Xóa ${stay.hotel.name}`} className="w-11 h-11 flex items-center justify-center text-ink-muted apple-press"><X size={18} /></button></div>{(stay.checkInTime || stay.checkOutTime) && <p className="text-[12px] text-ink-muted">Nhận: {stay.checkInTime || 'Chưa chọn'} · Trả: {stay.checkOutTime || 'Chưa chọn'}</p>}{stay.notes && <p className="text-[14px] whitespace-pre-wrap break-words text-ink-muted">{stay.notes}</p>}</div>)}{gap ? <button type="button" onClick={() => { setQuery(''); setPhase('search'); }} className="w-full min-h-14 rounded-[11px] border border-dashed border-primary/40 flex items-center justify-center gap-2 text-primary text-[14px] apple-press"><Plus size={18} />Thêm khách sạn cho ngày còn lại</button> : <p className="text-[14px] text-success flex items-center gap-2"><Check size={18} />Đã sắp xếp đủ nơi nghỉ cho chuyến đi</p>}</>}
      </section>
    </div>
    {phase !== 'search' && <footer className="p-4 bg-chrome shrink-0"><button type="button" disabled={phase === 'dates' && !valid} onClick={() => phase === 'dates' ? setPhase('details') : phase === 'details' ? save() : onDone()} className={buttonClass}>Tiếp tục</button></footer>}
  </div>;
}
