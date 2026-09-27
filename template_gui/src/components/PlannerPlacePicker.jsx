import React, { useEffect, useRef, useState } from 'react';
import { X, Search, MapPin, Plus, Check } from 'lucide-react';
import { TripsStore } from '../store/tripsStore';
import { getSavedSpots } from '../store/savedSpots';
import { isDuplicateStop } from '../utils/manualPlanner';

export default function PlannerPlacePicker({ destination, plans, day, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const saved = getSavedSpots().filter(spot => spot.city === destination.name);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input')?.focus();
    const keyDown = e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const controls = Array.from(ref.current?.querySelectorAll('button:not(:disabled), input') || []);
        if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keyDown);
    return () => { document.removeEventListener('keydown', keyDown); previous?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); setError(''); return; }
    let current = true;
    setLoading(true); setResults([]); setError('');
    const timer = setTimeout(async () => {
      try {
        const places = await TripsStore.searchOsmPlaces(destination.name, query.trim(), { countryCodes: null });
        if (current) {
          const seen = new Set();
          setResults(places.filter(place => {
            const key = place.name.trim().toLowerCase();
            if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || seen.has(key)) return false;
            seen.add(key); return true;
          }));
        }
      } catch { if (current) setError('Không thể tìm địa điểm. Vui lòng thử lại.'); }
      finally { if (current) setLoading(false); }
    }, 500);
    return () => { current = false; clearTimeout(timer); };
  }, [query, destination.name]);
  const places = query.trim().length >= 2 ? results : saved;
  return (
    <div className="absolute inset-0 z-50 bg-black/25 flex items-end justify-center" onClick={onClose}>
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="planner-add-title" onClick={e => e.stopPropagation()} className="w-full bg-canvas rounded-t-[18px] px-4 pb-4 pt-2 h-[78%] min-h-0 flex flex-col">
        <span aria-hidden="true" className="w-10 h-1 rounded-full bg-hairline mx-auto mb-2" />
        <header className="flex justify-between items-center"><div><h2 id="planner-add-title" className="text-[21px] font-semibold">Thêm địa điểm</h2><p className="text-[12px] text-ink-muted">Ngày {day + 1} · {destination.name}</p></div><button type="button" onClick={onClose} aria-label="Đóng tìm địa điểm" className="w-11 h-11 flex items-center justify-center"><X className="w-5 h-5" /></button></header>
        <div className="relative mt-4 mb-3 shrink-0"><Search aria-hidden="true" className="w-4 h-4 absolute left-3 top-3.5 text-ink-muted" /><input aria-label="Tìm địa điểm để thêm vào lịch" value={query} onChange={e => setQuery(e.target.value)} placeholder="Địa danh, quán ăn, quán cà phê…" className="w-full h-11 rounded-full bg-parchment pl-9 pr-11 text-[14px] outline-none focus:ring-2 focus:ring-primary-focus" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center"><X className="w-4 h-4" /></button>}</div>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <p role="status" className="text-[12px] text-ink-muted mb-2">{query.trim().length < 2 ? 'Địa điểm đã lưu · Nhập ít nhất 2 ký tự để tìm thêm' : loading ? 'Đang tìm địa điểm…' : error || `${places.length} kết quả tại ${destination.name}`}</p>
          {!loading && !places.length && <div className="py-8 text-center text-[14px] leading-[1.43] text-ink-muted">{query.trim().length >= 2 ? 'Chưa tìm thấy địa điểm. Thử tên cụ thể hơn.' : 'Chưa có địa điểm đã lưu tại đây. Tìm một nơi để bắt đầu.'}</div>}
          {places.map((place, i) => { const added = isDuplicateStop(plans, place); return <button type="button" key={`${place.id}-${i}`} disabled={added} onClick={() => onAdd(place)} className="w-full min-h-20 py-3 border-b border-hairline flex gap-3 items-center text-left apple-press disabled:opacity-50"><span className="w-11 h-11 rounded-lg bg-parchment flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-primary" /></span><span className="flex-1 min-w-0"><span className="block text-[17px] leading-[1.24]">{place.name}</span><span className="block text-[12px] text-ink-muted mt-1 line-clamp-2">{place.city || place.note || destination.name}</span></span>{added ? <Check aria-label="Đã thêm" className="w-5 h-5 text-primary shrink-0" /> : <Plus className="w-5 h-5 text-primary shrink-0" />}</button>; })}
        </div>
      </section>
    </div>
  );
}
