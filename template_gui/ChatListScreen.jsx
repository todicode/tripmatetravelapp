import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { Search, UserPlus, Users, MessageSquare, ChevronRight, Plus } from 'lucide-react';

export default function ChatListScreen() {
  const { push } = useNav();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'groups', 'friends'
  const [search, setSearch] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  const conversations = [
    {
      id: 'g1',
      type: 'group',
      name: 'Nhóm Phượt Đà Lạt 2026',
      avatar: 'DL',
      lastMsg: 'Tuấn: Mình đã thêm điểm Cafe Mê Linh vào lịch trình rồi nhé!',
      time: '10:45',
      unread: 2,
      trip: 'Đà Lạt'
    },
    {
      id: 'f1',
      type: 'friend',
      name: 'Minh Tuấn',
      avatar: 'T',
      lastMsg: 'Ok bạn, hẹn gặp sáng mai lúc 6h30 nhé.',
      time: 'Hôm qua',
      unread: 0,
      online: true
    },
    {
      id: 'f2',
      type: 'friend',
      name: 'Phương Thảo',
      avatar: 'P',
      lastMsg: 'Bạn đã check thông tin vé máy bay Phú Quốc chưa?',
      time: 'Thứ 3',
      unread: 1,
      online: false
    },
    {
      id: 'g2',
      type: 'group',
      name: 'Khám Phá Hội An 3N2Đ',
      avatar: 'HA',
      lastMsg: 'Lan: Tối nay đi ăn cao lầu ở đâu vậy mọi người?',
      time: '20/09',
      unread: 0,
      trip: 'Hội An'
    }
  ];

  const filtered = conversations.filter(c => {
    if (activeTab === 'groups' && c.type !== 'group') return false;
    if (activeTab === 'friends' && c.type !== 'friend') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#ffffff] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 z-20">
        <div>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">Tin nhắn</h1>
          <p className="text-[11px] text-[#7a7a7a]">Trò chuyện & Đồng hành</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowActionMenu(!showActionMenu)}
            title="Thêm"
            className="w-8 h-8 rounded-full bg-[#0066cc] text-[#ffffff] flex items-center justify-center apple-press hover:bg-[#0071e3] transition shadow-xs"
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${showActionMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Action Popup Menu (Như image_1.png) */}
          {showActionMenu && (
            <>
              {/* Backdrop để đóng popup khi click ra ngoài */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowActionMenu(false)} 
              />
              
              <div className="absolute right-0 top-10 w-44 bg-[#ffffff] rounded-2xl shadow-xl border border-[#e0e0e0] py-1 z-40 anim-sheet-up">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    push('addFriend');
                  }}
                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-[#f5f5f7] text-[#1d1d1f] text-left apple-press transition"
                >
                  <UserPlus className="w-5 h-5 text-[#1d1d1f]" />
                  <span className="text-[14px] font-medium text-[#1d1d1f]">Thêm bạn</span>
                </button>

                <div className="h-[1px] bg-[#f0f0f0] mx-3" />

                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    push('createGroup');
                  }}
                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-[#f5f5f7] text-[#1d1d1f] text-left apple-press transition"
                >
                  <Users className="w-5 h-5 text-[#1d1d1f]" />
                  <span className="text-[14px] font-medium text-[#1d1d1f]">Tạo nhóm</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Search Input */}
      <div className="p-3 bg-[#ffffff] border-b border-[#e0e0e0] shrink-0 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tin nhắn, bạn bè..."
            className="w-full h-9 pl-9 pr-3 text-[12px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
          />
        </div>

        {/* Segmented Filter */}
        <div className="bg-[#f5f5f7] p-1 rounded-xl flex text-[12px]">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'groups', label: 'Nhóm chuyến đi' },
            { key: 'friends', label: 'Bạn bè' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1 rounded-lg transition-all apple-press ${
                activeTab === tab.key
                  ? 'bg-[#ffffff] text-[#1d1d1f] font-semibold shadow-xs'
                  : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f0] no-scrollbar">
        {filtered.map(conv => (
          <div
            key={conv.id}
            onClick={() => {
              if (conv.type === 'group') {
                push('groupChat', { groupId: conv.id, name: conv.name, trip: conv.trip });
              } else {
                push('friendChat', { friendId: conv.id, name: conv.name });
              }
            }}
            className="p-3.5 hover:bg-[#f5f5f7] flex items-center justify-between cursor-pointer apple-press transition"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="relative">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-[13px] text-[#ffffff] ${
                  conv.type === 'group' ? 'bg-[#0066cc]' : 'bg-[#1d1d1f]'
                }`}>
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#34c759] border-2 border-[#ffffff] rounded-full" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-[13px] font-semibold text-[#1d1d1f] truncate">{conv.name}</h3>
                  {conv.trip && (
                    <span className="text-[9px] text-[#0066cc] bg-[#f5f5f7] px-1.5 py-0.5 rounded border border-[#e0e0e0] shrink-0">
                      {conv.trip}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7a7a7a] truncate mt-0.5">{conv.lastMsg}</p>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-1 shrink-0">
              <span className="text-[10px] text-[#7a7a7a]">{conv.time}</span>
              {conv.unread > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0066cc] text-[#ffffff] text-[9px] font-bold flex items-center justify-center">
                  {conv.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
