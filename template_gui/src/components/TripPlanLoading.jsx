import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, Map, MapPin, Sparkles, Circle } from 'lucide-react';

const stages = [
  { title: 'Chuẩn bị hành trình', icon: Sparkles, steps: ['Tiếp nhận lựa chọn của bạn', 'Chuẩn bị danh sách địa điểm'] },
  { title: 'Sắp xếp lịch trình', icon: Map, steps: ['Chia hành trình theo từng ngày', 'Kết nối các điểm dừng', 'Hoàn thiện lịch trình mẫu'] }
];

export default function TripPlanLoading({ setup, onComplete, onCancel }) {
  const [progress, setProgress] = useState(0);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    const timers = Array.from({ length: 5 }, (_, index) => window.setTimeout(() => setProgress(index + 1), (index + 1) * 600));
    timers.push(window.setTimeout(() => complete.current(), 3300));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  let offset = 0;
  return <div className={`h-full min-h-0 flex flex-col bg-parchment text-ink ${progress === 5 ? 'anim-plan-loading-out' : 'anim-content-switch'}`}>
    <header className="h-14 px-3 shrink-0 flex items-center gap-2 bg-chrome"><button type="button" onClick={onCancel} aria-label="Quay lại thiết lập chuyến đi" className="w-11 h-11 flex items-center justify-center rounded-full apple-press"><ArrowLeft size={20} /></button><span className="text-[17px] font-semibold">Đang tạo lịch trình</span></header>
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
      <div className="relative h-40 rounded-[18px] bg-primary-light overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 360 160" className="w-full h-full" fill="none"><path d="M0 35H360M0 85H360M0 135H360M55 0V160M155 0V160M255 0V160" stroke="var(--color-primary)" strokeOpacity=".1" strokeWidth="18" /><path d="M55 110C90 110 95 45 150 45S205 115 255 100L305 50" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 7" className="plan-route-flow" />{[[55,110],[150,45],[255,100],[305,50]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r="13" fill="var(--color-canvas)" /><circle cx={x} cy={y} r="6" fill="var(--color-primary)" /></g>)}</svg>
        <span className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 rounded-full bg-canvas px-3 py-2 text-[12px] text-primary w-fit max-w-[90%]"><MapPin size={14} className="shrink-0" /><span className="truncate">{setup.destination.name} · {setup.days} ngày</span></span>
      </div>
      <div><h1 className="text-[21px] font-semibold">Một hành trình dành cho bạn</h1><p className="text-[14px] text-ink-muted leading-relaxed mt-1">Chờ một chút nhé, các điểm dừng đang được ghép thành chuyến đi của bạn.</p></div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{progress === 5 ? 'Lịch trình mẫu đã sẵn sàng' : `Đang chuẩn bị, bước ${progress + 1} trên 5`}</div>
      <div role="progressbar" aria-label="Tiến độ tạo lịch trình mẫu" aria-valuemin={0} aria-valuemax={5} aria-valuenow={progress} className="h-1 rounded-full bg-hairline overflow-hidden"><div style={{ width: `${progress / 5 * 100}%` }} className="h-full bg-primary transition-[width] duration-500 ease-out" /></div>
      {stages.map(({ title, icon: Icon, steps }) => {
        const start = offset;
        offset += steps.length;
        const done = progress >= offset;
        const active = progress >= start && !done;
        return <section key={title} className={`rounded-[18px] bg-canvas p-4 border transition-colors duration-300 ${active ? 'border-primary/30' : 'border-transparent'}`}><div className="flex items-center gap-2 mb-3">{done ? <Check size={18} className="text-success" /> : active ? <LoaderCircle size={18} className="text-primary animate-spin" /> : <Circle size={18} className="text-ink-subtle" />}<h2 className="flex-1 text-[15px] font-semibold">{title}</h2><Icon size={20} className="text-primary" /></div><ol className="space-y-2 pl-6">{steps.map((text, index) => { const finished = progress > start + index; const current = progress === start + index; return <li key={text} className={`flex items-center gap-2 text-[14px] transition-colors ${finished ? 'text-ink-muted' : current ? 'text-primary' : 'text-ink-subtle'}`}>{finished ? <Check size={14} className="shrink-0 text-success" /> : current ? <LoaderCircle size={14} className="shrink-0 animate-spin" /> : <Circle size={14} className="shrink-0" />}{text}</li>; })}</ol></section>;
      })}
      <p className="text-[12px] text-ink-muted text-center leading-relaxed">Đây là hiệu ứng minh họa cho lịch trình mẫu. AI thực tế sẽ được kết nối sau.</p>
    </div>
  </div>;
}
