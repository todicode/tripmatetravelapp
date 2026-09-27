import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Luggage, ListPlus, MapPin, X, ChevronRight } from 'lucide-react';
import { useNav } from '../context/NavContext';

export default function CreateMenu({ onClose }) {
  const { push } = useNav();
  const ref = useRef(null);
  const [closing, setClosing] = useState(false);
  const closeLock = useRef(false);
  const closeTimer = useRef(null);
  const close = useCallback(afterClose => {
    if (closeLock.current) return;
    closeLock.current = true;
    setClosing(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeTimer.current = setTimeout(() => { onClose(); if (typeof afterClose === 'function') afterClose(); }, reducedMotion ? 0 : 180);
  }, [onClose]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('button')?.focus();
    const keyDown = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const buttons = Array.from(ref.current?.querySelectorAll('button') || []);
        const first = buttons[0]; const last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keyDown);
    return () => { document.removeEventListener('keydown', keyDown); previous?.focus(); };
  }, [close]);
  const go = (screen, params) => close(() => push(screen, params));
  const items = [
    { title: 'Tạo chuyến đi mới', description: 'Lên kế hoạch cho hành trình tiếp theo', icon: Luggage, action: () => go('createTrip') },
    { title: 'Tạo danh sách mới', description: 'Gom những địa điểm yêu thích của bạn', icon: ListPlus, action: () => go('explore', { filter: 'lists', createList: true }) },
    { title: 'Thêm địa điểm', description: 'Lưu những nơi bạn muốn khám phá', icon: MapPin, action: () => go('explore', { addSpots: true }) }
  ];
  return (
    <div className={`absolute inset-0 z-50 bg-black/25 backdrop-blur-xs flex flex-col justify-end px-4 pb-8 ${closing ? 'anim-create-backdrop-out' : 'anim-create-backdrop-in'}`} onClick={() => close()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Tạo mới" className={`w-full max-w-[420px] mx-auto ${closing ? 'anim-create-menu-out' : 'anim-create-menu-in'}`} onClick={e => e.stopPropagation()}>
        <div className="bg-parchment p-2 rounded-[18px] space-y-2">
          {items.map(({ title, description, icon: Icon, action }) => <button type="button" key={title} onClick={action} className="w-full min-h-20 rounded-[11px] bg-canvas flex gap-3 items-center text-left p-4 apple-press focus-visible:outline-2 focus-visible:outline-primary-focus"><Icon className="w-7 h-7 text-primary shrink-0" /><span className="flex-1 min-w-0"><span className="block text-[17px] font-semibold text-ink">{title}</span><span className="block text-[12px] leading-[1.43] text-ink-muted mt-1">{description}</span></span><ChevronRight className="w-4 h-4 text-ink-muted shrink-0" /></button>)}
        </div>
        <button type="button" onClick={() => close()} aria-label="Đóng menu tạo mới" className="w-11 h-11 mt-4 mx-auto rounded-full bg-[#1d1d1f] text-white flex items-center justify-center apple-press"><X className="w-6 h-6" /></button>
      </div>
    </div>
  );
}
