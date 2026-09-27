import React from 'react';
import { BedDouble, Moon } from 'lucide-react';

export default function HotelStaySummary({ stays = [] }) {
  if (!stays.length) return null;
  return <section aria-label="Khách sạn đã chọn" className="space-y-2 pb-4">
    {stays.map(stay => <div key={stay.id} aria-label={`${stay.hotel.name}, ngày ${stay.startDay} đến ngày ${stay.endDay}`} className="min-h-13 rounded-[11px] border border-hairline/40 bg-parchment/70 px-3 py-2 flex items-center gap-3">
      <BedDouble size={21} className="text-hotel shrink-0" />
      <p title={`${stay.hotel.name} · Ngày ${stay.startDay} – Ngày ${stay.endDay}`} className="min-w-0 flex-1 truncate text-[14px] font-normal text-ink">{stay.hotel.name}</p>
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-1 text-[12px] font-medium text-ink"><Moon size={13} className="text-hotel fill-hotel/20" />{Math.max(0, stay.endDay - stay.startDay)} đêm</span>
    </div>)}
  </section>;
}
