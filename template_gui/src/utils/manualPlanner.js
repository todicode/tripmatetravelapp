import { emptyDayPlans, parseLocalDate } from './tripSetup.js';

const normalizeName = name => (name || '').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');

export function isDuplicateStop(plans, place) {
  return plans.some(plan => plan.stops.some(stop => normalizeName(stop.name) === normalizeName(place.name) ||
    (Number.isFinite(stop.lat) && Number.isFinite(stop.lng) && Math.abs(stop.lat - place.lat) < 0.0005 && Math.abs(stop.lng - place.lng) < 0.0005)));
}

export function initialManualPlans(setup) {
  const unique = [];
  for (const spot of setup.importedSpots || []) {
    if (!isDuplicateStop([{ stops: unique }], spot)) unique.push({ ...spot, id: spot.id || `import_${unique.length}`, time: spot.time || '09:00' });
  }
  return emptyDayPlans(setup.days, unique);
}

export function moveStop(plans, source, target, id) {
  const stop = plans[source]?.stops.find(s => s.id === id);
  if (!stop || source === target || !plans[target]) return plans;
  return plans.map((plan, i) => ({ ...plan, stops: i === source ? plan.stops.filter(s => s.id !== id) : i === target ? [...plan.stops, { ...stop, dayNumber: target + 1 }] : plan.stops }));
}

export function reorderStop(plans, day, id, direction) {
  const index = plans[day]?.stops.findIndex(s => s.id === id) ?? -1;
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= plans[day].stops.length) return plans;
  const stops = [...plans[day].stops];
  [stops[index], stops[nextIndex]] = [stops[nextIndex], stops[index]];
  return plans.map((plan, i) => i === day ? { ...plan, stops } : plan);
}

export function manualTripPayload(setup, title, plans) {
  const format = value => parseLocalDate(value)?.toLocaleDateString('vi-VN') || '';
  const flexible = setup.dateMode === 'flexible';
  return {
    title: title.trim() || `Khám phá ${setup.destination.name}`,
    destination: setup.destination.fullName || setup.destination.name,
    city: setup.destination.name,
    cityKey: setup.destination.key || setup.destination.cityKey || setup.destination.name,
    coords: setup.destination.coords,
    startDate: flexible ? 'Chưa chốt ngày' : format(setup.start),
    endDate: flexible ? '' : format(setup.end),
    dateMode: setup.dateMode,
    flexibleDays: flexible ? plans.length : null,
    duration: plans.length === 1 ? '1 ngày' : `${plans.length} ngày ${plans.length - 1} đêm`,
    status: 'upcoming', members: [], aiScheduled: false, aiPreferences: setup.preferences, lodgingType: setup.lodgingType || 'undecided', hotelStays: setup.hotelStays || [],
    dayPlans: plans.map((plan, i) => ({ ...plan, dayNumber: i + 1, stops: plan.stops.map(stop => ({ ...stop, dayNumber: i + 1 })) })),
    stops: plans.flatMap((plan, i) => plan.stops.map(stop => ({ ...stop, dayNumber: i + 1 })))
  };
}
