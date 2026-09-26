import React, { useState, useEffect } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { Plus, Calendar, MapPin, Users, ChevronRight, Navigation } from 'lucide-react';

export default function ManageTripsScreen() {
  const { push } = useNav();
  const [activeSegment, setActiveSegment] = useState('upcoming'); // 'upcoming', 'completed', 'cancelled'
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
    if (activeSegment === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3.5 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 z-20">
        <div>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">Chuyến đi của bạn</h1>
          <p className="text-[11px] text-[#7a7a7a]">Quản lý lộ trình & đồng hành</p>
        </div>
        <button
          type="button"
          onClick={() => push('createTrip')}
          className="h-8 px-3 rounded-full bg-[#0066cc] text-[#ffffff] text-[12px] font-semibold flex items-center space-x-1 apple-press hover:bg-[#0071e3]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo mới</span>
        </button>
      </header>

      {/* Segmented Control */}
      <div className="p-3 bg-[#ffffff] border-b border-[#e0e0e0] shrink-0">
        <div className="bg-[#f5f5f7] p-1 rounded-xl flex">
          {[
            { key: 'upcoming', label: 'Sắp tới' },
            { key: 'completed', label: 'Đã đi' },
            { key: 'cancelled', label: 'Đã hủy' }
          ].map(seg => (
            <button
              key={seg.key}
              type="button"
              onClick={() => setActiveSegment(seg.key)}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded-lg transition-all apple-press ${
                activeSegment === seg.key
                  ? 'bg-[#ffffff] text-[#1d1d1f] shadow-xs font-semibold'
                  : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trips List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {filteredTrips.length === 0 ? (
          <div className="bg-[#ffffff] rounded-2xl p-6 text-center border border-[#e0e0e0] space-y-3 my-auto">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center mx-auto text-[#7a7a7a]">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1d1d1f]">Chưa có chuyến đi nào</p>
              <p className="text-[12px] text-[#7a7a7a] mt-0.5">Bắt đầu lên kế hoạch cho kỳ nghỉ tuyệt vời của bạn.</p>
            </div>
            <button
              type="button"
              onClick={() => push('createTrip')}
              className="inline-flex items-center space-x-1 px-4 py-2 rounded-full bg-[#0066cc] text-[#ffffff] text-[12px] font-semibold apple-press"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo chuyến đi đầu tiên</span>
            </button>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const stopsCount = (trip.stops || []).length;
            const membersCount = (trip.members || []).length;

            return (
              <article
                key={trip.id}
                onClick={() => push('trackTrip', { id: trip.id })}
                className="bg-[#ffffff] rounded-2xl border border-[#e0e0e0] overflow-hidden hover:border-[#0066cc] transition cursor-pointer apple-press shadow-xs"
              >
                {/* Trip Banner Image */}
                <div className="h-28 relative bg-[#f5f5f7]">
                  <img
                    src={trip.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'}
                    alt={trip.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-[#ffffff]/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#0066cc] border border-[#e0e0e0]">
                    {trip.duration || '1 ngày'}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 text-[#ffffff] drop-shadow-sm">
                    <span className="text-[10px] bg-[#0066cc] px-2 py-0.5 rounded-full font-medium">
                      {trip.city || trip.destination}
                    </span>
                  </div>
                </div>

                {/* Trip Card Content */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <h3 className="text-[14px] font-semibold text-[#1d1d1f] truncate">{trip.title}</h3>
                      <p className="text-[11px] text-[#7a7a7a] mt-0.5 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-[#7a7a7a]" />
                        <span>{trip.startDate} - {trip.endDate}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7a7a7a] shrink-0 mt-1" />
                  </div>

                  <div className="pt-2 border-t border-[#f0f0f0] flex items-center justify-between text-[11px] text-[#7a7a7a]">
                    <span className="flex items-center space-x-1">
                      <Navigation className="w-3 h-3 text-[#0066cc]" />
                      <span>{stopsCount} điểm dừng OSM</span>
                    </span>

                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-[#7a7a7a]" />
                      <span>{membersCount > 0 ? `${membersCount} bạn đồng hành` : 'Chuyến đi cá nhân'}</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
