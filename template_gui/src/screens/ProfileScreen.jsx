import ScreenHeader from '../components/ScreenHeader';
import React from 'react';
import { getProfile } from '../store/profile';
import { useNav } from '../context/NavContext';
import {
  User, Bookmark, Pencil,
  Settings, ChevronRight, LogOut
} from 'lucide-react';

export default function ProfileScreen() {
  const { push, showToast, friendRequestsCount } = useNav();

  const user = getProfile();

  const menuItems = [
    { label: 'Địa điểm đã lưu', icon: Bookmark, action: () => push('explore', { filter: 'lists' }) },
    { label: 'Lời mời kết bạn', icon: User, action: () => push('friendRequests'), badge: friendRequestsCount > 0 ? String(friendRequestsCount) : null },
    { label: 'Cài đặt', icon: Settings, action: () => push('settings') }
  ];

  return (
    <div className="h-full flex flex-col bg-parchment overflow-hidden">
      {/* Header */}
      <ScreenHeader title="Cá nhân" />

      {/* Main Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 no-scrollbar">

        {/* User Card */}
        <button type="button" onClick={() => push('editProfile')} aria-label="Chỉnh sửa hồ sơ cá nhân" className="w-full bg-canvas rounded-[18px] p-4 flex flex-col items-center text-center gap-2 apple-press">
          <div className="w-14 h-14 rounded-full bg-primary text-white font-semibold text-[22px] flex items-center justify-center shrink-0">
            {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : user.name.trim().slice(-1).toUpperCase() || 'A'}
          </div>

          <div className="min-w-0 w-full">
            <div className="flex items-center justify-center space-x-1.5">
              <h2 className="text-[17px] font-semibold text-ink truncate">{user.name}</h2>
            </div>
            <p className="text-[12px] text-ink-muted truncate mt-0.5">{user.email}</p>
            <span className="inline-flex items-center gap-1.5 text-[14px] text-primary mt-3"><Pencil size={14} />Chỉnh sửa hồ sơ</span>
          </div>
        </button>

        {/* Menu Items List */}
        <div className="bg-canvas rounded-[18px] divide-y divide-hairline overflow-hidden">
          {menuItems.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <button
                type="button"
                key={idx}
                onClick={item.action}
                className="w-full min-h-12 px-3 py-2 hover:bg-parchment flex items-center gap-3 text-left cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-primary-focus focus-visible:-outline-offset-2"
              >
                <div className="flex flex-1 min-w-0 items-center gap-3">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-[14px] font-normal text-ink leading-[1.43]">{item.label}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {item.badge && (
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-primary text-white font-semibold">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </div>
              </button>
            );
          })}
        </div>
        <button
            type="button"
            onClick={() => showToast('Đăng xuất', 'Kết nối thao tác này với xác thực của ứng dụng React Native.')}
            className="w-full min-h-12 px-3 py-2 rounded-[18px] bg-canvas flex items-center justify-center gap-2 text-danger hover:bg-danger/5 transition-colors apple-press focus-visible:outline-2 focus-visible:outline-primary-focus focus-visible:-outline-offset-2"
          >
            <span className="w-7 h-7 shrink-0 rounded-lg bg-danger/10 flex items-center justify-center">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="text-[14px] leading-[1.43] font-semibold">Đăng xuất</span>
        </button>

      </div>
    </div>
  );
}
