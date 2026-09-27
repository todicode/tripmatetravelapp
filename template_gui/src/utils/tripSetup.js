export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const parseLocalDate = (value) => value ? new Date(...value.split('-').map((n, i) => i === 1 ? Number(n) - 1 : Number(n))) : null;
export const countDays = (start, end) => {
  if (!start || !end || end < start) return 0;
  const a = parseLocalDate(start);
  const b = parseLocalDate(end);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000) + 1;
};
export const emptyDayPlans = (days, stops = []) => Array.from({ length: days }, (_, i) => ({
  dayNumber: i + 1, badge: `Ngày ${i + 1}`, dayTitle: `Ngày ${i + 1}`,
  duration: '1 ngày', highlight: '', stops: i === 0 ? stops.map(s => ({ ...s, dayNumber: 1, status: 'pending' })) : []
}));
