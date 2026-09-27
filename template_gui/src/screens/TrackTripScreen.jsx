import React, { useState } from 'react';
import SamplePlanScreen from './SamplePlanScreen';
import { TripsStore } from '../store/tripsStore';
import { useNav } from '../context/NavContext';

export default function TrackTripScreen({ params = {} }) {
  const { pop } = useNav();
  const [trip, setTrip] = useState(() => params.id ? TripsStore.getTripById(params.id) : TripsStore.getAllTrips()[0]);
  if (!trip) return <div className="h-full bg-parchment text-ink flex flex-col items-center justify-center gap-4"><p>Không tìm thấy chuyến đi.</p><button type="button" onClick={pop} className="ui-primary-button">Quay lại</button></div>;
  const setup = {
    destination: { name: trip.city || trip.destination, fullName: trip.destination, key: trip.cityKey, coords: trip.coords, image: trip.image },
    days: trip.dayPlans.length, dateMode: trip.dateMode,
    preferences: trip.aiPreferences || [], aiNotes: trip.aiPrompt || '',
    lodgingType: trip.lodgingType, hotelStays: trip.hotelStays || []
  };
  return <SamplePlanScreen key={trip.id} setup={setup} savedTrip={trip} onBack={pop} onMembersChange={members => setTrip(TripsStore.updateTripMembers(trip.id, members))} onHotelStaysChange={stays => setTrip(TripsStore.updateTripHotelStays(trip.id, stays))} />;
}
