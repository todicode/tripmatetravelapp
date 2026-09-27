import ScreenHeader from '../components/ScreenHeader';
import React, { useState } from 'react';
import { useNav } from '../context/NavContext';

export default function FriendRequestsScreen() {
  const { pop, showToast, friendRequests, acceptFriendRequest, declineFriendRequest } = useNav();
  const [activeTab, setActiveTab] = useState('received'); // 'received', 'sent'
  const [sentRequests, setSentRequests] = useState([
    { id: 'sent_demo_1', name: 'Phạm Minh Anh', avatar: 'A', mutualCount: 3, sentAt: 'Vừa gửi · Dữ liệu mẫu' }
  ]);

  const receivedRequests = friendRequests || [];
  const displayedRequests = activeTab === 'sent' ? sentRequests : receivedRequests;

  const handleAccept = (id, name) => {
    if (acceptFriendRequest) {
      acceptFriendRequest(id, name);
    }
  };

  const handleDecline = (id) => {
    if (declineFriendRequest) {
      declineFriendRequest(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-parchment overflow-hidden">
      {/* Header */}
      <ScreenHeader title="Lời mời kết bạn" subtitle="Kết nối với những người bạn mới." onBack={pop} />

      {/* Tabs */}
      <div className="p-3 bg-canvas border-b border-hairline shrink-0">
        <div className="bg-parchment p-1 rounded-[11px] flex text-[12px]">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`flex-1 min-h-11 py-1.5 rounded-lg transition-all apple-press ${
              activeTab === 'received' ? 'bg-canvas text-ink font-semibold ' : 'text-ink-muted'
            }`}
          >
            Đã nhận ({receivedRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`flex-1 min-h-11 py-1.5 rounded-lg transition-all apple-press ${
              activeTab === 'sent' ? 'bg-canvas text-ink font-semibold ' : 'text-ink-muted'
            }`}
          >
            Đã gửi ({sentRequests.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
        {displayedRequests.length === 0 ? (
          <div className="bg-canvas rounded-[18px] p-6 text-center border border-hairline space-y-2 my-auto">
            <p className="text-[14px] font-semibold text-ink">Không có lời mời nào</p>
            <p className="text-[12px] text-ink-muted">{activeTab === 'sent' ? 'Bạn không có lời mời nào đang chờ phản hồi.' : 'Bạn đã xử lý hết các lời mời kết bạn.'}</p>
          </div>
        ) : (
          displayedRequests.map(req => (
            <div
              key={req.id}
              className="p-3 bg-canvas rounded-[18px] flex flex-col items-stretch gap-4 "
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary text-white font-semibold text-[14px] flex items-center justify-center shrink-0">
                  {req.avatar}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold text-ink truncate">{req.name}</h3>
                  <p className="text-[12px] text-ink-muted">{req.phone && `${req.phone} · `}{req.mutualCount} bạn chung</p>
                  {activeTab === 'sent' && <p className="text-[12px] text-ink-muted mt-1">{req.sentAt}</p>}
                </div>
              </div>

              {activeTab === 'sent' ? <div className="space-y-3">
                <p className="text-[14px] text-ink-muted text-center">Đang chờ phản hồi</p>
                <button type="button" onClick={() => { setSentRequests(previous => previous.filter(item => item.id !== req.id)); showToast('Đã thu hồi lời mời mẫu', req.name); }} aria-label={`Thu hồi lời mời kết bạn với ${req.name}`} className="w-full min-h-11 px-3 rounded-full bg-parchment text-ink text-[14px] font-semibold flex items-center justify-center apple-press hover:bg-hairline">Thu hồi lời mời</button>
              </div> : <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleAccept(req.id, req.name)}
                  aria-label={`Đồng ý kết bạn với ${req.name}`}
                  className="w-full min-h-11 px-3 rounded-full bg-primary text-white text-[14px] font-semibold flex items-center justify-center apple-press hover:bg-primary-focus"
                >
                  <span>Đồng ý</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(req.id)}
                  aria-label={`Từ chối lời mời của ${req.name}`}
                  className="w-full min-h-11 px-3 rounded-full bg-parchment text-ink text-[14px] font-semibold flex items-center justify-center apple-press hover:bg-hairline"
                >
                  <span>Từ chối</span>
                </button>
              </div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
