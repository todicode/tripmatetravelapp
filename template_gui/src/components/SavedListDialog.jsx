import React, { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';
import { getSavedSpots, createSpotList } from '../store/savedSpots';

export default function SavedListDialog({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input')?.focus();
    const handleKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key !== 'Tab') return;
      const controls = Array.from(ref.current?.querySelectorAll('button:not(:disabled), input:not(:disabled)') || []);
      const first = controls[0]; const last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [onClose]);
  const spots = getSavedSpots();
  const submit = e => {
    e.preventDefault();
    if (!name.trim()) return;
    try { createSpotList(name, selected); onSaved(); }
    catch { setError('Không lưu được danh sách. Kiểm tra bộ nhớ trình duyệt rồi thử lại.'); }
  };
  return (
    <div className="absolute inset-0 z-50 bg-black/25 flex items-end justify-center" onClick={onClose}>
      <form ref={ref} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="new-list-title" onClick={e => e.stopPropagation()} className="w-full bg-canvas rounded-t-[18px] p-4 max-h-[85%] flex flex-col gap-3">
        <header className="flex justify-between items-center"><h2 id="new-list-title" className="text-[21px] font-semibold">Tạo danh sách mới</h2><button type="button" aria-label="Đóng tạo danh sách" onClick={onClose} className="w-11 h-11 flex items-center justify-center"><X className="w-5 h-5" /></button></header>
        <label className="text-[14px]">Tên danh sách<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Cuối tuần ở Đà Lạt" maxLength={80} required className="mt-2 h-11 px-3 w-full rounded-lg border border-hairline focus:outline-primary-focus text-[14px]" /></label>
        <p className="text-[12px] text-ink-muted">Chọn địa điểm đã lưu để thêm vào danh sách (không bắt buộc).</p>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">{spots.map(spot => <label key={spot.id} className="flex items-center gap-3 py-3 border-b border-hairline cursor-pointer text-[14px]"><input type="checkbox" checked={selected.includes(spot.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, spot.id] : prev.filter(id => id !== spot.id))} className="w-5 h-5 accent-primary" /><span className="min-w-0"><span className="block">{spot.name}</span><span className="block text-[12px] text-ink-muted">{spot.city}</span></span></label>)}</div>
        {error && <p role="alert" className="text-[14px] text-danger">{error}</p>}
        <button type="submit" disabled={!name.trim()} className="min-h-11 shrink-0 rounded-full bg-primary text-white text-[14px] font-semibold flex items-center justify-center gap-2 apple-press disabled:opacity-40"><Check className="w-4 h-4" />Lưu danh sách</button>
      </form>
    </div>
  );
}
