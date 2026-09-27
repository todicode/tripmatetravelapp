import React, { useEffect, useRef } from 'react';
import { X, MessageCircle, User, Info } from 'lucide-react';

function Avatar({ person, large = false }) {
  const initials = person.name.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();
  return <span className={`relative rounded-full bg-primary text-white font-semibold flex items-center justify-center shrink-0 ${large ? 'w-20 h-20 text-[24px]' : 'w-8 h-8 text-[12px]'}`}>
    {person.avatar ? <img src={person.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials}
    {person.online && <span aria-hidden="true" className={`absolute bottom-0 right-0 bg-success rounded-full border-2 border-canvas ${large ? 'w-4 h-4' : 'w-2.5 h-2.5'}`} />}
  </span>;
}

export function ChatAvatar({ person, onClick }) {
  return <button type="button" onClick={onClick} aria-label={`Xem hồ sơ của ${person.name}`} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full apple-press"><Avatar person={person} /></button>;
}

export default function ChatPersonProfile({ person, onClose, onMessage }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector('button')?.focus({ preventScroll: true });
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = Array.from(panel.current?.querySelectorAll('button') || []);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus({ preventScroll: true }); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus({ preventScroll: true }); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus({ preventScroll: true }); };
  }, [onClose]);
  return <div data-modal-layer className="absolute inset-0 z-[60] bg-black/35 flex items-end" onClick={onClose}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="chat-person-title" onClick={event => event.stopPropagation()} className="w-full max-h-[85%] overflow-y-auto no-scrollbar rounded-t-[18px] bg-canvas p-4 anim-sheet-up">
      <span aria-hidden="true" className="block w-10 h-1 rounded-full bg-hairline mx-auto mb-2" />
      <header className="flex items-center justify-between gap-3"><h2 className="text-[17px] font-semibold text-ink">Thông tin cá nhân</h2><button type="button" onClick={onClose} aria-label="Đóng hồ sơ người dùng" className="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-parchment"><X size={20} /></button></header>
      <div className="flex flex-col items-center text-center pt-3 pb-5"><Avatar person={person} large /><h3 id="chat-person-title" className="text-[20px] font-semibold text-ink mt-3 break-words">{person.name}</h3><p className="text-[14px] text-ink-muted mt-1">{person.relationship}</p>{person.online !== undefined && <p className={`text-[12px] mt-2 ${person.online ? 'text-success' : 'text-ink-muted'}`}>{person.online ? 'Đang trực tuyến' : 'Hiện không trực tuyến'}</p>}</div>
      <div className="rounded-[18px] bg-parchment p-4 space-y-3"><h4 className="text-[14px] font-semibold text-ink flex items-center gap-2"><User size={16} className="text-primary" />Giới thiệu</h4><p className="text-[14px] leading-[1.5] text-ink-muted">{person.bio || 'Người dùng chưa cập nhật phần giới thiệu.'}</p>{person.email && <p className="text-[14px] text-ink-muted">{person.email}</p>}</div>
      <button type="button" onClick={onMessage} className="ui-primary-button w-full mt-4 apple-press"><MessageCircle size={18} />Nhắn tin</button>
      <p className="text-[12px] text-ink-muted flex items-center justify-center gap-1.5 mt-3"><Info size={13} />Hồ sơ mẫu trong ứng dụng</p>
    </section>
  </div>;
}
