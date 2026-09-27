import { emptyDayPlans } from './tripSetup.js';

export const mockTransfers = [
  { mode: 'walk', minutes: 4, distance: '350 m' },
  { mode: 'car', minutes: 12, distance: '3,7 km' }
];

export function sampleDayPlans(destination, days) {
  const seen = new Set();
  const places = (destination.dayPlans || []).flatMap(day => day.stops || []).filter(place => {
    const key = place.name.trim().toLocaleLowerCase('vi-VN');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const plans = emptyDayPlans(days);
  places.forEach((place, index) => {
    const day = Math.min(days - 1, Math.floor(index * days / places.length));
    plans[day].stops.push({ ...place, id: `sample_${index}`, dayNumber: day + 1, status: 'pending', saved: false, image: place.image || destination.image });
  });
  return plans;
}
