import React from 'react';
import SamplePlanScreen from './SamplePlanScreen';
import { Place, Trip } from './tripModel';
import { destinations } from './destinations';

export default function TrackTripScreen({ trip, companions = [], onBack, onUpdate, onSavePlace }: { trip: Trip; companions?: Trip['members']; onBack: () => void; onUpdate: (trip: Trip) => void; onSavePlace?: (place: Place) => void }) {
  const destination = destinations.find(item => item.key === trip.cityKey) ?? { key: trip.cityKey, name: trip.city, fullName: trip.destination, coords: trip.coords, image: trip.image, dayPlans: [], hotSpots: [] };
  return <SamplePlanScreen trip={trip} destination={destination} companions={companions} onBack={onBack} onUpdate={onUpdate} onSavePlace={onSavePlace} />;
}
