import { Place, SavedPlaceList, TripDestination } from './trips/tripModel';

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const hasOptionalText = (value: unknown) => value === undefined || typeof value === 'string';
const hasOptionalNumber = (value: unknown) => value === undefined || (typeof value === 'number' && Number.isFinite(value));
function isPlace(value: unknown): value is Place {
  return isRecord(value) && typeof value.name === 'string' && ['note', 'category', 'categoryLabel', 'image', 'city', 'description', 'address', 'openingHours', 'phone'].every(key => hasOptionalText(value[key])) && hasOptionalNumber(value.lat) && hasOptionalNumber(value.lng) && hasOptionalNumber(value.rating) && (value.reviewsCount === undefined || typeof value.reviewsCount === 'string' || hasOptionalNumber(value.reviewsCount)) && (value.communityNotes === undefined || Array.isArray(value.communityNotes) && value.communityNotes.every(item => typeof item === 'string')) && (value.id === undefined || typeof value.id === 'string' || typeof value.id === 'number');
}
function isDestination(value: unknown): value is TripDestination {
  return isRecord(value) && typeof value.key === 'string' && typeof value.name === 'string' && hasOptionalText(value.fullName) && hasOptionalText(value.image) && Array.isArray(value.coords) && value.coords.length === 2 && value.coords.every(item => typeof item === 'number' && Number.isFinite(item)) && Array.isArray(value.hotSpots) && value.hotSpots.every(isPlace) && Array.isArray(value.dayPlans) && value.dayPlans.every(day => isRecord(day) && typeof day.dayTitle === 'string' && hasOptionalText(day.highlight) && Array.isArray(day.stops) && day.stops.every(isPlace));
}
function isSavedList(value: unknown): value is SavedPlaceList {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && Array.isArray(value.places) && value.places.every(isPlace) && isDestination(value.destination);
}
export function parseSavedLists(raw: string): SavedPlaceList[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isSavedList)) throw new Error('Invalid saved places');
  return value;
}
