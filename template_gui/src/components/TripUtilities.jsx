import React, { useState } from 'react';
import { DollarSign, CheckSquare, Plus, Trash2 } from 'lucide-react';
import StablePopup from './StablePopup';
import { TripsStore } from '../store/tripsStore';
import { useNav } from '../context/NavContext';

export default function TripUtilities({ trip }) {
  const { showToast } = useNav();
  const [utilityPopup, setUtilityPopup] = useState(null);
  // Expenses & Checklist states
  const [expenses, setExpenses] = useState(() => TripsStore.getExpenses(trip.id));
  const [checklist, setChecklist] = useState(() => TripsStore.getChecklist(trip.id));
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpensePayer, setNewExpensePayer] = useState('Bạn (Trưởng đoàn)');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Helper to extract clean member details
  const getMemberInfo = (m) => {
    if (!m) return null;
    if (typeof m === 'string') {
      const trimmed = m.trim();
      if (!trimmed) return null;
      return { name: trimmed, initial: trimmed.charAt(0).toUpperCase() || '?', phone: '' };
    }
    const name = (m.name || m.fullName || m.username || '').trim();
    if (!name) return null;
    const initial = (m.avatar && m.avatar.length <= 2) ? m.avatar : (name.charAt(0).toUpperCase() || '?');
    return { name, initial, phone: m.phone || '' };
  };

  const otherMembers = Array.isArray(trip?.members)
    ? trip.members
        .map(getMemberInfo)
        .filter(info => {
          if (!info) return false;
          const norm = info.name.toLowerCase();
          return !norm.includes('bản thân') && !norm.includes('trưởng đoàn') && norm !== 'tôi' && norm !== 'bạn';
        })
    : [];

  const hasCompanions = otherMembers.length > 0;

  const handleAddExpense = () => {
    if (!newExpenseName.trim() || !newExpenseAmount) return;
    const item = TripsStore.addExpense(trip.id, {
      title: newExpenseName.trim(),
      name: newExpenseName.trim(),
      amount: parseInt(newExpenseAmount, 10) || 0,
      payer: hasCompanions ? newExpensePayer : 'Bạn (Trưởng đoàn)',
      category: 'Khác'
    });
    setExpenses([item, ...expenses]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    showToast('Chi phí', `Đã thêm ${item.title || item.name}`);
  };

  const handleDeleteExpense = (expenseId, expenseTitle) => {
    if (!trip) return;
    const updatedExpenses = TripsStore.deleteExpense(trip.id, expenseId);
    setExpenses([...updatedExpenses]);
    showToast('Chi phí', `Đã xóa ${expenseTitle || 'khoản chi'}`);
  };

  const handleToggleChecklist = (itemId) => {
    const updated = TripsStore.toggleChecklist(trip.id, itemId);
    setChecklist([...updated]);
  };

  const handleAddChecklist = () => {
    if (!newChecklistText.trim() || !trip) return;
    const item = TripsStore.addChecklistItem(trip.id, newChecklistText.trim());
    if (item) {
      setChecklist([...checklist, item]);
      setNewChecklistText('');
      showToast('Chuẩn bị', `Đã thêm: ${item.text}`);
    }
  };

  const handleDeleteChecklist = (itemId, itemText) => {
    if (!trip) return;
    const updated = TripsStore.deleteChecklistItem(trip.id, itemId);
    setChecklist([...updated]);
    showToast('Chuẩn bị', `Đã xóa: ${itemText}`);
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return <>
    <div className="absolute top-16 right-3 z-[400] flex gap-2">
      <button type="button" onClick={() => setUtilityPopup('expenses')} aria-label="Chi phí chuyến đi" title="Chi phí" className="ui-icon-button !bg-canvas"><DollarSign size={18} /></button>
      <button type="button" onClick={() => setUtilityPopup('checklist')} aria-label="Danh sách chuẩn bị" title="Chuẩn bị" className="ui-icon-button !bg-canvas"><CheckSquare size={18} /></button>
    </div>
        {utilityPopup === 'expenses' && (
          <StablePopup label="Chi phí chuyến đi" onClose={() => setUtilityPopup(null)}>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 no-scrollbar bg-parchment">
            {/* Header & Back to Overview */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-ink">Chi phí chuyến đi</h2>
                <p className="text-[12px] text-ink-muted">Quản lý ngân sách & chia tiền đồng hành</p>
              </div>
              <button
                type="button"
                data-popup-close
                className="min-w-11 min-h-11 text-[14px] text-primary font-semibold apple-press"
              >
                Đóng
              </button>
            </div>

            {/* Total Summary Card */}
            <div className="bg-canvas rounded-[18px] p-4 border border-hairline ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-ink-muted">Tổng chi phí dự kiến</p>
                  <p className="text-[22px] font-semibold text-primary">
                    {totalExpense.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <span className="text-[12px] text-ink-muted bg-parchment px-2.5 py-1 rounded-full border border-hairline">
                  {expenses.length} khoản chi
                </span>
              </div>

              {hasCompanions && (
                <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between text-[12px]">
                  <span className="text-ink-muted">Bình quân mỗi người ({otherMembers.length + 1} người):</span>
                  <span className="font-semibold text-ink">
                    ~{Math.round(totalExpense / (otherMembers.length + 1)).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
            </div>

            {/* Add Expense Form */}
            <div className="bg-canvas rounded-[18px] p-3.5 border border-hairline space-y-2.5 ">
              <span className="text-[12px] font-semibold text-ink">Thêm khoản chi</span>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder="Tên khoản chi (ăn uống, vé máy bay...)"
                  className="flex-1 min-w-0 h-11 px-3 text-[16px] bg-parchment border border-hairline rounded-[11px] outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  placeholder="Số tiền (đ)"
                  className="w-28 h-11 px-2.5 text-[16px] bg-parchment border border-hairline rounded-[11px] outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center space-x-2">
                {hasCompanions && (
                  <div className="flex-1 flex items-center space-x-1.5 bg-parchment border border-hairline rounded-[11px] px-2.5 h-11">
                    <span className="text-[12px] text-ink-muted whitespace-nowrap">Người chi:</span>
                    <select
                      value={newExpensePayer}
                      onChange={(e) => setNewExpensePayer(e.target.value)}
                      className="bg-transparent text-[12px] text-ink font-normal outline-none w-full"
                    >
                      <option value="Bạn (Trưởng đoàn)">Bạn (Trưởng đoàn)</option>
                      {otherMembers.map((m, idx) => (
                        <option key={idx} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className={`${hasCompanions ? 'px-4' : 'w-full'} h-11 bg-primary text-white rounded-[11px] text-[12px] font-semibold flex items-center justify-center space-x-1 apple-press`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </div>

            {/* Expenses List */}
            <div className="space-y-1.5">
              {expenses.map((exp, idx) => (
                <div key={exp.id || idx} className="p-3 bg-canvas rounded-[18px] border border-hairline flex items-center justify-between text-[14px] ">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-ink truncate">
                      {exp.title || exp.name || 'Khoản chi tiêu'}
                    </p>
                    <p className="text-[12px] text-ink-muted mt-0.5 truncate">
                      {exp.payer || 'Bạn (Trưởng đoàn)'} • {exp.category || 'Chi phí chung'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-semibold text-primary">
                      {(exp.amount || 0).toLocaleString('vi-VN')} đ
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id, exp.title || exp.name)}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors apple-press"
                      aria-label="Xóa chi phí"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </StablePopup>
        )}


        {/* ========================================================
            VIEW 4: CHECKLIST TAB
            ======================================================== */}
        {utilityPopup === 'checklist' && (
          <StablePopup label="Danh sách chuẩn bị" onClose={() => setUtilityPopup(null)}>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 no-scrollbar bg-parchment">
            {/* Header & Back to Overview */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-ink">Danh sách chuẩn bị</h2>
                <p className="text-[12px] text-ink-muted">Hành lý, giấy tờ & vật dụng cần thiết</p>
              </div>
              <button
                type="button"
                data-popup-close
                className="min-w-11 min-h-11 text-[14px] text-primary font-semibold apple-press"
              >
                Đóng
              </button>
            </div>

            {/* Add Checklist Item */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddChecklist();
              }}
              className="bg-canvas rounded-[18px] p-3 border border-hairline flex items-center space-x-2 "
            >
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Thêm đồ dùng (hộ chiếu, sạc pin, thuốc...)"
                className="flex-1 min-w-0 h-11 px-3 text-[16px] bg-parchment border border-hairline rounded-[11px] outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!newChecklistText.trim()}
                className="h-11 px-4 bg-primary text-white rounded-[11px] text-[12px] font-semibold flex items-center justify-center space-x-1 apple-press disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </form>

            {/* Checklist List */}
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`p-3 rounded-[18px] border flex items-center justify-between cursor-pointer apple-press transition  ${
                    item.checked ? 'border-success/30 bg-success/5' : 'border-hairline bg-canvas'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition ${
                      item.checked ? 'bg-success border-success text-white' : 'border-hairline bg-canvas'
                    }`}>
                      {item.checked && <span className="text-[12px] font-semibold">✓</span>}
                    </div>
                    <span className={`text-[14px] truncate ${
                      item.checked ? 'line-through text-ink-muted' : 'text-ink font-normal'
                    }`}>
                      {item.text}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChecklist(item.id, item.text);
                    }}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0 apple-press"
                    aria-label="Xóa món đồ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          </StablePopup>
        )}
  </>;
}
