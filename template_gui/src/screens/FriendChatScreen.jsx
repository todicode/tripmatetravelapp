import React, { useCallback, useState } from 'react';
import ChatTripPin from '../components/ChatTripPin';
import ChatPersonProfile, { ChatAvatar } from '../components/ChatPersonProfile';
import { getChatPerson } from '../store/chatPeople';
import { useNav } from '../context/NavContext';
import { ArrowLeft, Phone, Video, Send, MapPin, Plus } from 'lucide-react';

export default function FriendChatScreen({ params = {} }) {
  const { pop, showToast } = useNav();
  const friendName = params.name || 'Minh Tuấn';
  const person = getChatPerson(friendName, params.friendId);
  const [profileOpen, setProfileOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  const [messages, setMessages] = useState([
    { id: 1, text: 'Chào Tuấn! Cuối tuần này bạn có rảnh đi Đà Lạt không?', sender: 'me', time: '10:30' },
    { id: 2, text: 'Chào bạn! Mình rảnh nhé, bạn đã lên lịch trình chưa?', sender: 'them', time: '10:32' },
    { id: 3, text: 'Mình vừa tạo lộ trình 2 ngày 1 đêm trên TripMate, có ghé đồi chè Cầu Đất và cafe view hoàng hôn.', sender: 'me', time: '10:33' },
    { id: 4, text: 'Tuyệt vời quá, gửi mình xem với nhé!', sender: 'them', time: '10:35' }
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const newMsg = {
      id: Date.now(),
      text: inputVal.trim(),
      sender: 'me',
      time: 'Bây giờ'
    };
    setMessages(prev => [...prev, newMsg]);
    setInputVal('');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Ok bạn nhé, mình đồng ý!',
        sender: 'them',
        time: 'Vừa xong'
      }]);
    }, 1000);
  };

  return (
    <div className="relative h-full flex flex-col bg-parchment overflow-hidden">
      {/* Header */}
      <header className="px-3 py-2.5 bg-canvas border-b border-hairline flex items-center justify-between shrink-0 z-20">
        <div className="flex flex-1 items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={pop}
            className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-ink hover:bg-parchment apple-press shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ChatAvatar person={person} onClick={() => setProfileOpen(true)} />
          <button type="button" onClick={() => setProfileOpen(true)} aria-label={`Xem hồ sơ của ${person.name}`} className="min-w-0 min-h-11 text-left apple-press">
            <h1 className="text-[17px] font-semibold text-ink truncate">{friendName}</h1>
            <p className={`text-[12px] font-normal flex items-center space-x-1 ${person.online ? 'text-success' : 'text-ink-muted'}`}>
              {person.online && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              <span>{person.online ? 'Đang trực tuyến' : 'Thông tin cá nhân'}</span>
            </p>
          </button>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => showToast('Cuộc gọi thoại', 'Đang kết nối...')}
            className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-ink hover:bg-parchment apple-press"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => showToast('Video Call', 'Đang kết nối video...')}
            className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-ink hover:bg-parchment apple-press"
          >
            <Video className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
      <ChatTripPin chatKey={`friend:${params.friendId || friendName}`} />

      {/* Messages Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 no-scrollbar">
        <div className="text-center">
          <span className="text-[12px] text-ink-muted bg-hairline/40 px-2.5 py-0.5 rounded-full">
            Hôm nay
          </span>
        </div>

        {messages.map(msg => {
          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} className={`flex items-end gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && <ChatAvatar person={person} onClick={() => setProfileOpen(true)} />}
              <div className={`max-w-[78%] rounded-[18px] px-3 py-2.5 text-[14px] leading-[1.43] ${
                isMe
                  ? 'bg-primary text-white rounded-tr-xs'
                  : 'bg-canvas text-ink border border-hairline rounded-tl-xs'
              }`}>
                <p>{msg.text}</p>
                <span className={`text-[12px] mt-1 block text-right ${isMe ? 'text-white/75' : 'text-ink-muted'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-canvas border-t border-hairline shrink-0 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => {
            const newMsg = {
              id: Date.now(),
              text: 'Vị trí hiện tại: Trung tâm Đà Lạt (11.9404, 108.4583) qua OpenStreetMap',
              sender: 'me',
              time: 'Bây giờ'
            };
            setMessages(prev => [...prev, newMsg]);
            showToast('Chia sẻ vị trí', 'Đã gửi tọa độ OSM');
          }}
          className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-primary hover:bg-parchment apple-press shrink-0"
          title="Gửi vị trí OSM"
        >
          <MapPin className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Nhập tin nhắn..."
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
      {profileOpen && <ChatPersonProfile person={person} onClose={closeProfile} onMessage={closeProfile} />}
    </div>
  );
}
