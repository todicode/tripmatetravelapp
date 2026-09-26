import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { ArrowLeft, Users, Send, MapPin, ChevronRight, UserPlus, Copy, Check, X } from 'lucide-react';

export default function GroupChatScreen({ params = {} }) {
  const { pop, push, showToast } = useNav();
  const groupName = params.name || 'Nhóm Phượt Đà Lạt 2026';
  const tripName = params.trip || 'Đà Lạt';

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState({});

  const availableFriendsToInvite = [
    { id: 'inv_1', name: 'Đức Huy', phone: '0965 443 322', avatar: 'H' },
    { id: 'inv_2', name: 'Thanh Hà', phone: '0978 112 233', avatar: 'H' },
    { id: 'inv_3', name: 'Bích Ngọc', phone: '0934 567 890', avatar: 'N' },
    { id: 'inv_4', name: 'Minh Tuấn', phone: '0912 345 678', avatar: 'T' }
  ];

  const [messages, setMessages] = useState([
    { id: 1, senderName: 'Tuấn', text: 'Chào cả nhóm! Mình đã cập nhật lại các trạm dừng cho chuyến đi Đà Lạt rồi nhé.', isMe: false, time: '09:15' },
    { id: 2, senderName: 'Lan', text: 'Mọi người nhớ mang áo ấm nhé, nhiệt độ buổi tối xuống 17 độ đấy.', isMe: false, time: '09:20' },
    { id: 3, senderName: 'Tôi', text: 'Mình đã chuẩn bị sẵn xe máy và lịch trình chi tiết rồi!', isMe: true, time: '09:25' }
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSend = () => {
    if (!inputVal.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      senderName: 'Tôi',
      text: inputVal.trim(),
      isMe: true,
      time: 'Bây giờ'
    }]);
    setInputVal('');
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Header */}
      <header className="px-3 py-2.5 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={pop}
            className="w-8 h-8 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold text-[#1d1d1f] truncate">{groupName}</h1>
            <p className="text-[10px] text-[#7a7a7a]">4 thành viên • Đồng hành</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          title="Mời bạn bè vào nhóm"
          aria-label="Mời bạn bè vào nhóm"
          className="h-8 px-2.5 rounded-full border border-[#e0e0e0] flex items-center space-x-1.5 text-[#0066cc] bg-[#ffffff] hover:bg-[#f5f5f7] apple-press shrink-0 shadow-2xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold hidden xs:inline">Mời bạn</span>
        </button>
      </header>

      {/* Pinned Trip Banner */}
      <div 
        onClick={() => push('trackTrip')}
        className="px-3.5 py-2 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] apple-press shrink-0"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#1d1d1f] truncate">Lộ trình ghim: Khám phá {tripName}</p>
            <p className="text-[10px] text-[#7a7a7a]">2 ngày 1 đêm • 5 trạm dừng</p>
          </div>
        </div>
        <span className="text-[11px] text-[#0066cc] font-medium flex items-center space-x-0.5 shrink-0">
          <span>Xem</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[78%]">
              {!msg.isMe && (
                <span className="text-[10px] font-semibold text-[#7a7a7a] mb-0.5 block pl-1">
                  {msg.senderName}
                </span>
              )}
              <div className={`rounded-2xl p-3 text-[13px] leading-relaxed shadow-2xs ${
                msg.isMe 
                  ? 'bg-[#0066cc] text-[#ffffff] rounded-tr-xs' 
                  : 'bg-[#ffffff] text-[#1d1d1f] border border-[#e0e0e0] rounded-tl-xs'
              }`}>
                <p>{msg.text}</p>
                <span className={`text-[9px] mt-1 block text-right ${msg.isMe ? 'text-[#ffffff]/75' : 'text-[#7a7a7a]'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-[#ffffff] border-t border-[#e0e0e0] shrink-0 flex items-center space-x-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Nhắn tin cho cả nhóm..."
          className="flex-1 h-9 px-3.5 text-[13px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
        />
        <button
          type="button"
          onClick={handleSend}
          className="w-9 h-9 rounded-full bg-[#0066cc] text-[#ffffff] flex items-center justify-center apple-press hover:bg-[#0071e3] shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {/* Modal: Mời bạn bè vào nhóm */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-[#1d1d1f]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#ffffff] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-4 space-y-3.5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Mời bạn bè vào nhóm</h3>
                  <p className="text-[10px] text-[#7a7a7a]">{groupName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] apple-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Copy Link Section */}
            <div className="bg-[#f5f5f7] p-3 rounded-2xl border border-[#e0e0e0] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-[11px] font-semibold text-[#1d1d1f]">Mã mời tham gia nhóm</p>
                <p className="text-[10px] text-[#7a7a7a] truncate font-mono mt-0.5">tripmate.vn/group/join-9948</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  showToast('Mời bạn bè vào nhóm', 'Đã sao chép liên kết mời tham gia nhóm');
                }}
                className="px-3 py-1.5 bg-[#0066cc] text-[#ffffff] rounded-xl text-[11px] font-semibold flex items-center space-x-1 shrink-0 apple-press"
              >
                <Copy className="w-3 h-3" />
                <span>Sao chép</span>
              </button>
            </div>

            {/* Friends list to invite */}
            <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar pt-1">
              <span className="text-[11px] font-semibold text-[#7a7a7a] uppercase tracking-wider block">
                Gợi ý bạn bè
              </span>
              {availableFriendsToInvite.map(f => {
                const isInvited = !!invitedFriends[f.id];
                return (
                  <div key={f.id} className="p-2.5 bg-[#ffffff] border border-[#e0e0e0] rounded-xl flex items-center justify-between hover:bg-[#f5f5f7] transition">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full bg-[#e5e5ea] text-[#1d1d1f] font-bold text-[12px] flex items-center justify-center shrink-0">
                        {f.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#1d1d1f] truncate">{f.name}</p>
                        <p className="text-[10px] text-[#7a7a7a] truncate">{f.phone}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isInvited}
                      onClick={() => {
                        setInvitedFriends(prev => ({ ...prev, [f.id]: true }));
                        showToast('Mời bạn bè vào nhóm', `Đã gửi lời mời tham gia nhóm tới ${f.name}`);
                      }}
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition apple-press ${
                        isInvited 
                          ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/30' 
                          : 'bg-[#f5f5f7] hover:bg-[#0066cc] hover:text-[#ffffff] text-[#0066cc] border border-[#0066cc]/30'
                      }`}
                    >
                      {isInvited ? 'Đã mời' : 'Mời'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
