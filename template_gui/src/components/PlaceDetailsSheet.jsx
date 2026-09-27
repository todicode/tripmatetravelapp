import React, { useEffect, useRef, useState } from 'react';
import { X, Bookmark, Navigation, Lightbulb, ChevronDown, Clock, MapPin, Phone, Star } from 'lucide-react';
import { getSavedSpots, saveSpots } from '../store/savedSpots';

const samePlace = (a, b) => a.name.trim().toLocaleLowerCase('vi-VN') === b.name.trim().toLocaleLowerCase('vi-VN') ||
  (Number.isFinite(a.lat) && Number.isFinite(a.lng) && Math.abs(a.lat - b.lat) < .0005 && Math.abs(a.lng - b.lng) < .0005);

export default function PlaceDetailsSheet({ place, city, onClose, onLocate, contained = false }) {
  const panel = useRef(null);
  const [saved, setSaved] = useState(() => getSavedSpots().some(spot => samePlace(spot, place)));
  const [sourcesOpen, setSourcesOpen] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector('button')?.focus({ preventScroll: true });
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(panel.current?.querySelectorAll('button:not(:disabled), a[href]') || []);
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus({ preventScroll: true }); }
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus({ preventScroll: true }); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus({ preventScroll: true }); };
  }, [onClose]);
  const toggleSaved = () => {
    const spots = getSavedSpots();
    saveSpots(saved ? spots.filter(spot => !samePlace(spot, place)) : [...spots, { ...place, id: `saved_${Date.now()}`, city: place.city || city }]);
    setSaved(!saved);
  };
  const notes = place.communityNotes?.length ? place.communityNotes : [
    ...(place.note ? [place.note] : []),
    'Kiểm tra giờ mở cửa và giá vé trước khi ghé.',
    'Dành thêm thời gian di chuyển nếu đi vào giờ cao điểm.'
  ];
  return <div data-modal-layer className={`${contained ? 'trip-panel-overlay' : 'absolute inset-0 bg-black/35'} z-[600] flex items-end`} onClick={onClose}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="place-details-title" onClick={event => event.stopPropagation()} className="w-full h-[92%] min-h-0 rounded-t-[18px] bg-canvas flex flex-col anim-sheet-up">
      <div aria-hidden="true" className="w-10 h-1 rounded-full bg-hairline mx-auto mt-2 mb-3 shrink-0" />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-4">
        <header className="flex items-start gap-2 mb-4"><h2 id="place-details-title" className="flex-1 text-[24px] leading-[1.2] font-semibold tracking-tight text-ink break-words">{place.name}</h2><button type="button" onClick={onClose} aria-label="Đóng chi tiết địa điểm" className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:bg-parchment apple-press"><X size={20} /></button></header>
        <img src={place.image} alt={place.name} className="w-full aspect-[16/10] object-cover rounded-[18px] bg-parchment" />
        {place.rating && <p className="flex items-center gap-1.5 text-[14px] mt-3 text-ink-muted"><Star size={15} className="text-warning fill-warning" /><span className="font-semibold text-ink">{place.rating}</span>{place.reviewsCount && <span>· {place.reviewsCount} đánh giá</span>}</p>}
        <section className="mt-5"><h3 className="text-[17px] font-semibold text-ink">Về địa điểm này</h3><p className="text-[14px] leading-[1.6] text-ink-muted mt-2">{place.description || place.note || `Một điểm ghé trong lịch trình tại ${city}. Thông tin chi tiết đang được cập nhật.`}</p></section>
        <section className="mt-5 rounded-[18px] overflow-hidden border border-hairline"><h3 className="flex items-center gap-2 px-4 py-3 bg-warning/10 text-[14px] font-semibold text-ink"><Lightbulb size={17} className="text-[#875000]" />{place.communityNotes?.length ? 'Ghi chú cộng đồng' : 'Ghi chú tham khảo'}</h3><ul className="list-disc pl-8 pr-4 py-3 space-y-2 text-[14px] leading-[1.5] text-ink-muted">{notes.map((note, index) => <li key={index}>{note}</li>)}</ul></section>
        <button type="button" aria-expanded={sourcesOpen} onClick={() => setSourcesOpen(!sourcesOpen)} className="min-h-11 w-full flex items-center justify-between text-[14px] text-ink-muted apple-press">Nguồn thông tin<ChevronDown size={17} className={sourcesOpen ? 'rotate-180' : ''} /></button>
        {sourcesOpen && <p className="text-[12px] leading-[1.5] text-ink-muted pb-3">Dữ liệu địa điểm và lịch trình mẫu trong ứng dụng. Ghi chú tham khảo không phải đánh giá đã xác minh từ cộng đồng.</p>}
        <div className="divide-y divide-parchment text-[14px] text-ink-muted">
          <p className="flex items-start gap-3 py-3"><Clock size={18} className="shrink-0 mt-0.5" /><span>{place.openingHours || place.opening_hours || 'Chưa cập nhật giờ mở cửa'}</span></p>
          <p className="flex items-start gap-3 py-3"><MapPin size={18} className="shrink-0 mt-0.5" /><span>{typeof place.address === 'string' ? place.address : place.fullName || city}</span></p>
          <p className="flex items-start gap-3 py-3"><Phone size={18} className="shrink-0 mt-0.5" /><span>{place.phone || 'Chưa cập nhật số điện thoại'}</span></p>
        </div>
      </div>
      <footer className="flex gap-3 px-4 py-3 border-t border-hairline shrink-0"><button type="button" aria-pressed={saved} onClick={toggleSaved} className="flex-1 min-h-11 rounded-full bg-parchment text-[14px] font-semibold text-primary flex items-center justify-center gap-2 apple-press"><Bookmark size={17} className={saved ? 'fill-primary' : ''} />{saved ? 'Đã lưu' : 'Lưu địa điểm'}</button><button type="button" onClick={() => onLocate(place)} className="flex-1 ui-primary-button apple-press"><Navigation size={17} />Chỉ đường</button></footer>
    </section>
  </div>;
}
