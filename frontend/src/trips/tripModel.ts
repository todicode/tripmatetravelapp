export type StopStatus = 'pending' | 'active' | 'completed';
export type TripStatus = 'upcoming' | 'completed' | 'cancelled';
export type TripStop = {
  id: string; name: string; time: string; note?: string; lat?: number; lng?: number; status: StopStatus;
};
export type TripDay = { dayNumber: number; dayTitle: string; highlight?: string; stops: TripStop[] };
export type Place = { id?: string | number; name: string; note?: string; lat?: number; lng?: number; category?: string; categoryLabel?: string };
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
  members: { id: string; name: string }[]; expenses: Expense[]; checklist: ChecklistItem[];
  aiRequested: boolean; aiPreferences: string[]; aiPrompt: string;
};

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
  if (!place.name.trim() || days.some((day) => day.stops.some((stop) => normalizeName(stop.name) === normalizeName(place.name)))) {
    throw new Error('Địa điểm này đã có trong lịch trình.');
  }
  return days.map((day, dayIndex) => dayIndex !== index ? day : {
    ...day, stops: [...day.stops, { ...place, name: place.name.trim(), id: makeId(), time: '09:00', status: 'pending' }],
  });
}

export function createTrip(destination: TripDestination, title: string, startDate: string, endDate: string, days: TripDay[]): Trip {
  if (!startDate || !endDate || !Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)) || endDate < startDate || startDate < dateKey(new Date())) {
    throw new Error('Vui lòng chọn ngày đi và ngày về hợp lệ trên lịch.');
  }
  if (!title.trim()) throw new Error('Vui lòng nhập tên chuyến đi.');
  if (days.length !== dayCount(startDate, endDate)) throw new Error('Số ngày trong lịch trình chưa khớp với thời gian chuyến đi.');
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
    status: 'upcoming', dayPlans, members: [], expenses: [], checklist: [], aiRequested: false, aiPreferences: [], aiPrompt: '',
  };
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

export function addExpense(trip: Trip, title: string, amount: string, payer: string): Trip {
  const value = Number(amount);
  if (!title.trim() || !Number.isSafeInteger(value) || value <= 0) throw new Error('Nhập tên khoản chi và số tiền nguyên lớn hơn 0.');
  return { ...trip, expenses: [{ id: makeId(), title: title.trim(), amount: value, payer }, ...trip.expenses] };
}
