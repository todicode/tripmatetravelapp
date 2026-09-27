import ScreenHeader from '../components/ScreenHeader';
import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import {
  ArrowLeft, Users, Phone, QrCode, ChevronRight, Search,
  Check, X, Share2, Download, Camera, UserPlus, MessageSquare,
  MapPin, Send
} from 'lucide-react';

export default function AddFriendScreen() {
  const { pop, push, showToast } = useNav();

  // Sub-modal states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Phone search state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Found User Profile Modal state (hiển thị khi quét QR hoặc tìm SĐT thành công)
  const [profileModalUser, setProfileModalUser] = useState(null);

  // Zalo-style invitation message modal state
  const [showInviteMessageModal, setShowInviteMessageModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('Xin chào! Mình là Nguyễn Vinh, cùng kết bạn trên TripMate nhé!');

  // Phone search handler
  const handleSearchPhone = (e) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      showToast('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      setShowPhoneModal(false);
      setProfileModalUser({
        id: 'u_hoang',
        name: 'Trần Văn Hoàng',
        phone: phoneNumber,
        bio: 'Thích du lịch bụi, camping cắm trại cuối tuần và chinh phục các đỉnh núi.',
        avatar: 'H',
        location: 'Đà Nẵng',
        mutualFriends: 2,
        tripsCount: 4,
        requestSent: false
      });
      setInviteMessage('Xin chào! Mình là Nguyễn Vinh, cùng kết bạn trên TripMate nhé!');
    }, 450);
  };

  // QR Scan simulation handler
  const handleSimulateScan = () => {
    setShowScannerModal(false);
    setProfileModalUser({
      id: 'u_tuan',
      name: 'Minh Tuấn',
      phone: '0912 345 678',
      bio: 'Đam mê khám phá các cung đường phượt Tây Bắc & Đà Lạt. Thích săn mây và chụp ảnh phong cảnh.',
      avatar: 'T',
      location: 'TP. Hồ Chí Minh',
      mutualFriends: 3,
      tripsCount: 6,
      requestSent: false
    });
    setInviteMessage('Xin chào! Mình là Nguyễn Vinh, cùng kết bạn trên TripMate nhé!');
    showToast('Đã tìm thấy', 'Đã quét thành công mã QR của Minh Tuấn');
  };

  // Send invitation with custom Zalo-style message
  const handleSendInviteWithMessage = () => {
    if (profileModalUser) {
      setProfileModalUser(prev => ({ ...prev, requestSent: true }));
    }
    setShowInviteMessageModal(false);
    showToast('Đã gửi lời mời', `Đã gửi lời mời kết bạn kèm lời nhắn tới ${profileModalUser?.name}`);
  };

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden">
      {/* Header - Strictly matching image_2.png and DESIGN.md */}
      <ScreenHeader title="Thêm bạn" subtitle="Tìm bạn đồng hành cho chuyến đi tiếp theo." onBack={pop} />

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {/* Top 3 Action Rows (as in image_2.png) */}
        <div className="divide-y divide-[#f0f0f0] border-b border-hairline">
          {/* 1. Lời mời kết bạn */}
          <div
            onClick={() => push('friendRequests')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-parchment cursor-pointer apple-press transition"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-parchment border border-hairline flex items-center justify-center text-ink shrink-0">
                <Users className="w-5 h-5 text-ink" />
              </div>
              <span className="text-[17px] font-normal text-ink">
                Lời mời kết bạn
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </div>

          {/* 2. Nhập số điện thoại */}
          <div
            onClick={() => {
              setPhoneNumber('');
              setShowPhoneModal(true);
            }}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-parchment cursor-pointer apple-press transition"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-parchment border border-hairline flex items-center justify-center text-ink shrink-0">
                <Phone className="w-5 h-5 text-ink" />
              </div>
              <span className="text-[17px] font-normal text-ink">
                Nhập số điện thoại
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </div>

          {/* 3. Quét mã QR của bạn bè */}
          <div
            onClick={() => setShowScannerModal(true)}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-parchment cursor-pointer apple-press transition"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-parchment border border-hairline flex items-center justify-center text-ink shrink-0">
                <QrCode className="w-5 h-5 text-ink" />
              </div>
              <span className="text-[17px] font-normal text-ink">
                Quét mã QR của bạn bè
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </div>
        </div>

        {/* User Personal QR Code Section (as seen in image_2.png) */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="pt-2">
            <h2 className="text-[22px] font-semibold text-ink">
              Nguyễn Vinh
            </h2>
            <p className="text-[12px] text-ink-muted mt-0.5">
              ID: tripmate_vinhnguyen
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-canvas p-4 rounded-[18px] border border-hairline  relative flex flex-col items-center justify-center">
            {/* Crisp High-Res Vector QR Code Graphic */}
            <svg
              className="w-48 h-48"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="200" height="200" fill="#ffffff" rx="16" />

              {/* Top-Left Position Detection Marker */}
              <rect x="20" y="20" width="46" height="46" rx="8" fill="#1d1d1f" />
              <rect x="26" y="26" width="34" height="34" rx="5" fill="#ffffff" />
              <rect x="32" y="32" width="22" height="22" rx="3" fill="#1d1d1f" />

              {/* Top-Right Position Detection Marker */}
              <rect x="134" y="20" width="46" height="46" rx="8" fill="#1d1d1f" />
              <rect x="140" y="26" width="34" height="34" rx="5" fill="#ffffff" />
              <rect x="146" y="32" width="22" height="22" rx="3" fill="#1d1d1f" />

              {/* Bottom-Left Position Detection Marker */}
              <rect x="20" y="134" width="46" height="46" rx="8" fill="#1d1d1f" />
              <rect x="26" y="140" width="34" height="34" rx="5" fill="#ffffff" />
              <rect x="32" y="146" width="22" height="22" rx="3" fill="#1d1d1f" />

              {/* Timing pattern & data dots matrix */}
              <rect x="74" y="24" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="90" y="24" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="106" y="24" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="82" y="36" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="98" y="36" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="114" y="36" width="8" height="8" rx="2" fill="#1d1d1f" />

              <rect x="74" y="52" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="90" y="52" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="106" y="52" width="8" height="8" rx="2" fill="#1d1d1f" />

              <rect x="24" y="74" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="36" y="82" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="52" y="74" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="24" y="90" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="40" y="98" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="56" y="90" width="8" height="8" rx="2" fill="#1d1d1f" />

              <rect x="134" y="74" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="150" y="82" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="166" y="74" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="142" y="90" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="158" y="98" width="8" height="8" rx="2" fill="#1d1d1f" />

              <rect x="74" y="134" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="90" y="142" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="106" y="134" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="82" y="150" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="98" y="166" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="114" y="150" width="8" height="8" rx="2" fill="#1d1d1f" />

              <rect x="134" y="134" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="150" y="142" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="166" y="134" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="142" y="158" width="8" height="8" rx="2" fill="#1d1d1f" />
              <rect x="158" y="166" width="8" height="8" rx="2" fill="#1d1d1f" />

              {/* Center Brand Badge */}
              <circle cx="100" cy="100" r="22" fill="#ffffff" stroke="#e0e0e0" strokeWidth="2" />
              <circle cx="100" cy="100" r="18" fill="#0066cc" />
              <text
                x="100"
                y="104"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                TripMate
              </text>
            </svg>
          </div>

          {/* Caption from image_2.png */}
          <p className="text-[12px] text-ink-muted">
            Quét mã để thêm bạn với tôi
          </p>

          {/* Actions */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => showToast('Đã lưu', 'Đã lưu mã QR vào thư viện ảnh')}
              className="px-4 py-2 bg-parchment hover:bg-hairline text-ink text-[12px] font-semibold rounded-full flex items-center space-x-1.5 apple-press border border-hairline"
            >
              <Download className="w-3.5 h-3.5 text-ink" />
              <span>Lưu mã</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Chia sẻ', 'Đã sao chép liên kết hồ sơ cá nhân')}
              className="px-4 py-2 bg-primary hover:bg-primary-focus text-white text-[12px] font-semibold rounded-full flex items-center space-x-1.5 apple-press "
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>Chia sẻ mã</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROFILE CARD MODAL: Hiển thị Profile người tìm thấy khi quét QR hoặc tìm SĐT */}
      {/* ========================================================================= */}
      {profileModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backblur-xs anim-fade-in">
          <div className="w-full max-w-sm bg-canvas rounded-[18px] overflow-hidden border border-hairline  space-y-4 anim-sheet-up">
            {/* Profile Header Banner */}
            <div className="relative bg-parchment px-5 pt-5 pb-3 border-b border-hairline">
              <button
                type="button"
                onClick={() => setProfileModalUser(null)}
                className="absolute right-4 top-4 w-11 h-11 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink-muted hover:text-ink apple-press"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3.5 mt-2">
                <div className="w-16 h-16 rounded-full bg-primary text-white font-semibold text-[22px] flex items-center justify-center border-2 border-canvas  shrink-0">
                  {profileModalUser.avatar}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold text-ink truncate">
                    {profileModalUser.name}
                  </h3>
                  <p className="text-[12px] text-ink-muted font-normal flex items-center space-x-1 mt-0.5">
                    <Phone className="w-3 h-3 text-ink-muted" />
                    <span>{profileModalUser.phone}</span>
                  </p>
                  <p className="text-[12px] text-primary font-normal mt-0.5">
                    {profileModalUser.mutualFriends} bạn chung • {profileModalUser.tripsCount} chuyến đi
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="px-5 space-y-3">
              <div className="p-3 bg-parchment rounded-[18px] border border-hairline space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[12px] font-semibold text-ink-muted uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Khu vực: {profileModalUser.location}</span>
                </div>
                <p className="text-[12px] text-ink leading-relaxed">
                  {profileModalUser.bio}
                </p>
              </div>

              {/* ACTION BUTTONS: 1. Gửi tin nhắn & 2. Thêm bạn bè cùng lời nhắn như Zalo */}
              <div className="flex items-center space-x-2 pt-1 pb-2">
                {/* 1. Gửi tin nhắn */}
                <button
                  type="button"
                  onClick={() => {
                    const targetName = profileModalUser.name;
                    const targetId = profileModalUser.id;
                    setProfileModalUser(null);
                    push('friendChat', { name: targetName, id: targetId });
                  }}
                  className="flex-1 h-11 bg-parchment hover:bg-hairline text-ink text-[14px] font-semibold rounded-full border border-hairline flex items-center justify-center space-x-1.5 apple-press transition"
                >
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Nhắn tin</span>
                </button>

                {/* 2. Thêm bạn bè cùng lời nhắn */}
                <button
                  type="button"
                  onClick={() => {
                    if (!profileModalUser.requestSent) {
                      setShowInviteMessageModal(true);
                    }
                  }}
                  disabled={profileModalUser.requestSent}
                  className={`flex-1 h-11 text-[14px] font-semibold rounded-full flex items-center justify-center space-x-1.5 apple-press transition  ${
                    profileModalUser.requestSent
                      ? 'bg-hairline text-ink-muted cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-focus text-white'
                  }`}
                >
                  {profileModalUser.requestSent ? (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      <span>Đã gửi lời mời</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-white" />
                      <span>Kết bạn</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LỜI NHẮN KẾT BẠN (NHƯ ZALO) */}
      {/* ========================================================================= */}
      {showInviteMessageModal && profileModalUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backblur-xs anim-fade-in">
          <div className="w-full max-w-sm bg-canvas rounded-[18px] p-5 border border-hairline  space-y-4 anim-sheet-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="text-[15px] font-semibold text-ink">
                  Gửi lời mời kết bạn
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteMessageModal(false)}
                className="w-11 h-11 rounded-full bg-parchment flex items-center justify-center text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient info */}
            <div className="flex items-center space-x-2.5 p-2.5 bg-parchment rounded-[11px] border border-hairline">
              <div className="w-11 h-11 rounded-full bg-primary text-white font-semibold text-[12px] flex items-center justify-center shrink-0">
                {profileModalUser.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-ink truncate">
                  Gửi tới: {profileModalUser.name}
                </p>
                <p className="text-[12px] text-ink-muted">
                  {profileModalUser.phone}
                </p>
              </div>
            </div>

            {/* Custom Invitation Message like Zalo */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">
                Lời chào kết bạn
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={inviteMessage}
                  maxLength={150}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Nhập lời chào kết bạn..."
                  className="w-full p-3 text-[14px] bg-parchment border border-hairline rounded-[11px] focus:bg-canvas focus:border-primary outline-none text-ink resize-none"
                />
                <span className="absolute right-2.5 bottom-2.5 text-[12px] text-ink-muted">
                  {inviteMessage.length}/150
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowInviteMessageModal(false)}
                className="flex-1 h-11 bg-parchment hover:bg-hairline text-ink text-[14px] font-semibold rounded-full border border-hairline apple-press"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendInviteWithMessage}
                className="flex-1 h-11 bg-primary hover:bg-primary-focus text-white text-[14px] font-semibold rounded-full flex items-center justify-center space-x-1.5 apple-press "
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Gửi lời mời</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Nhập số điện thoại để kết bạn */}
      {/* ========================================================================= */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backblur-xs anim-fade-in">
          <div className="w-full max-w-sm bg-canvas rounded-[18px] p-5 border border-hairline  space-y-4 anim-sheet-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-primary" />
                <h3 className="text-[15px] font-semibold text-ink">
                  Tìm bằng số điện thoại
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="w-11 h-11 rounded-full bg-parchment flex items-center justify-center text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchPhone} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-ink-muted uppercase tracking-wider">
                  Số điện thoại
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ví dụ: 0912 345 678"
                    autoFocus
                    className="w-full h-11 px-3 text-[14px] bg-parchment border border-hairline rounded-[11px] focus:bg-canvas focus:border-primary outline-none text-ink"
                  />
                  {phoneNumber && (
                    <button
                      type="button"
                      onClick={() => setPhoneNumber('')}
                      className="absolute right-2.5 top-3.5 text-ink-muted hover:text-ink"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full h-11 bg-primary hover:bg-primary-focus text-white text-[14px] font-semibold rounded-full flex items-center justify-center space-x-1.5 apple-press "
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearching ? 'Đang tìm kiếm...' : 'Tìm bạn bè'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Quét mã QR của bạn bè */}
      {/* ========================================================================= */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backblur-sm anim-fade-in">
          <div className="w-full max-w-sm bg-canvas rounded-[18px] p-5 border border-hairline  space-y-4 anim-sheet-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-primary" />
                <h3 className="text-[15px] font-semibold text-ink">
                  Quét mã QR bạn bè
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScannerModal(false)}
                className="w-11 h-11 rounded-full bg-parchment flex items-center justify-center text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewfinder simulation */}
            <div className="relative aspect-square w-full bg-[#1d1d1f] rounded-[18px] overflow-hidden flex items-center justify-center border border-[#333333]">
              {/* Corner guides */}
              <div className="absolute inset-8 border-2 border-primary rounded-[11px] pointer-events-none">
                {/* Laser scan line */}
                <div className="w-full h-0.5 bg-primary  animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>

              <div className="text-center p-4 z-10">
                <Camera className="w-8 h-8 text-white/60 mx-auto mb-2" />
                <p className="text-[12px] text-white/80 font-normal">
                  Đặt mã QR vào giữa khung hình để quét
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSimulateScan}
                className="flex-1 h-11 bg-primary hover:bg-primary-focus text-white text-[14px] font-semibold rounded-full flex items-center justify-center space-x-1.5 apple-press "
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mô phỏng quét mã</span>
              </button>
              <button
                type="button"
                onClick={handleSimulateScan}
                className="px-4 h-11 bg-parchment text-ink text-[12px] font-semibold rounded-full flex items-center justify-center apple-press border border-hairline"
              >
                Chọn ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
