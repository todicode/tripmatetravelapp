import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, parseLocalDate } from '../utils/tripSetup';

export function DayWheel({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && Math.abs(ref.current.scrollTop - (value - 1) * 48) > 24) {
      ref.current.scrollTop = (value - 1) * 48;
    }
  }, [value]);
  return (
    <div className="relative w-full max-w-48 mx-auto">
      <div aria-hidden="true" className="absolute left-0 right-0 top-24 h-12 bg-parchment rounded-lg pointer-events-none" />
      <div ref={ref} role="group" aria-label="Số ngày đi, cuộn để chọn" className="relative h-60 overflow-y-auto no-scrollbar snap-y snap-mandatory py-24" onScroll={e => onChange(Math.max(1, Math.min(30, Math.round(e.currentTarget.scrollTop / 48) + 1)))}>
        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
          <button key={day} type="button" aria-pressed={day === value} onClick={() => onChange(day)} className={`w-full h-12 block snap-center text-[32px] leading-none transition-colors ${day === value ? 'text-ink font-semibold' : 'text-ink-subtle font-normal'}`}>{day}</button>
        ))}
      </div>
    </div>
  );
}

export default function TripDatePicker({ start, end, onChange }) {
  const today = dateKey(new Date());
  const initial = parseLocalDate(start) || new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const cells = (month.getDay() + 6) % 7;
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();
  const pick = key => {
    if (!start || end || key < start) onChange(key, '');
    else onChange(start, key);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" disabled={isCurrentMonth} aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="w-11 h-11 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-[17px] font-semibold">Tháng {month.getMonth() + 1}, {month.getFullYear()}</span>
        <button type="button" aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-11 h-11 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] text-ink-muted">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: cells }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: lastDay }, (_, i) => {
          const d = i + 1;
          const key = dateKey(new Date(month.getFullYear(), month.getMonth(), d));
          const selected = key === start || key === end;
          const between = start && end && key > start && key < end;
          return <button type="button" key={key} aria-label={parseLocalDate(key).toLocaleDateString('vi-VN')} aria-pressed={selected} disabled={key < today} onClick={() => pick(key)} className={`h-11 rounded-full text-[14px] disabled:opacity-25 ${selected ? 'bg-primary text-white' : between ? 'bg-primary-light text-primary' : 'hover:bg-parchment text-ink'}`}>{d}</button>;
        })}
      </div>
      <p className="text-[14px] leading-[1.43] text-ink-muted" aria-live="polite">{!start ? 'Chọn ngày đi, sau đó chọn ngày về.' : !end ? `Ngày đi: ${parseLocalDate(start).toLocaleDateString('vi-VN')}. Chọn ngày về; chọn lại cùng ngày cho chuyến đi một ngày.` : `${parseLocalDate(start).toLocaleDateString('vi-VN')} — ${parseLocalDate(end).toLocaleDateString('vi-VN')}`}</p>
    </div>
  );
}
