import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChatTripPin from '../components/ChatTripPin';
import ChatPersonProfile, { ChatAvatar } from '../components/ChatPersonProfile';
import { getChatPerson } from '../store/chatPeople';
import { useNav } from '../context/NavContext';
import { ArrowLeft, Send, UserPlus, Search, X } from 'lucide-react';

export default function GroupChatScreen({ params = {} }) {
  const { pop, push, showToast } = useNav();
  const [selectedPerson, setSelectedPerson] = useState(null);
  const closeProfile = useCallback(() => setSelectedPerson(null), []);
  const groupName = params.name || 'Nhóm Phượt Đà Lạt 2026';

  const [showInviteModal, setShowInviteModal] = useState(false);
  const invitePanel = useRef(null);
  useEffect(() => {
    if (!showInviteModal) return;
    const previous = document.activeElement;
    invitePanel.current?.querySelector('button')?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, [showInviteModal]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitedFriends, setInvitedFriends] = useState({});

  const inviteDirectory = [
    { id: 'inv_1', name: 'Đức Huy', phone: '0965 443 322', avatar: 'H' },
    { id: 'inv_2', name: 'Thanh Hà', phone: '0978 112 233', avatar: 'H' },
    { id: 'inv_3', name: 'Bích Ngọc', phone: '0934 567 890', avatar: 'N' },
    { id: 'inv_4', name: 'Minh Tuấn', phone: '0912 345 678', avatar: 'T' }
  ];

  const normalizeName = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  const query = normalizeName(inviteSearch);
  const phoneQuery = inviteSearch.replace(/[^0-9]/g, '');
  const inviteResults = query ? inviteDirectory.filter(friend =>
    normalizeName(friend.name).includes(query) ||
    (/^[+\d\s().-]+$/.test(inviteSearch.trim()) && phoneQuery && friend.phone.replace(/\D/g, '').includes(phoneQuery))
  ) : [];

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
    <div className="relative h-full flex flex-col bg-parchment overflow-hidden">
      {/* Header */}
      <header className="px-3 py-2.5 bg-canvas border-b border-hairline flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex flex-1 items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={pop}
            className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-ink hover:bg-parchment apple-press shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold text-ink truncate">{groupName}</h1>
            <p className="text-[12px] text-ink-muted">4 thành viên • Đồng hành</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setInviteSearch(''); setShowInviteModal(true); }}
          title="Mời bạn bè vào nhóm"
          aria-label="Mời bạn bè vào nhóm"
          className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/15 apple-press shrink-0"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </header>

      <ChatTripPin chatKey={`group:${params.groupId || groupName}`} />

      {/* Messages Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-end gap-1 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
            {!msg.isMe && <ChatAvatar person={getChatPerson(msg.senderName)} onClick={() => setSelectedPerson(getChatPerson(msg.senderName))} />}
            <div className="max-w-[78%]">
              {!msg.isMe && (
                <button type="button" onClick={() => setSelectedPerson(getChatPerson(msg.senderName))} className="text-[12px] font-semibold text-ink-muted mb-0.5 block pl-1 text-left hover:text-primary">
                  {msg.senderName}
                </button>
              )}
              <div className={`rounded-[18px] px-3 py-2.5 text-[14px] leading-[1.43] ${
                msg.isMe
                  ? 'bg-primary text-white rounded-tr-xs'
                  : 'bg-canvas text-ink border border-hairline rounded-tl-xs'
              }`}>
                <p>{msg.text}</p>
                <span className={`text-[12px] mt-1 block text-right ${msg.isMe ? 'text-white/75' : 'text-ink-muted'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-canvas border-t border-hairline shrink-0 flex items-center space-x-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Nhắn tin cho cả nhóm..."
          className="flex-1 h-11 px-3.5 text-[16px] bg-parchment border border-hairline rounded-full focus:bg-canvas focus:border-primary outline-none text-ink"
        />
        <button
          type="button"
          onClick={handleSend}
          className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center apple-press hover:bg-primary-focus shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {/* Modal: Mời bạn bè vào nhóm */}
      {showInviteModal && (
        <div data-modal-layer className="absolute inset-0 z-50 bg-black/35 flex items-end justify-center">
          <div ref={invitePanel} className="bg-canvas w-full rounded-t-[18px] p-4 space-y-3.5 flex flex-col max-h-[85%] anim-sheet-up" role="dialog" aria-modal="true" aria-labelledby="group-invite-title" onKeyDown={event => { if (event.key === 'Escape') setShowInviteModal(false); }}>
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-hairline">
              <div className="flex flex-1 min-w-0 items-center space-x-2">
                <div className="w-11 h-11 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="group-invite-title" className="text-[17px] font-semibold text-ink">Mời vào nhóm</h3>
                  <p className="text-[12px] text-ink-muted truncate">{groupName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                aria-label="Đóng"
                className="w-11 h-11 shrink-0 rounded-full bg-parchment flex items-center justify-center text-ink-muted hover:text-ink apple-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input type="search" value={inviteSearch} onChange={event => setInviteSearch(event.target.value)} aria-label="Tìm người để mời theo tên hoặc số điện thoại" placeholder="Nhập tên hoặc số điện thoại" className="w-full h-11 rounded-full bg-parchment border border-hairline pl-10 pr-3 text-[16px] text-ink outline-none focus:border-primary" />
            </div>

            {/* Friends list to invite */}
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto no-scrollbar pt-1">
              <p role="status" className="text-[14px] text-ink-muted py-2">
                {!query ? 'Tìm theo tên hoặc số điện thoại để mời vào nhóm.' : inviteResults.length ? `Tìm thấy ${inviteResults.length} người` : 'Không tìm thấy người phù hợp.'}
              </p>
              {inviteResults.map(f => {
                const isInvited = !!invitedFriends[f.id];
                return (
                  <div key={f.id} className="p-2.5 bg-canvas border border-hairline rounded-[11px] flex items-center justify-between hover:bg-parchment transition">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="w-11 h-11 rounded-full bg-hairline text-ink font-semibold text-[12px] flex items-center justify-center shrink-0">
                        {f.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink truncate">{f.name}</p>
                        <p className="text-[12px] text-ink-muted truncate">{f.phone}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isInvited}
                      onClick={() => {
                        setInvitedFriends(prev => ({ ...prev, [f.id]: true }));
                        showToast('Mời bạn bè vào nhóm', `Đã gửi lời mời tham gia nhóm tới ${f.name}`);
                      }}
                      className={`min-h-11 px-4 py-1 rounded-full text-[12px] font-semibold shrink-0 transition apple-press ${
                        isInvited
                          ? 'bg-success/10 text-success border border-success/30'
                          : 'bg-parchment hover:bg-primary hover:text-white text-primary border border-primary/30'
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
      {selectedPerson && <ChatPersonProfile person={selectedPerson} onClose={closeProfile} onMessage={() => {
        closeProfile();
        push('friendChat', { friendId: selectedPerson.id, name: selectedPerson.name });
      }} />}
    </div>
  );
}
