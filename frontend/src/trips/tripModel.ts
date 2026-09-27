export type StopStatus = 'pending' | 'active' | 'completed';
export type TripStatus = 'upcoming' | 'completed' | 'cancelled';
export type TripStop = Place & {
  id: string; name: string; time: string; note?: string; lat?: number; lng?: number; status: StopStatus; image?: string; category?: string;
};
export type TripDay = { dayNumber: number; dayTitle: string; highlight?: string; stops: TripStop[] };
export type Place = { id?: string | number; name: string; note?: string; lat?: number; lng?: number; category?: string; categoryLabel?: string; image?: string; city?: string; description?: string; rating?: number; reviewsCount?: string | number; address?: string; openingHours?: string; phone?: string; communityNotes?: string[] };
export type TripDestination = {
  key: string; name: string; fullName?: string; coords: number[]; image?: string;
  dayPlans: { dayTitle: string; highlight?: string; stops: (Place & { time?: string })[] }[];
  hotSpots: Place[];
};
export type Expense = { id: string; title: string; amount: number; payer: string };
export type ChecklistItem = { id: string; text: string; checked: boolean };
export type Trip = {
  id: string; title: string; city: string; destination: string; cityKey: string; coords: number[];
  image?: string; startDate: string; endDate: string; status: TripStatus; dayPlans: TripDay[];
  members: { id: string; name: string; avatar?: string }[]; expenses: Expense[]; checklist: ChecklistItem[];
  aiRequested: boolean; aiPreferences: string[]; aiPrompt: string;
  dateMode?: 'specific' | 'flexible'; flexibleDays?: number; lodgingType?: string; hotelStays?: HotelStay[];
};
export type HotelStay = { id: string; hotel: Place; startDay: number; endDay: number; checkInTime: string; checkOutTime: string; notes: string };

let nextId = 0;
export const makeId = () => `${Date.now()}_${++nextId}`;
export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const displayDate = (date: string) => date ? date.split('-').reverse().join('/') : '--/--/----';
export const dayCount = (start: string, end: string) => Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1);
export const durationLabel = (days: number) => days <= 1 ? '1 ngày' : `${days} ngày ${days - 1} đêm`;
export const addDays = (start: string, days: number) => {
  const [year, month, day] = start.split('-').map(Number);
  return dateKey(new Date(year, month - 1, day + days));
};
export const tripStops = (trip: Pick<Trip, 'dayPlans'>) => trip.dayPlans.flatMap((day) => day.stops);

export function buildDays(destination: TripDestination, count: number, current: TripDay[] = []): TripDay[] {
  const used = new Set<string>();
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const previous = current[index];
    const source = destination.dayPlans[index];
    const candidates = previous?.stops ?? source?.stops ?? destination.hotSpots.filter((spot) => !used.has(normalizeName(spot.name))).slice(0, 3);
    const stops = candidates.filter((stop) => {
      const key = normalizeName(stop.name);
      if (!key || used.has(key)) return false;
      used.add(key);
      return true;
    }).map((stop, stopIndex) => ({
      ...stop,
      id: previous ? String(stop.id) : makeId(),
      time: 'time' in stop && typeof stop.time === 'string' ? stop.time : ['08:30', '14:00', '18:30'][stopIndex % 3],
      status: previous && 'status' in stop ? stop.status as StopStatus : 'pending' as StopStatus,
    }));
    return { dayNumber: index + 1, dayTitle: previous?.dayTitle ?? source?.dayTitle ?? `Ngày ${index + 1}: Khám phá ${destination.name}`, highlight: previous?.highlight ?? source?.highlight, stops };
  });
}

export function addStop(days: TripDay[], index: number, place: Place): TripDay[] {
  if (!place.name.trim() || days.some((day) => day.stops.some((stop) => normalizeName(stop.name) === normalizeName(place.name) || (typeof stop.lat === 'number' && typeof stop.lng === 'number' && typeof place.lat === 'number' && typeof place.lng === 'number' && Math.abs(stop.lat - place.lat) < 0.0005 && Math.abs(stop.lng - place.lng) < 0.0005)))) {
    throw new Error('Địa điểm này đã có trong lịch trình.');
  }
  return days.map((day, dayIndex) => dayIndex !== index ? day : {
    ...day, stops: [...day.stops, { ...place, name: place.name.trim(), id: makeId(), time: '09:00', status: 'pending' }],
  });
}

