import rawDestinations from '../data/destinations.json';
import { normalizeName, Place, TripDestination } from './tripModel';

export const destinations: TripDestination[] = Object.entries(rawDestinations).map(([key, value]) => ({ ...value, key }));
export const popularNames = ['Đà Lạt', 'Hội An', 'Phú Quốc', 'Sa Pa', 'Nha Trang', 'Hà Giang'];

type PhotonResult = { features?: { properties: { name?: string; city?: string; state?: string; country?: string }; geometry: { coordinates: number[] } }[] };
async function photon(query: string, signal: AbortSignal, coords?: number[]) {
  const bias = coords ? `&lat=${coords[0]}&lon=${coords[1]}` : '';
  const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5${bias}`, { signal });
  if (!response.ok) throw new Error('Không tìm được địa điểm.');
  const result = await response.json() as PhotonResult;
  return (result.features ?? []).filter((item) => item.properties.name && item.geometry.coordinates.length >= 2 && item.geometry.coordinates.every(Number.isFinite));
}
export async function searchDestinations(query: string, signal: AbortSignal): Promise<TripDestination[]> {
  const clean = normalizeName(query);
  const matches = destinations.filter((item) => normalizeName(`${item.name} ${item.fullName ?? ''}`).includes(clean));
  if (matches.length) return matches.slice(0, 5);
  const found = await photon(query, signal);
  return found.map((item) => ({
    key: `osm_${item.geometry.coordinates.join('_')}`, name: item.properties.name!,
    fullName: [item.properties.name, item.properties.state, item.properties.country].filter(Boolean).join(', '),
    coords: [item.geometry.coordinates[1], item.geometry.coordinates[0]], dayPlans: [], hotSpots: [],
  }));
}
export async function searchPlaces(query: string, destination: TripDestination, signal: AbortSignal): Promise<Place[]> {
  const local = [...destination.hotSpots, ...destination.dayPlans.flatMap((day) => day.stops)].filter((item) => normalizeName(item.name).includes(normalizeName(query)));
  if (local.length) return local.filter((item, index) => local.findIndex((candidate) => normalizeName(candidate.name) === normalizeName(item.name)) === index).slice(0, 5);
  const found = await photon(query, signal, destination.coords);
  return found.map((item) => ({ name: item.properties.name!, lat: item.geometry.coordinates[1], lng: item.geometry.coordinates[0], note: [item.properties.city, item.properties.state].filter(Boolean).join(', ') }));
}
