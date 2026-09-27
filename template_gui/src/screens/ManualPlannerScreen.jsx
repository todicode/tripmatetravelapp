import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, MapPin, Calendar, Plus, Clock, MoreHorizontal, ArrowUp, ArrowDown, Trash2, Check, Route } from 'lucide-react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import PlannerMap from '../components/PlannerMap';
import PlannerPlacePicker from '../components/PlannerPlacePicker';
import { parseLocalDate } from '../utils/tripSetup';
import { initialManualPlans, isDuplicateStop, manualTripPayload, moveStop, reorderStop } from '../utils/manualPlanner';

const iconButton = 'w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-primary hover:bg-parchment apple-press focus-visible:outline-2 focus-visible:outline-primary-focus disabled:opacity-30';

export default function ManualPlannerScreen({ setup, tourTitle, draft, onDraftChange, onBack }) {
  const { pop, push, showToast } = useNav();
  const setupKey = JSON.stringify(setup);
  const savedDraft = draft?.setupKey === setupKey ? draft : null;
  const [title, setTitle] = useState(() => savedDraft?.title || tourTitle || `Khám phá ${setup.destination.name}`);
  const [plans, setPlans] = useState(() => savedDraft?.plans || initialManualPlans(setup));
  const [day, setDay] = useState(() => savedDraft?.day || 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const timelineRef = useRef(null);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const stops = plans[day].stops;
  const total = plans.reduce((sum, plan) => sum + plan.stops.length, 0);
  const flexible = setup.dateMode === 'flexible';
  const dateSummary = flexible ? `${plans.length} ngày · Ngày đi linh hoạt` : `${parseLocalDate(setup.start).toLocaleDateString('vi-VN')} — ${parseLocalDate(setup.end).toLocaleDateString('vi-VN')}`;
  const dayDate = !flexible ? (() => { const date = parseLocalDate(setup.start); date.setDate(date.getDate() + day); return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }); })() : 'Tự chọn giờ và thứ tự các điểm dừng';

  useEffect(() => { onDraftChange({ setupKey, title, plans, day }); }, [setupKey, title, plans, day, onDraftChange]);
  const selectDay = index => { setDay(index); setEditingStop(null); };
  const updateStop = (id, changes) => setPlans(prev => prev.map((plan, i) => i === day ? { ...plan, stops: plan.stops.map(stop => stop.id === id ? { ...stop, ...changes } : stop) } : plan));
  const addPlace = place => {
    if (isDuplicateStop(plans, place)) { showToast('Đã có trong lịch', 'Địa điểm này đã được thêm vào chuyến đi.'); return; }
    const stop = { ...place, id: `stop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, dayNumber: day + 1, time: '09:00', status: 'pending', note: place.note || '' };
    setPlans(prev => prev.map((plan, i) => i === day ? { ...plan, stops: [...plan.stops, stop] } : plan));
    closePicker();
    setEditingStop(stop.id);
    showToast('Đã thêm địa điểm', `Ngày ${day + 1} · ${place.name}`);
  };
  const removeStop = id => { setPlans(prev => prev.map((plan, i) => i === day ? { ...plan, stops: plan.stops.filter(s => s.id !== id) } : plan)); setEditingStop(null); };
  const save = () => {
    if (saveLock.current || !total) return;
    saveLock.current = true; setSaving(true);
    try {
      const trip = TripsStore.createTrip(manualTripPayload(setup, title, plans));
      showToast('Đã lưu chuyến đi', 'Lịch trình của bạn đã sẵn sàng.');
      push('trackTrip', { id: trip.id });
    } catch {
      saveLock.current = false; setSaving(false);
      showToast('Chưa lưu được', 'Vui lòng thử lại.');
    }
  };

  return (
    <div className="relative h-full min-h-0 flex flex-col bg-parchment text-ink">
      <header className="h-14 px-3 shrink-0 flex items-center justify-between bg-canvas border-b border-hairline">
        <button type="button" onClick={onBack} aria-label="Quay lại cách lên lịch" className={iconButton}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-[17px] font-semibold">Tự lên lịch</h1>
        <button type="button" onClick={pop} aria-label="Đóng tạo chuyến đi" className={iconButton}><X className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <section className="bg-canvas px-4 pt-4 pb-3 space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} aria-label="Tên chuyến đi" className="w-full bg-transparent text-[20px] leading-[1.2] font-semibold tracking-tight rounded-lg outline-none focus:ring-2 focus:ring-primary-focus" />
          <div className="flex items-center gap-1.5 text-[14px] text-ink-muted"><MapPin aria-hidden="true" className="w-4 h-4 shrink-0" /><span className="truncate">{setup.destination.fullName || setup.destination.name}</span></div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-muted"><Calendar aria-hidden="true" className="w-4 h-4 shrink-0" />{dateSummary}</div>
        </section>

        <section className="h-44 sm:h-48 relative isolate overflow-hidden bg-parchment" aria-label={`Bản đồ ngày ${day + 1}`}>
          <PlannerMap coords={setup.destination.coords} stops={stops} />
          <span className="absolute bottom-3 left-4 z-[400] bg-canvas rounded-full px-3 py-1.5 text-[12px] text-ink flex items-center gap-1.5 pointer-events-none"><MapPin className="w-3.5 h-3.5 text-primary" />{stops.length ? `${stops.length} điểm dừng` : 'Chọn điểm dừng đầu tiên'}</span>
        </section>

        <div className="sticky top-0 z-20 bg-canvas border-b border-hairline px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Ngày trong chuyến đi">
          {plans.map((plan, i) => <button type="button" key={plan.dayNumber} role="tab" id={`planner-day-${i}`} aria-controls="planner-timeline" aria-selected={day === i} tabIndex={day === i ? 0 : -1} onClick={() => selectDay(i)} onKeyDown={e => { let next; if (e.key === 'ArrowRight') next = (i + 1) % plans.length; else if (e.key === 'ArrowLeft') next = (i - 1 + plans.length) % plans.length; else if (e.key === 'Home') next = 0; else if (e.key === 'End') next = plans.length - 1; if (next !== undefined) { e.preventDefault(); selectDay(next); document.getElementById(`planner-day-${next}`)?.focus(); } }} className={`min-h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold apple-press ${day === i ? 'bg-[#1d1d1f] text-white' : 'bg-parchment text-ink-muted'}`}>Ngày {i + 1}<span className={`ml-2 text-[12px] ${day === i ? 'text-white/80' : 'text-ink-muted'}`}>{plan.stops.length}</span></button>)}
        </div>

        <section ref={timelineRef} id="planner-timeline" role="tabpanel" aria-labelledby={`planner-day-${day}`} className="px-4 py-4 space-y-3 min-h-56">
          <div className="flex justify-between items-center"><div><h2 className="text-[21px] font-semibold">Lịch trình ngày {day + 1}</h2><p className="text-[12px] text-ink-muted mt-1">{dayDate}</p></div><button type="button" onClick={() => setPickerOpen(true)} aria-label={`Thêm địa điểm vào ngày ${day + 1}`} className={`${iconButton} bg-canvas`}><Plus className="w-5 h-5" /></button></div>
          {!stops.length && <div className="rounded-[18px] bg-canvas px-5 py-6 text-center"><span className="w-12 h-12 rounded-full bg-parchment flex items-center justify-center mx-auto mb-3"><Route className="w-6 h-6 text-primary" /></span><h3 className="text-[17px] font-semibold">Một ngày, theo cách của bạn</h3><p className="text-[14px] leading-[1.43] text-ink-muted mt-2 mb-4">Thêm nơi muốn ghé, chọn giờ đến và sắp xếp hành trình theo ý bạn.</p><button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 px-5 rounded-full bg-primary text-white text-[14px] font-semibold apple-press">Thêm địa điểm đầu tiên</button></div>}

          <ol className="space-y-3">
            {stops.map((stop, index) => {
              const expanded = editingStop === stop.id;
              return <li key={stop.id} className="relative pl-9">
                {index < stops.length - 1 && <span aria-hidden="true" className="absolute left-3.5 top-7 bottom-[-12px] w-px bg-hairline" />}
                <span className="absolute top-4 left-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-semibold">{index + 1}</span>
                <article className="rounded-[18px] bg-canvas p-3">
                  <div className="flex items-start gap-2"><div className="flex-1 min-w-0"><h3 className="text-[17px] leading-[1.24] font-semibold break-words">{stop.name}</h3><label className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-primary"><Clock aria-hidden="true" className="w-3.5 h-3.5" /><span className="sr-only">Giờ đến {stop.name}</span><input type="time" value={stop.time || '09:00'} onChange={e => updateStop(stop.id, { time: e.target.value })} className="min-h-8 bg-transparent outline-none rounded-sm focus:ring-2 focus:ring-primary-focus max-w-28" /></label></div><button type="button" onClick={() => setEditingStop(expanded ? null : stop.id)} aria-expanded={expanded} aria-label={`Chỉnh sửa ${stop.name}`} className="w-11 h-11 shrink-0 flex items-center justify-center text-ink-muted rounded-full hover:bg-parchment"><MoreHorizontal className="w-5 h-5" /></button></div>
                  {expanded ? <div className="mt-3 pt-3 border-t border-hairline space-y-3">
                    <label className="block text-[12px] text-ink-muted">Ghi chú<textarea value={stop.note || ''} maxLength={500} onChange={e => updateStop(stop.id, { note: e.target.value })} rows={2} placeholder="Ví dụ: đặt bàn trước, mua vé…" className="mt-1 w-full p-2 rounded-lg bg-parchment text-[14px] text-ink resize-none outline-none focus:ring-2 focus:ring-primary-focus" /></label>
                    {plans.length > 1 && <label className="flex items-center justify-between gap-2 text-[12px] text-ink-muted">Chuyển sang ngày<select aria-label={`Chuyển ${stop.name} sang ngày khác`} value={day} onChange={e => { setPlans(prev => moveStop(prev, day, Number(e.target.value), stop.id)); setEditingStop(null); }} className="min-h-11 px-3 rounded-lg bg-parchment text-[14px] text-ink">{plans.map((_, i) => <option key={i} value={i}>Ngày {i + 1}</option>)}</select></label>}
                    <div className="flex items-center justify-between"><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => setPlans(prev => reorderStop(prev, day, stop.id, -1))} aria-label={`Đưa ${stop.name} lên trước`} className={iconButton}><ArrowUp className="w-4 h-4" /></button><button type="button" disabled={index === stops.length - 1} onClick={() => setPlans(prev => reorderStop(prev, day, stop.id, 1))} aria-label={`Đưa ${stop.name} xuống sau`} className={iconButton}><ArrowDown className="w-4 h-4" /></button></div><button type="button" onClick={() => removeStop(stop.id)} className="min-h-11 px-2 text-[12px] text-danger flex items-center gap-1"><Trash2 className="w-4 h-4" />Xóa điểm dừng</button></div>
                  </div> : stop.note && <p className="text-[12px] leading-[1.43] text-ink-muted mt-1 line-clamp-2">{stop.note}</p>}
                </article>
              </li>;
            })}
          </ol>
          {stops.length > 0 && <button type="button" onClick={() => setPickerOpen(true)} className="w-full min-h-12 rounded-[18px] border border-dashed border-primary/40 text-primary text-[14px] flex items-center justify-center gap-2 apple-press"><Plus className="w-4 h-4" />Thêm điểm dừng</button>}
          {setup.preferences.length > 0 && <p className="text-[12px] leading-[1.43] text-ink-muted pt-2">Sở thích: {setup.preferences.join(' · ')}</p>}
        </section>
      </div>

      <footer className="shrink-0 bg-canvas border-t border-hairline px-4 py-3">
        <div className="flex justify-between text-[12px] text-ink-muted mb-2"><span>{plans.length} ngày · {total} điểm dừng</span><span>{total ? 'Lịch trình của bạn' : 'Thêm địa điểm để lưu'}</span></div>
        <button type="button" disabled={!total || saving} onClick={save} className="w-full min-h-11 rounded-full bg-primary text-white text-[14px] font-semibold flex items-center justify-center gap-2 apple-press disabled:opacity-40 disabled:cursor-not-allowed"><Check className="w-4 h-4" />{saving ? 'Đang lưu…' : 'Lưu chuyến đi'}</button>
      </footer>
      {pickerOpen && <PlannerPlacePicker destination={setup.destination} plans={plans} day={day} onAdd={addPlace} onClose={closePicker} />}
    </div>
  );
}
