import React, { useEffect, useRef } from 'react';

const rowHeight = 56;
export default function HotelDayWheel({ label, value, max, onChange }) {
  const list = useRef(null);
  const drag = useRef(null);
  const dragged = useRef(false);
  useEffect(() => {
    const target = (value - 1) * rowHeight;
    if (list.current && Math.abs(list.current.scrollTop - target) > rowHeight / 2) list.current.scrollTop = target;
  }, [value]);
  useEffect(() => {
    const element = list.current;
    const wheel = event => {
      event.stopPropagation();
      if (max === 1 || (event.deltaY < 0 && element.scrollTop <= 0) || (event.deltaY > 0 && element.scrollTop >= element.scrollHeight - element.clientHeight - 1)) event.preventDefault();
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [max]);
  const finishDrag = event => {
    if (!drag.current) return;
    const clickedDay = drag.current.day;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.style.scrollSnapType = '';
    const day = !dragged.current && clickedDay ? clickedDay : Math.max(1, Math.min(max, Math.round(list.current.scrollTop / rowHeight) + 1));
    list.current.scrollTo({ top: (day - 1) * rowHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    onChange(day);
  };
  return <div className="min-w-0"><p className="text-center text-[12px] text-ink-muted mb-3">{label}</p><div className="relative">
    <div aria-hidden="true" className="absolute top-14 left-0 right-0 h-14 rounded-[11px] bg-primary-light border border-primary/20 pointer-events-none" />
    <div ref={list} role="spinbutton" tabIndex={0} aria-label={`${label}, cuộn để chọn ngày`} aria-valuemin={1} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`Ngày ${value}`} className="hotel-day-wheel relative h-42 py-14 overflow-y-auto no-scrollbar snap-y snap-mandatory touch-pan-y cursor-grab active:cursor-grabbing rounded-[11px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onScroll={event => onChange(Math.max(1, Math.min(max, Math.round(event.currentTarget.scrollTop / rowHeight) + 1)))}
      onKeyDown={event => {
        const next = event.key === 'ArrowUp' ? value - 1 : event.key === 'ArrowDown' ? value + 1 : event.key === 'Home' ? 1 : event.key === 'End' ? max : null;
        if (next !== null) { event.preventDefault(); const day = Math.max(1, Math.min(max, next)); onChange(day); list.current.scrollTop = (day - 1) * rowHeight; }
      }}
      onPointerDown={event => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        event.stopPropagation(); dragged.current = false;
        drag.current = { y: event.clientY, top: event.currentTarget.scrollTop, day: Number(event.target.closest('[data-day]')?.dataset.day) };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        const delta = drag.current.y - event.clientY;
        if (Math.abs(delta) > 4) dragged.current = true;
        if (dragged.current) { event.currentTarget.style.scrollSnapType = 'none'; event.currentTarget.scrollTop = drag.current.top + delta; }
      }} onPointerUp={finishDrag} onPointerCancel={finishDrag}
      onClick={event => {
        if (dragged.current) { dragged.current = false; return; }
        const day = Number(event.target.closest('[data-day]')?.dataset.day);
        if (!day) return;
        onChange(day);
        list.current.scrollTo({ top: (day - 1) * rowHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }}>
      {Array.from({ length: max }, (_, index) => index + 1).map(day => <div key={day} data-day={day} className={`h-14 snap-center flex items-center justify-center whitespace-nowrap transition-[color,opacity,transform] duration-150 text-[27px] leading-none ${day === value ? 'text-ink font-semibold scale-100' : 'text-ink-subtle font-normal scale-90 opacity-60'}`}>Ngày {day}</div>)}
    </div>
  </div></div>;
}
