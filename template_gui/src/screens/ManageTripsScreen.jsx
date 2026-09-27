import ScreenHeader from '../components/ScreenHeader';
import React, { useState, useEffect } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { Plus, Calendar, MapPin, Users, ChevronRight, Navigation } from 'lucide-react';

export default function ManageTripsScreen() {
  const { push } = useNav();
  const [activeSegment, setActiveSegment] = useState('upcoming');
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = () => {
    const all = TripsStore.getAllTrips();
    setTrips(all);
  };

  const filteredTrips = trips.filter(t => {
    if (activeSegment === 'upcoming') return t.status === 'upcoming' || !t.status;
    if (activeSegment === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-parchment overflow-hidden">
      <ScreenHeader title="Chuyến đi" subtitle="Những hành trình đang chờ bạn." action={<button type="button" onClick={() => push('createTrip')} className="ui-icon-button !bg-primary !text-white apple-press" aria-label="Tạo chuyến đi"><Plus size={22} /></button>} />
      <div role="group" aria-label="Trạng thái chuyến đi" className="grid grid-cols-2 gap-3 px-4 pb-3 bg-chrome shrink-0">
        {[{ key: 'upcoming', label: 'Sắp tới' }, { key: 'completed', label: 'Đã đi' }].map(segment => <button key={segment.key} type="button" onClick={() => setActiveSegment(segment.key)} aria-pressed={activeSegment === segment.key} className={`w-full min-h-11 rounded-full border text-[14px] font-semibold apple-press ${activeSegment === segment.key ? 'bg-primary-light border-primary/40 text-primary' : 'bg-transparent border-hairline text-ink-muted'}`}>{segment.label}</button>)}
      </div>
      <div key={activeSegment} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 no-scrollbar anim-content-switch">
        {filteredTrips.length === 0 ? <div className="bg-canvas rounded-[18px] p-6 text-center space-y-4">
          <Calendar className="mx-auto text-primary" size={32} /><h2 className="text-[20px] font-semibold text-ink">Chưa có chuyến đi nào</h2>
          <p className="text-[14px] text-ink-muted">Chọn một điểm đến và bắt đầu hành trình của bạn.</p>
          <button type="button" onClick={() => push('createTrip')} className="ui-primary-button apple-press"><Plus size={18} />Tạo chuyến đi</button>
        </div> : filteredTrips.map(trip => <button key={trip.id} type="button" onClick={() => push('trackTrip', {id:trip.id})} className="w-full block text-left bg-canvas rounded-[18px] overflow-hidden apple-press">
          <div className="h-44 relative bg-parchment"><img src={trip.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'} alt="" className="w-full h-full object-cover" /><span className="absolute top-3 right-3 bg-canvas px-3 py-1.5 rounded-full text-[12px] text-ink font-semibold">{trip.duration || '1 ngày'}</span></div>
          <div className="p-4 space-y-3"><p className="text-[12px] text-primary flex gap-1 items-center"><MapPin size={14} />{trip.city || trip.destination}</p>
            <div className="flex gap-2 items-start"><h2 className="flex-1 text-[18px] leading-[1.3] font-semibold text-ink">{trip.title}</h2><ChevronRight size={20} className="text-ink-muted shrink-0" /></div>
            <p className="text-[14px] text-ink-muted">{trip.dateMode === 'flexible' ? 'Ngày khởi hành linh hoạt' : [trip.startDate,trip.endDate].filter(Boolean).join(' – ') || 'Chưa chọn ngày'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-ink-muted"><span className="flex gap-1.5 items-center"><Navigation size={14} />{(trip.stops || []).length} điểm đến</span><span className="flex gap-1.5 items-center"><Users size={14} />{trip.members?.length ? `${trip.members.length} bạn đồng hành` : 'Chuyến đi cá nhân'}</span></div>
          </div>
        </button>)}
      </div>
    </div>
  );
}
