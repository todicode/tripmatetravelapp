import { AuthorizedRequest } from '../auth/session';
import { destinations } from './destinations';
import { Place, Trip, TripStop } from './tripModel';

export type CityDto = { code: string; name: string; frontendKey: string | null; latitude: number | null; longitude: number | null };
export type TripDto = { id: string; ownerId: string; title: string; description: string | null; city: CityDto; dateMode: 'SPECIFIC' | 'FLEXIBLE'; durationDays: number; startDate: string | null; endDate: string | null; status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED'; version: string; itineraryVersion: string; myRole: string };
type Snapshot = { name: string; provider: 'OSM' | 'CATALOG' | 'MANUAL'; providerPlaceId?: string | null; lat?: number | null; lng?: number | null; address?: string | null };
export type ItineraryDto = { version: string; tripVersion: string; days: { dayNumber: number; transportMode: 'WALK' | 'DRIVE'; note: string | null; items: { id: string; kind: 'PLACE' | 'NOTE'; placeId: string | null; customTitle: string | null; startTime: string | null; endTime: string | null; note: string | null; status: 'PENDING' | 'ACTIVE' | 'COMPLETED'; estimatedCostVnd: string | null; placeSnapshot: Snapshot | null }[] }[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function itineraryInput(trip: Trip) {
  return trip.dayPlans.map(day => ({ dayNumber: day.dayNumber, transportMode: day.transportMode ?? 'WALK', note: day.note ?? null,
    items: day.stops.map(stop => ({ ...(uuid.test(stop.id) ? { id: stop.id } : {}), kind: stop.kind ?? 'PLACE',
      placeId: stop.kind === 'NOTE' ? null : stop.placeId ?? null, customTitle: stop.name,
      startTime: stop.time || null, endTime: stop.endTime ?? null, note: stop.note ?? null, estimatedCostVnd: stop.estimatedCostVnd ?? null,
      ...(!stop.placeId && stop.kind !== 'NOTE' ? { placeSnapshot: { name: stop.name, provider: stop.provider ?? 'MANUAL', providerPlaceId: stop.providerPlaceId ?? null, lat: stop.lat ?? null, lng: stop.lng ?? null, address: stop.address ?? null } } : {}) })) }));
}
export function createTripInput(trip: Trip) {
  return { title: trip.title, cityCode: trip.cityCode ?? trip.cityKey.toUpperCase().replace(/_/g, ''), dateMode: trip.dateMode === 'flexible' ? 'FLEXIBLE' : 'SPECIFIC',
    durationDays: trip.dayPlans.length, startDate: trip.dateMode === 'flexible' ? null : trip.startDate, endDate: trip.dateMode === 'flexible' ? null : trip.endDate,
    days: itineraryInput(trip).map(day => ({ ...day, items: day.items.map(({ id, ...item }) => item) })) };
}
export function fromServer(dto: TripDto, itinerary: ItineraryDto): Trip {
  const destination = destinations.find(d => d.key === dto.city.frontendKey || d.key.toUpperCase() === dto.city.code);
  return { id: dto.id, title: dto.title, city: dto.city.name, destination: dto.city.name, cityKey: dto.city.frontendKey ?? dto.city.code.toLowerCase(), cityCode: dto.city.code,
    coords: destination?.coords ?? [dto.city.latitude ?? 16.0544, dto.city.longitude ?? 108.2022], image: destination?.image,
    dateMode: dto.dateMode === 'FLEXIBLE' ? 'flexible' : 'specific', flexibleDays: dto.durationDays, startDate: dto.startDate ?? '', endDate: dto.endDate ?? '',
    status: dto.status.toLowerCase() as Trip['status'], version: dto.version, itineraryVersion: itinerary.version, ownerId: dto.ownerId, myRole: dto.myRole,
    members: [], expenses: [], checklist: [], aiRequested: false, aiPreferences: [], aiPrompt: '',
    dayPlans: itinerary.days.map(day => ({ dayNumber: day.dayNumber, dayTitle: `Ngày ${day.dayNumber}`, transportMode: day.transportMode, note: day.note,
      stops: day.items.map(item => ({ id: item.id, kind: item.kind, placeId: item.placeId ?? undefined, name: item.customTitle ?? item.placeSnapshot?.name ?? 'Địa điểm',
        time: item.startTime ?? '', endTime: item.endTime, note: item.note ?? undefined, lat: item.placeSnapshot?.lat ?? undefined, lng: item.placeSnapshot?.lng ?? undefined,
        address: item.placeSnapshot?.address ?? undefined, provider: item.placeSnapshot?.provider, providerPlaceId: item.placeSnapshot?.providerPlaceId ?? undefined,
        estimatedCostVnd: item.estimatedCostVnd, status: item.status.toLowerCase() as TripStop['status'] })) })) };
}
export function tripApi(request: AuthorizedRequest) {
  const get = async (id: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const dto = await request<TripDto>(`/trips/${id}`);
      const itinerary = await request<ItineraryDto>(`/trips/${id}/itinerary`);
      if (dto.version === itinerary.tripVersion && dto.itineraryVersion === itinerary.version) return fromServer(dto, itinerary);
    }
    throw new Error('Chuyến đi vừa được cập nhật. Vui lòng tải lại.');
  };
  return { get,
    searchPlaces: async (cityCode: string, query: string): Promise<Place[]> => {
      const response = await request<{ items: { id: string; providerPlaceId: string; displayName: string; formattedAddress: string | null; coordinates: { latitude: number; longitude: number } | null }[] }>(`/places/search?cityCode=${encodeURIComponent(cityCode)}&q=${encodeURIComponent(query)}&limit=5`);
      return response.items.map(p => ({ name: p.displayName, placeId: p.id, provider: 'OSM', providerPlaceId: p.providerPlaceId, lat: p.coordinates?.latitude, lng: p.coordinates?.longitude, address: p.formattedAddress ?? undefined, note: p.formattedAddress ?? undefined }));
    },
    cities: () => request<{ items: CityDto[] }>('/cities'),
    page: (cursor?: string) => request<{ items: TripDto[]; pageInfo: { hasMore: boolean; nextCursor: string | null } }>(`/trips?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
    create: (body: Record<string, unknown>) => request<TripDto>('/trips', body, 'POST'),
    update: (id: string, body: Record<string, unknown>) => request<TripDto>(`/trips/${id}`, body, 'PATCH'),
    replace: (trip: Trip) => request<ItineraryDto>(`/trips/${trip.id}/itinerary`, { expectedVersion: trip.itineraryVersion, days: itineraryInput(trip) }, 'PUT'),
    progress: (trip: Trip, item: string, status: string) => request<ItineraryDto>(`/trips/${trip.id}/itinerary/items/${item}/status`, { expectedVersion: trip.itineraryVersion, status: status.toUpperCase() }, 'PATCH'),
    remove: (trip: Trip) => request<void>(`/trips/${trip.id}?expectedTripVersion=${trip.version}`, undefined, 'DELETE') };
}
