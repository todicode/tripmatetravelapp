import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { TripsStore } from '../store/tripsStore';
import { ArrowLeft, Users, Check, Plus, MapPin, Search, X, Calendar } from 'lucide-react';

export default function CreateGroupScreen() {
  const { pop, push, showToast } = useNav();
  const [groupName, setGroupName] = useState('');

  // Liên kết chuyến đi (Mặc định là TẮT)
  const [isLinkTrip, setIsLinkTrip] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Danh sách các chuyến đi hiện có trong store
  const availableTrips = TripsStore.getAllTrips();

  // Danh sách bạn bè (Mặc định KHÔNG CHỌN AI - 100% false)
  const [friends, setFriends] = useState([
    { id: 'f1', name: 'Minh Tuấn', phone: '0912 345 678', selected: false },
    { id: 'f2', name: 'Phương Thảo', phone: '0987 654 321', selected: false },
    { id: 'f3', name: 'Hoàng Long', phone: '0903 123 456', selected: false },
    { id: 'f4', name: 'Bích Ngọc', phone: '0934 567 890', selected: false },
    { id: 'f5', name: 'Thanh Hà', phone: '0978 112 233', selected: false },
    { id: 'f6', name: 'Đức Huy', phone: '0965 443 322', selected: false }
  ]);

  // Ô tìm kiếm thành viên theo tên hoặc SĐT
  const [searchMember, setSearchMember] = useState('');

  const handleToggle = (id) => {
    setFriends(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const handleSelectTrip = (tripId) => {
    setSelectedTripId(tripId);
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      showToast('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    const selectedTrip = isLinkTrip && selectedTripId 
      ? availableTrips.find(t => String(t.id) === String(selectedTripId))
      : null;

    const selectedFriends = friends.filter(f => f.selected);

    showToast('Thành công', `Đã tạo nhóm "${groupName}"`);
    push('groupChat', { 
      name: groupName, 
      trip: selectedTrip ? selectedTrip.city || selectedTrip.destination : null,
      tripId: selectedTrip ? selectedTrip.id : null,
      members: selectedFriends
    });
  };

  const selectedCount = friends.filter(f => f.selected).length;

  const filteredFriends = friends.filter(f => {
    const q = searchMember.trim().toLowerCase();
    if (!q) return true;
    const matchName = f.name.toLowerCase().includes(q);
    const matchPhone = f.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
    return matchName || matchPhone;
  });

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3.5 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={pop}
            className="w-8 h-8 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[16px] font-semibold text-[#1d1d1f]">Tạo nhóm mới</h1>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="text-[13px] text-[#0066cc] font-semibold apple-press"
        >
          Tạo
        </button>
      </header>

      {/* Main Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* Group Name Input */}
        <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#7a7a7a] uppercase tracking-wider">
              Tên nhóm
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ví dụ: Phượt Đà Lạt Tháng 9..."
              className="w-full h-10 px-3.5 text-[13px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
            />
          </div>
        </div>

        {/* Trip Link Section (Mặc định TẮT, user tích vào để chọn chuyến đi) */}
        <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#0066cc]" />
              <label 
                htmlFor="linkTripToggle" 
                className="text-[12px] font-semibold text-[#1d1d1f] cursor-pointer"
              >
                Liên kết chuyến đi
              </label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="linkTripToggle"
                type="checkbox"
                checked={isLinkTrip}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsLinkTrip(checked);
                  if (checked && !selectedTripId && availableTrips.length > 0) {
                    setSelectedTripId(availableTrips[0].id);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066cc]"></div>
            </label>
          </div>

          <p className="text-[11px] text-[#7a7a7a]">
            {isLinkTrip 
              ? 'Chọn chuyến đi bên dưới để chia sẻ lịch trình với các thành viên' 
              : 'Mặc định không liên kết. Tích bật nếu bạn muốn gắn nhóm với một chuyến đi cụ thể'}
          </p>

          {/* Khi user tích vào bật liên kết chuyến đi */}
          {isLinkTrip && (
            <div className="space-y-2 pt-1 border-t border-[#f0f0f0] anim-sheet-up">
              <span className="text-[10px] font-semibold text-[#7a7a7a] uppercase tracking-wider">
                Chọn chuyến đi muốn liên kết ({availableTrips.length})
              </span>
              
              {availableTrips.length === 0 ? (
                <div className="p-3 text-center text-[12px] text-[#7a7a7a] bg-[#f5f5f7] rounded-xl border border-[#e0e0e0]">
                  Chưa có chuyến đi nào được tạo
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {availableTrips.map(trip => {
                    const isSelected = String(trip.id) === String(selectedTripId);
                    return (
                      <div
                        key={trip.id}
                        onClick={() => handleSelectTrip(trip.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer apple-press flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#0066cc]/5 border-[#0066cc]'
                            : 'bg-[#f5f5f7] border-[#e0e0e0] hover:border-[#b0b0b0]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className={`text-[13px] font-semibold truncate ${
                            isSelected ? 'text-[#0066cc]' : 'text-[#1d1d1f]'
                          }`}>
                            {trip.title}
                          </p>
                          <div className="flex items-center space-x-1.5 text-[10px] text-[#7a7a7a] mt-0.5">
                            <Calendar className="w-3 h-3 text-[#7a7a7a]" />
                            <span>{trip.startDate} - {trip.endDate || trip.duration}</span>
                            <span>•</span>
                            <span className="truncate">{trip.destination || trip.city}</span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          isSelected ? 'bg-[#0066cc] border-[#0066cc] text-[#ffffff]' : 'border-[#d0d0d0] bg-[#ffffff]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Members Selection (Mặc định không chọn ai + Search theo tên/SĐT) */}
        <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#0066cc]" />
              <span className="text-[12px] font-semibold text-[#1d1d1f]">Thêm thành viên</span>
            </div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              selectedCount > 0 
                ? 'bg-[#0066cc]/10 text-[#0066cc]' 
                : 'bg-[#f5f5f7] text-[#7a7a7a] border border-[#e0e0e0]'
            }`}>
              {selectedCount} đã chọn
            </span>
          </div>

          {/* Ô tìm kiếm theo tên hoặc SĐT */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full h-9 pl-9 pr-8 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
            />
            {searchMember && (
              <button
                type="button"
                onClick={() => setSearchMember('')}
                className="absolute right-2.5 top-2.5 text-[#7a7a7a] hover:text-[#1d1d1f] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Danh sách thành viên */}
          <div className="divide-y divide-[#f0f0f0] max-h-64 overflow-y-auto no-scrollbar">
            {filteredFriends.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[#7a7a7a]">
                Không tìm thấy bạn bè phù hợp với "{searchMember}"
              </div>
            ) : (
              filteredFriends.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleToggle(f.id)}
                  className="py-2.5 flex items-center justify-between cursor-pointer apple-press"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center font-bold text-[12px] text-[#1d1d1f]">
                      {f.name.charAt(f.name.length - 1)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1d1d1f]">{f.name}</p>
                      <p className="text-[10px] text-[#7a7a7a]">{f.phone}</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                    f.selected ? 'bg-[#0066cc] border-[#0066cc] text-[#ffffff]' : 'border-[#e0e0e0]'
                  }`}>
                    {f.selected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleCreate}
          className="w-full h-11 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[14px] font-semibold rounded-full flex items-center justify-center space-x-1.5 apple-press shadow-xs"
        >
          <span>Tạo nhóm trò chuyện</span>
        </button>
      </div>
    </div>
  );
}
