import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { Search, UserPlus, Users, Plus } from 'lucide-react';

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
    <div className="h-full flex flex-col bg-canvas overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 min-h-[68px] bg-canvas flex items-center justify-between shrink-0 z-20">
        <div>
          <h1 className="text-[20px] leading-[1.3] font-semibold text-ink">Tin nhắn</h1>
          <p className="text-[14px] text-ink-muted">Cùng nhau lên kế hoạch và khám phá.</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowActionMenu(!showActionMenu)}
            title="Thêm"
            aria-label="Thêm bạn hoặc tạo nhóm"
            aria-expanded={showActionMenu}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center apple-press hover:bg-primary-focus transition "
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${showActionMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Action Popup Menu (Như image_1.png) */}
          {showActionMenu && (
            <>
              {/* Backdrop để đóng popup khi click ra ngoài */}
              <div
                data-modal-layer
                className="fixed inset-0 z-30"
                onClick={() => setShowActionMenu(false)}
              />

              <div data-modal-layer className="absolute right-0 top-12 w-48 bg-canvas rounded-[18px]  border border-hairline py-1 z-40 anim-trip-step-down">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    push('addFriend');
                  }}
                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-parchment text-ink text-left apple-press transition"
                >
                  <UserPlus className="w-5 h-5 text-ink" />
                  <span className="text-[14px] font-normal text-ink">Thêm bạn</span>
                </button>

                <div className="h-[1px] bg-hairline mx-3" />

                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    push('createGroup');
                  }}
                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-parchment text-ink text-left apple-press transition"
                >
                  <Users className="w-5 h-5 text-ink" />
                  <span className="text-[14px] font-normal text-ink">Tạo nhóm</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Search Input */}
      <div className="px-3 pb-3 bg-canvas border-b border-hairline shrink-0 space-y-2">
        <div className="relative">
          <Search aria-hidden="true" className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tin nhắn, bạn bè..."
            aria-label="Tìm kiếm tin nhắn, bạn bè"
            className="w-full h-11 pl-9 pr-3 text-[14px] bg-parchment border border-hairline rounded-full focus:bg-canvas focus:border-primary outline-none text-ink"
          />
        </div>

        {/* Segmented Filter */}
        <div role="group" aria-label="Loại cuộc trò chuyện" className="grid grid-cols-[1fr_auto_1fr] gap-1 rounded-[11px] bg-parchment p-1">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'groups', label: 'Nhóm chuyến đi' }, { key: 'friends', label: 'Bạn bè' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} aria-pressed={activeTab === tab.key}
              className={`min-h-11 rounded-lg px-3 text-[14px] leading-tight whitespace-nowrap font-semibold apple-press ${activeTab === tab.key ? 'bg-canvas text-ink' : 'text-ink-muted'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div key={activeTab} className="flex-1 min-h-0 overflow-y-auto bg-canvas no-scrollbar anim-content-switch">
        {filtered.map(conv => (
          <button
            type="button"
            key={conv.id}
            onClick={() => {
              if (conv.type === 'group') {
                push('groupChat', { groupId: conv.id, name: conv.name, trip: conv.trip });
              } else {
                push('friendChat', { friendId: conv.id, name: conv.name });
              }
            }}
            className="w-full min-h-[76px] text-left bg-canvas border-b border-parchment last:border-b-0 px-4 py-3.5 hover:bg-parchment flex items-center justify-between gap-3 cursor-pointer apple-press transition"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-semibold text-[14px] text-white ${
                  conv.type === 'group' ? 'bg-primary' : 'bg-avatar'
                }`}>
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-canvas rounded-full" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[14px] leading-[1.4] font-semibold text-ink truncate">{conv.name}</h3>
                </div>
                <p className="text-[14px] leading-[1.4] text-ink-muted truncate mt-0.5">{conv.lastMsg}</p>
              </div>
            </div>

            <div className="flex flex-col items-end justify-center gap-1 shrink-0">
              <span className="text-[12px] text-ink-muted">{conv.time}</span>
              {conv.unread > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[12px] font-semibold flex items-center justify-center">
                  {conv.unread}
                </span>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-center text-[14px] text-ink-muted py-8">Không tìm thấy cuộc trò chuyện.</p>}
      </div>
    </div>
  );
}
