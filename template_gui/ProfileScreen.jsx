import React from 'react';
import { useNav } from '../context/NavContext';
import { 
  User, MapPin, Calendar, Heart, Shield, Bell, 
  Settings, LogOut, ChevronRight, Award, Compass, Check 
} from 'lucide-react';

export default function ProfileScreen() {
  const { push, switchTab, showToast, friendRequestsCount } = useNav();

  const user = {
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com',
    tripsCount: 4,
    provincesCount: 12,
    totalKm: 1480,
    badge: 'Nhà thám hiểm tích cực'
  };

  const menuItems = [
    { label: 'Chuyến đi của tôi', icon: Calendar, action: () => switchTab('trips'), badge: '4' },
    { label: 'Lời mời kết bạn', icon: User, action: () => push('friendRequests'), badge: friendRequestsCount > 0 ? String(friendRequestsCount) : null },
    { label: 'Điểm đến yêu thích', icon: Heart, action: () => showToast('Yêu thích', 'Đã lưu 8 địa danh OSM') },
    { label: 'Bản đồ OpenStreetMap đã qua', icon: Compass, action: () => switchTab('explore') },
    { label: 'Thông báo & nhắc nhở', icon: Bell, action: () => showToast('Thông báo', 'Hệ thống thông báo hoạt động bình thường') },
    { label: 'Quyền riêng tư & Bảo mật', icon: Shield, action: () => showToast('Bảo mật', 'Dữ liệu được mã hóa an toàn trên thiết bị') },
    { label: 'Cài đặt giao diện & Hệ thống', icon: Settings, action: () => showToast('Cài đặt', 'Thiết kế chuẩn Apple Human Interface Guidelines') }
  ];

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3.5 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center shrink-0 z-20">
        <h1 className="text-[17px] font-semibold text-[#1d1d1f]">Cá nhân</h1>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">

        {/* User Card */}
        <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#e0e0e0] flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-full bg-[#0066cc] text-[#ffffff] font-bold text-[18px] flex items-center justify-center shrink-0 border-2 border-[#ffffff] shadow-sm">
            A
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] truncate">{user.name}</h2>
              <span className="w-3.5 h-3.5 bg-[#0066cc] rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-[#ffffff]" />
              </span>
            </div>
            <p className="text-[11px] text-[#7a7a7a] truncate mt-0.5">{user.email}</p>

            <div className="mt-1.5 inline-flex items-center space-x-1 bg-[#0066cc]/10 text-[#0066cc] px-2 py-0.5 rounded-full text-[10px] font-medium">
              <Award className="w-3 h-3" />
              <span>{user.badge}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#ffffff] rounded-xl p-3 border border-[#e0e0e0] text-center">
            <p className="text-[18px] font-bold text-[#0066cc]">{user.tripsCount}</p>
            <p className="text-[10px] text-[#7a7a7a] mt-0.5 font-medium">Chuyến đi</p>
          </div>
          <div className="bg-[#ffffff] rounded-xl p-3 border border-[#e0e0e0] text-center">
            <p className="text-[18px] font-bold text-[#0066cc]">{user.provincesCount}</p>
            <p className="text-[10px] text-[#7a7a7a] mt-0.5 font-medium">Tỉnh thành</p>
          </div>
          <div className="bg-[#ffffff] rounded-xl p-3 border border-[#e0e0e0] text-center">
            <p className="text-[18px] font-bold text-[#0066cc]">{user.totalKm}</p>
            <p className="text-[10px] text-[#7a7a7a] mt-0.5 font-medium">Km đường bộ</p>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="bg-[#ffffff] rounded-2xl border border-[#e0e0e0] divide-y divide-[#f0f0f0] overflow-hidden">
          {menuItems.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                onClick={item.action}
                className="p-3.5 hover:bg-[#f5f5f7] flex items-center justify-between cursor-pointer apple-press transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-[#f5f5f7] flex items-center justify-center text-[#0066cc]">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-medium text-[#1d1d1f]">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0066cc] text-[#ffffff] font-semibold">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#7a7a7a]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={() => push('login')}
          className="w-full h-11 bg-[#ffffff] border border-[#e0e0e0] rounded-2xl text-[#ff3b30] text-[13px] font-semibold flex items-center justify-center space-x-1.5 apple-press hover:bg-[#ff3b30]/5"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất tài khoản</span>
        </button>

      </div>
    </div>
  );
}
