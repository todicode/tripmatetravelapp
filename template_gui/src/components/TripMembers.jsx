import React, { useState } from 'react';
import { Users, UserPlus, Search, X, Plus } from 'lucide-react';
import StablePopup from './StablePopup';
import { getChatFriends } from '../store/chatPeople';
import { uniqueMembers, sameMember, normalizeMember } from '../utils/tripMembers';
import { useNav } from '../context/NavContext';

const initials = name => name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
function Avatar({ member }) {
  return <span className="w-8 h-8 shrink-0 rounded-full bg-avatar text-white flex items-center justify-center text-[11px] font-semibold">{member.avatar?.startsWith('http') || member.avatar?.startsWith('data:') ? <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials(member.name)}</span>;
}
export default function TripMembers({ trip, onChange }) {
  const { showToast } = useNav();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const members = uniqueMembers(trip.members || []);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  const matches = getChatFriends().filter(friend => !members.some(member => sameMember(member, friend)) && normalize(friend.name).includes(normalize(query)));
  const update = (next, message) => {
    try { onChange(next); showToast('Bạn đồng hành', message); }
    catch { showToast('Chưa lưu được', 'Vui lòng thử lại.'); }
  };
  const add = member => {
    const person = normalizeMember(member);
    if (members.some(existing => sameMember(existing, person))) return;
    update([...members, person], `Đã thêm ${person.name}`);
    setQuery('');
  };
  return <>
    <button type="button" onClick={() => { setQuery(''); setOpen(true); }} className="mx-4 mb-2 min-h-11 shrink-0 flex items-center gap-2 rounded-[11px] text-left apple-press" aria-label="Quản lý bạn đồng hành">
      {members.length ? <span className="flex -space-x-2">{members.slice(0, 3).map(member => <span key={member.id} className="rounded-full ring-2 ring-canvas"><Avatar member={member} /></span>)}</span> : <Users size={18} className="text-primary" />}
      <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-ink">{members.length ? `${members.length} bạn đồng hành` : 'Thêm bạn đồng hành'}</span>{members.length > 0 && <span className="block text-[12px] text-ink-muted truncate">{members.map(member => member.name).join(', ')}</span>}</span><UserPlus size={18} className="text-primary shrink-0" />
    </button>
    {open && <StablePopup label="Bạn đồng hành" onClose={() => setOpen(false)}><div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 space-y-4">
      <header className="flex items-center gap-2"><h2 className="flex-1 text-[20px] font-semibold text-ink">Bạn đồng hành</h2><button type="button" data-popup-close aria-label="Đóng quản lý bạn đồng hành" className="w-11 h-11 flex items-center justify-center text-ink-muted"><X size={20} /></button></header>
      <section><h3 className="text-[14px] font-semibold text-ink mb-2">Người tham gia · {members.length}</h3>{members.length ? members.map(member => <div key={member.id} className="min-h-14 flex items-center gap-3 border-b border-hairline"><Avatar member={member} /><span className="min-w-0 flex-1 text-[14px] text-ink break-words">{member.name}</span><button type="button" onClick={() => update(members.filter(item => item.id !== member.id), `Đã xóa ${member.name}`)} aria-label={`Xóa ${member.name} khỏi chuyến đi`} className="w-11 h-11 shrink-0 flex items-center justify-center text-ink-muted hover:text-danger apple-press"><X size={18} /></button></div>) : <p className="text-[14px] text-ink-muted">Chưa có bạn đồng hành.</p>}</section>
      <section><h3 className="text-[14px] font-semibold text-ink mb-3">Thêm người tham gia</h3><div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-ink-muted" /><input value={query} onChange={event => setQuery(event.target.value)} aria-label="Tìm hoặc nhập tên bạn đồng hành" placeholder="Nhập tên bạn đồng hành" maxLength={80} className="w-full h-11 rounded-full bg-parchment pl-9 pr-3 text-[16px] text-ink outline-none focus:ring-2 focus:ring-primary" /></div>{matches.map(friend => <button type="button" key={friend.id} onClick={() => add(friend)} className="w-full min-h-16 flex items-center gap-3 text-left border-b border-hairline apple-press"><Avatar member={friend} /><span className="flex-1 text-[14px] text-ink">{friend.name}</span><Plus size={18} className="text-primary" /></button>)}{query.trim().length >= 2 && ![...members, ...matches].some(member => normalize(member.name) === normalize(query)) && <button type="button" onClick={() => add({ name: query.trim() })} className="w-full min-h-11 mt-3 text-primary text-[14px] flex items-center gap-2 apple-press"><Plus size={18} />Thêm “{query.trim()}”</button>}</section>
      <p className="text-[12px] text-ink-muted">Danh sách được lưu trong chuyến đi trên bản demo. Chưa gửi lời mời thực tế.</p>
    </div></StablePopup>}
  </>;
}
