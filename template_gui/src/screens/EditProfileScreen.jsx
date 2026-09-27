import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import { useNav } from '../context/NavContext';
import { getProfile, saveProfile } from '../store/profile';

export default function EditProfileScreen() {
  const { pop, showToast } = useNav();
  const [profile, setProfile] = useState(getProfile);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const upload = useRef(null);
  const pickAvatar = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { setError('Chọn ảnh JPG, PNG hoặc WebP dưới 1 MB.'); return; }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => { setProfile(previous => ({ ...previous, avatar: reader.result })); setReading(false); setError(''); };
    reader.onerror = () => { setReading(false); setError('Không đọc được ảnh. Vui lòng chọn lại.'); };
    reader.readAsDataURL(file);
  };
  const save = event => {
    event.preventDefault();
    if (reading) return;
    try {
      saveProfile({ ...profile, name: profile.name.trim(), email: profile.email.trim() });
      showToast('Đã cập nhật hồ sơ', 'Thông tin được lưu trên thiết bị này.');
      pop();
    } catch { setError('Chưa lưu được hồ sơ. Thử dùng ảnh nhỏ hơn.'); }
  };
  return <div className="h-full flex flex-col bg-parchment text-ink">
    <ScreenHeader title="Chỉnh sửa hồ sơ" onBack={pop} />
    <form onSubmit={save} className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 space-y-4">
      <div className="bg-canvas rounded-[18px] p-5 flex flex-col items-center gap-3">
        <button type="button" onClick={() => upload.current?.click()} disabled={reading} aria-label="Thay ảnh đại diện" className="relative w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-[24px] font-semibold apple-press">
          {profile.avatar ? <img src={profile.avatar} alt="Ảnh đại diện" className="w-full h-full object-cover rounded-full" /> : profile.name.trim().slice(-1).toUpperCase() || 'A'}
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-canvas border border-hairline text-primary flex items-center justify-center"><Camera size={16} /></span>
        </button>
        <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickAvatar} className="hidden" />
        <button type="button" disabled={reading} onClick={() => upload.current?.click()} className="min-h-11 text-[14px] text-primary font-semibold">{reading ? 'Đang đọc ảnh…' : 'Thay ảnh đại diện'}</button>
      </div>
      <div className="bg-canvas rounded-[18px] p-4 space-y-4">
        <label className="block text-[14px] font-semibold">Tên hiển thị<input required maxLength={60} value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} pattern=".*\S.*" className="mt-2 w-full h-11 rounded-lg bg-parchment px-3 text-[16px] font-normal outline-none focus:ring-2 focus:ring-primary-focus" /></label>
        <label className="block text-[14px] font-semibold">Email<input required type="email" maxLength={120} value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} className="mt-2 w-full h-11 rounded-lg bg-parchment px-3 text-[16px] font-normal outline-none focus:ring-2 focus:ring-primary-focus" /></label>
      </div>
      {error && <p role="alert" className="text-[14px] text-danger">{error}</p>}
      <button type="submit" disabled={reading} className="w-full ui-primary-button apple-press">Lưu thay đổi</button>
    </form>
  </div>;
}
