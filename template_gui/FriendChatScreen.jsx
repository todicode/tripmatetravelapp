import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { ArrowLeft, Phone, Video, Send, MapPin, Plus } from 'lucide-react';

export default function FriendChatScreen({ params = {} }) {
  const { pop, showToast } = useNav();
  const friendName = params.name || 'Minh Tuấn';

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
            <h1 className="text-[14px] font-semibold text-[#1d1d1f] truncate">{friendName}</h1>
            <p className="text-[10px] text-[#34c759] font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]"></span>
              <span>Đang trực tuyến</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => showToast('Cuộc gọi thoại', 'Đang kết nối...')}
            className="w-8 h-8 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => showToast('Video Call', 'Đang kết nối video...')}
            className="w-8 h-8 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] apple-press"
          >
            <Video className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        <div className="text-center">
          <span className="text-[10px] text-[#7a7a7a] bg-[#e0e0e0]/40 px-2.5 py-0.5 rounded-full">
            Hôm nay
          </span>
        </div>

        {messages.map(msg => {
          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl p-3 text-[13px] leading-relaxed shadow-2xs ${
                isMe 
                  ? 'bg-[#0066cc] text-[#ffffff] rounded-tr-xs' 
                  : 'bg-[#ffffff] text-[#1d1d1f] border border-[#e0e0e0] rounded-tl-xs'
              }`}>
                <p>{msg.text}</p>
                <span className={`text-[9px] mt-1 block text-right ${isMe ? 'text-[#ffffff]/75' : 'text-[#7a7a7a]'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-[#ffffff] border-t border-[#e0e0e0] shrink-0 flex items-center space-x-2">
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
          className="w-9 h-9 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#0066cc] hover:bg-[#f5f5f7] apple-press shrink-0"
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
    </div>
  );
}
