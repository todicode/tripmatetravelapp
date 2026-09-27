import React, { useEffect, useRef, useState } from 'react';
import { Pin, PinOff, Plus, X, Search, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { TripsStore } from '../store/tripsStore';
import { getChatPin, setChatPin, removeChatPin } from '../store/chatPins';
import { useNav } from '../context/NavContext';

export default function ChatTripPin({ chatKey }) {
  const { push, showToast } = useNav();
  const [tripId, setTripId] = useState(() => getChatPin(chatKey));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panel = useRef(null);
  const trip = tripId ? TripsStore.getTripById(tripId) : null;
  const trips = TripsStore.getAllTrips();
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  const filtered = trips.filter(item => normalize(`${item.title} ${item.city || item.destination || ''}`).includes(normalize(query)));
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    panel.current?.querySelector('button')?.focus({ preventScroll: true });
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key === 'Tab') {
        const controls = Array.from(panel.current?.querySelectorAll('button:not(:disabled), input') || []);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus({ preventScroll: true }); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus({ preventScroll: true }); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus({ preventScroll: true }); };
  }, [open]);
  const showPicker = () => { setQuery(''); setOpen(true); };
  const pin = item => {
    setChatPin(chatKey, item.id);
    setTripId(item.id);
    setOpen(false);
    showToast('Đã ghim lịch trình', item.title);
  };
  return <>
    {trip ? <div className="bg-canvas border-b border-hairline px-3 flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => push('trackTrip', { id: trip.id })} aria-label={`Xem lịch trình đã ghim: ${trip.title}`} className="min-h-16 min-w-0 flex-1 flex items-center gap-2 text-left py-2 apple-press">
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Pin size={16} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold text-ink truncate">{trip.title}</span><span className="block text-[12px] text-ink-muted mt-0.5">Đã ghim · {trip.duration || `${trip.dayPlans?.length || 1} ngày`} · {trip.stops?.length || 0} địa điểm</span></span>
        <ChevronRight size={16} className="text-ink-muted shrink-0" />
      </button>
      <button type="button" onClick={showPicker} aria-label="Đổi lịch trình ghim" title="Đổi lịch trình ghim" className="w-11 h-11 shrink-0 flex items-center justify-center text-primary rounded-full hover:bg-parchment apple-press"><RefreshCw size={16} /></button>
      <button type="button" onClick={() => { removeChatPin(chatKey); setTripId(null); showToast('Đã bỏ ghim', 'Lịch trình vẫn có trong Chuyến đi.'); }} aria-label="Bỏ ghim lịch trình" title="Bỏ ghim lịch trình" className="w-11 h-11 shrink-0 flex items-center justify-center text-ink-muted rounded-full hover:bg-parchment apple-press"><PinOff size={16} /></button>
    </div> : <button type="button" onClick={showPicker} className="w-full min-h-11 px-4 flex items-center gap-2 bg-canvas text-primary text-[14px] border-b border-hairline shrink-0 apple-press"><Pin size={16} /><span>Ghim lịch trình</span><Plus size={16} className="ml-auto" /></button>}
    {open && <div data-modal-layer className="absolute inset-0 z-50 bg-black/35 flex items-end" onClick={() => setOpen(false)}>
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="chat-pin-title" onClick={event => event.stopPropagation()} className="w-full h-[78%] rounded-t-[18px] bg-canvas flex flex-col min-h-0 px-4 pb-4 anim-sheet-up">
        <span aria-hidden="true" className="w-10 h-1 rounded-full bg-hairline mx-auto mt-2 mb-3" />
        <header className="flex items-center justify-between gap-2 shrink-0"><h2 id="chat-pin-title" className="text-[20px] font-semibold text-ink">Ghim lịch trình</h2><button type="button" onClick={() => setOpen(false)} aria-label="Đóng chọn lịch trình" className="w-11 h-11 flex items-center justify-center text-ink-muted rounded-full hover:bg-parchment"><X size={20} /></button></header>
        <p className="text-[14px] text-ink-muted mb-4">Chọn một chuyến đi của bạn để ghim vào cuộc trò chuyện này.</p>
        <div className="relative shrink-0 mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Tìm lịch trình để ghim" placeholder="Tìm tên chuyến đi hoặc điểm đến" className="w-full h-11 pl-9 pr-3 rounded-full bg-parchment text-[14px] text-ink outline-none focus:ring-2 focus:ring-primary-focus" /></div>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">{filtered.map(item => <button key={item.id} type="button" onClick={() => pin(item)} className="w-full min-h-20 py-3 flex gap-3 items-center text-left border-b border-parchment apple-press">
          {item.image ? <img src={item.image} alt="" className="w-12 h-14 object-cover rounded-lg shrink-0" /> : <span className="w-12 h-14 flex items-center justify-center bg-parchment rounded-lg shrink-0"><Pin size={20} className="text-primary" /></span>}
          <span className="min-w-0 flex-1"><span className="block text-[14px] leading-[1.43] font-semibold text-ink">{item.title}</span><span className="block text-[12px] text-ink-muted mt-1">{item.duration} · {item.stops?.length || 0} địa điểm</span></span>
          {tripId === item.id ? <Check size={18} className="text-primary shrink-0" /> : <Pin size={16} className="text-ink-muted shrink-0" />}
        </button>)}{!filtered.length && <p role="status" className="text-[14px] text-ink-muted text-center py-8">{trips.length ? 'Không tìm thấy lịch trình phù hợp.' : 'Bạn chưa có chuyến đi. Hãy tạo và lưu chuyến đi trước khi ghim.'}</p>}</div>
      </section>
    </div>}
  </>;
}
