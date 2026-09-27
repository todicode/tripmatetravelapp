export function nextStayGap(days, stays) {
  if (days <= 1) return stays.length ? null : { startDay: 1, endDay: 1 };
  const covered = new Set(stays.flatMap(stay => Array.from({ length: Math.max(0, stay.endDay - stay.startDay) }, (_, index) => stay.startDay + index)));
  let startDay = 1;
  while (startDay < days && covered.has(startDay)) startDay++;
  if (startDay === days) return null;
  let endDay = startDay + 1;
  while (endDay < days && !covered.has(endDay)) endDay++;
  return { startDay, endDay };
}
export function validStayRange(days, stays, startDay, endDay) {
  if (!Number.isInteger(startDay) || !Number.isInteger(endDay) || startDay < 1 || endDay > days) return false;
  if (days === 1) return startDay === 1 && endDay === 1 && !stays.length;
  return endDay > startDay && !stays.some(stay => startDay < stay.endDay && endDay > stay.startDay);
}
