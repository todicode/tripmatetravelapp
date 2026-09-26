import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { ArrowLeft, Check, X, UserPlus, Users } from 'lucide-react';

export default function FriendRequestsScreen() {
  const { pop, showToast, friendRequests, acceptFriendRequest, declineFriendRequest } = useNav();
  const [activeTab, setActiveTab] = useState('received'); // 'received', 'sent'

  const receivedRequests = friendRequests || [];

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
          <h1 className="text-[16px] font-semibold text-[#1d1d1f]">Lời mời kết bạn</h1>
        </div>
        <span className="text-[11px] text-[#0066cc] font-semibold">
          {receivedRequests.length} lời mời
        </span>
      </header>

      {/* Tabs */}
      <div className="p-3 bg-[#ffffff] border-b border-[#e0e0e0] shrink-0">
        <div className="bg-[#f5f5f7] p-1 rounded-xl flex text-[12px]">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-1.5 rounded-lg transition-all apple-press ${
              activeTab === 'received' ? 'bg-[#ffffff] text-[#1d1d1f] font-semibold shadow-xs' : 'text-[#7a7a7a]'
            }`}
          >
            Đã nhận ({receivedRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-1.5 rounded-lg transition-all apple-press ${
              activeTab === 'sent' ? 'bg-[#ffffff] text-[#1d1d1f] font-semibold shadow-xs' : 'text-[#7a7a7a]'
            }`}
          >
            Đã gửi (0)
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
        {receivedRequests.length === 0 ? (
          <div className="bg-[#ffffff] rounded-2xl p-6 text-center border border-[#e0e0e0] space-y-2 my-auto">
            <p className="text-[14px] font-semibold text-[#1d1d1f]">Không có lời mời nào</p>
            <p className="text-[12px] text-[#7a7a7a]">Bạn đã xử lý hết các lời mời kết bạn.</p>
          </div>
        ) : (
          receivedRequests.map(req => (
            <div
              key={req.id}
              className="p-3 bg-[#ffffff] rounded-2xl border border-[#e0e0e0] flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-full bg-[#0066cc] text-[#ffffff] font-bold text-[13px] flex items-center justify-center shrink-0">
                  {req.avatar}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-[#1d1d1f] truncate">{req.name}</h3>
                  <p className="text-[11px] text-[#7a7a7a]">{req.phone} • {req.mutualCount} bạn chung</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAccept(req.id, req.name)}
                  className="h-8 px-3 rounded-full bg-[#0066cc] text-[#ffffff] text-[11px] font-semibold flex items-center space-x-1 apple-press hover:bg-[#0071e3]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Đồng ý</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(req.id)}
                  className="w-8 h-8 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#7a7a7a] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 apple-press"
                  title="Từ chối"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
