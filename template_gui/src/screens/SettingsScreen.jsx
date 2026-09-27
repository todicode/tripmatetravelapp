import React, { useState } from 'react';
import { Bell, Shield, ChevronDown, Sun, Moon } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import { useNav } from '../context/NavContext';
import { getTheme, saveTheme } from '../store/theme';
import { getProfileSettings, saveProfileSettings } from '../store/profile';

export default function SettingsScreen() {
  const { pop, showToast } = useNav();
  const [settings, setSettings] = useState(getProfileSettings);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme);
  const changeTheme = value => {
    try { saveTheme(value); setTheme(value); }
    catch { showToast('Chưa lưu được', 'Vui lòng thử lại.'); }
  };
  const toggle = key => {
    const next = { ...settings, [key]: !settings[key] };
    try { saveProfileSettings(next); setSettings(next); }
    catch { showToast('Chưa lưu được', 'Vui lòng thử lại.'); }
  };
  return <div className="h-full flex flex-col bg-parchment text-ink">
    <ScreenHeader title="Cài đặt" onBack={pop} />
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 space-y-4">
      <section className="bg-canvas rounded-[18px] p-4"><h2 className="flex items-center gap-2 text-[17px] font-semibold mb-3"><Sun size={18} className="text-primary" />Giao diện</h2>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Chế độ giao diện">{[{ value: 'light', label: 'Sáng', icon: Sun }, { value: 'dark', label: 'Tối', icon: Moon }].map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => changeTheme(value)} className={`min-h-11 rounded-[11px] border flex items-center justify-center gap-2 text-[14px] font-semibold apple-press ${theme === value ? 'border-primary bg-primary-light text-primary' : 'border-hairline text-ink-muted'}`}><Icon size={18} />{label}</button>)}</div>
        <p className="text-[12px] text-ink-muted mt-3">Áp dụng cho toàn bộ app và được lưu trên thiết bị.</p>
      </section>
      <section className="bg-canvas rounded-[18px] p-4"><h2 className="flex items-center gap-2 text-[17px] font-semibold mb-2"><Bell size={18} className="text-primary" />Thông báo & nhắc nhở</h2>
        {[{ key: 'tripReminders', label: 'Nhắc lịch chuyến đi' }, { key: 'chatNotifications', label: 'Thông báo tin nhắn' }].map(item => <div key={item.key} className="min-h-14 flex items-center gap-3"><span className="flex-1 text-[14px]" id={`settings-${item.key}`}>{item.label}</span><button type="button" role="switch" aria-checked={settings[item.key]} aria-labelledby={`settings-${item.key}`} onClick={() => toggle(item.key)} className="w-14 h-11 shrink-0 flex items-center justify-center"><span className={`w-11 h-6 p-0.5 rounded-full transition-colors ${settings[item.key] ? 'bg-primary' : 'bg-hairline'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${settings[item.key] ? 'translate-x-5' : ''}`} /></span></button></div>)}
        <p className="text-[12px] leading-[1.5] text-ink-muted mt-2">Tùy chọn được lưu trên thiết bị. Thông báo thực tế sẽ có khi dịch vụ được kết nối.</p>
      </section>
      <section className="bg-canvas rounded-[18px] p-4"><button type="button" onClick={() => setPrivacyOpen(!privacyOpen)} aria-expanded={privacyOpen} className="w-full min-h-11 flex items-center gap-2 text-left"><Shield size={18} className="text-primary shrink-0" /><span className="flex-1 text-[17px] font-semibold">Quyền riêng tư & bảo mật</span><ChevronDown size={18} className={privacyOpen ? 'rotate-180' : ''} /></button>{privacyOpen && <div className="pt-3 space-y-3 text-[14px] leading-[1.5] text-ink-muted"><p>Ảnh đại diện, tên hiển thị và email chỉnh sửa được lưu trên trình duyệt này.</p><p>Chỉnh sửa hồ sơ không thay đổi email đăng nhập hay mật khẩu tài khoản.</p></div>}</section>
    </div>
  </div>;
}