export function createTrip(destination: TripDestination, title: string, startDate: string, endDate: string, days: TripDay[], options: { dateMode?: 'specific' | 'flexible'; hotelStays?: HotelStay[]; preferences?: string[]; lodgingType?: string } = {}): Trip {
  const flexible = options.dateMode === 'flexible';
  if (!flexible && (!startDate || !endDate || !Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)) || endDate < startDate || startDate < dateKey(new Date()))) {
    throw new Error('Vui lòng chọn ngày đi và ngày về hợp lệ trên lịch.');
  }
  if (!title.trim()) throw new Error('Vui lòng nhập tên chuyến đi.');
  if (!days.length || (!flexible && days.length !== dayCount(startDate, endDate))) throw new Error('Số ngày trong lịch trình chưa khớp với thời gian chuyến đi.');
  const stays = options.hotelStays ?? [];
  const accepted: HotelStay[] = [];
  for (const stay of stays) { if (!validStayRange(days.length, accepted, stay.startDay, stay.endDay)) throw new Error('Ngày lưu trú không hợp lệ hoặc trùng đêm.'); accepted.push(stay); }
  const seen = new Set<string>();
  const dayPlans = days.map((day, index) => ({ ...day, dayNumber: index + 1, stops: day.stops.filter((stop) => {
    const key = normalizeName(stop.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((stop) => ({ ...stop, status: 'pending' as StopStatus })) }));
  if (!dayPlans.some((day) => day.stops.length)) throw new Error('Vui lòng thêm ít nhất một điểm dừng cho chuyến đi.');
  return {
    id: makeId(), title: title.trim(), city: destination.name, destination: destination.fullName ?? destination.name,
    cityKey: destination.key, coords: [...destination.coords], image: destination.image, startDate, endDate,
    status: 'upcoming', dayPlans, members: [], expenses: [], checklist: [], aiRequested: false, aiPrompt: '',
    dateMode: options.dateMode ?? 'specific', flexibleDays: flexible ? days.length : undefined,
    hotelStays: stays.map(stay => ({ ...stay, hotel: { ...stay.hotel } })), lodgingType: options.lodgingType ?? 'undecided', aiPreferences: options.preferences ?? [],
  };
}

export function nextStayGap(days: number, stays: HotelStay[]) {
  if (days <= 1) return stays.length ? null : { startDay: 1, endDay: 1 };
  const covered = new Set(stays.flatMap(stay => Array.from({ length: Math.max(0, stay.endDay - stay.startDay) }, (_, i) => stay.startDay + i)));
  let startDay = 1; while (startDay < days && covered.has(startDay)) startDay++;
  if (startDay === days) return null;
  let endDay = startDay + 1; while (endDay < days && !covered.has(endDay)) endDay++;
  return { startDay, endDay };
}
export function validStayRange(days: number, stays: HotelStay[], startDay: number, endDay: number) {
  if (!Number.isInteger(startDay) || !Number.isInteger(endDay) || startDay < 1 || endDay > days) return false;
  if (days === 1) return startDay === 1 && endDay === 1 && !stays.length;
  return endDay > startDay && !stays.some(stay => startDay < stay.endDay && endDay > stay.startDay);
}
export function reorderStop(plans: TripDay[], day: number, id: string, direction: number) {
  const index = plans[day]?.stops.findIndex(stop => stop.id === id) ?? -1;
  const target = index + direction;
  if (index < 0 || target < 0 || target >= plans[day].stops.length) return plans;
  const stops = [...plans[day].stops]; [stops[index], stops[target]] = [stops[target], stops[index]];
  return plans.map((plan, i) => i === day ? { ...plan, stops } : plan);
}
export function moveStop(plans: TripDay[], source: number, target: number, id: string) {
  const stop = plans[source]?.stops.find(item => item.id === id);
  if (!stop || source === target || !plans[target]) return plans;
  return plans.map((plan, i) => i === source ? { ...plan, stops: plan.stops.filter(item => item.id !== id) } : i === target ? { ...plan, stops: [...plan.stops, stop] } : plan);
}

export function toggleStop(trip: Trip, id: string): Trip {
  const target = tripStops(trip).find((stop) => stop.id === id);
  if (!target || trip.status === 'cancelled') return trip;
  const status: StopStatus = target.status === 'pending' ? 'active' : target.status === 'active' ? 'completed' : 'pending';
  const dayPlans = trip.dayPlans.map((day) => ({ ...day, stops: day.stops.map((stop) => ({
    ...stop, status: stop.id === id ? status : status === 'active' && stop.status === 'active' ? 'completed' as StopStatus : stop.status,
  })) }));
  const stops = dayPlans.flatMap((day) => day.stops);
  return { ...trip, dayPlans, status: stops.length && stops.every((stop) => stop.status === 'completed') ? 'completed' : 'upcoming' };
}

export function addTripMember(trip: Trip, member: Trip['members'][number]): Trip {
  if (!member.id || !member.name.trim() || trip.members.some(item => item.id === member.id || normalizeName(item.name) === normalizeName(member.name))) return trip;
  return { ...trip, members: [...trip.members, { ...member }] };
}

export function addExpense(trip: Trip, title: string, amount: string, payer: string): Trip {
  const value = Number(amount);
  if (!title.trim() || !Number.isSafeInteger(value) || value <= 0) throw new Error('Nhập tên khoản chi và số tiền nguyên lớn hơn 0.');
  return { ...trip, expenses: [{ id: makeId(), title: title.trim(), amount: value, payer }, ...trip.expenses] };
}

export type SavedPlaceList = { id: string; name: string; destination: TripDestination; places: Place[] };
