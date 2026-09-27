import React from 'react';
import TripSetupScreen, { SavedPlaceList } from './TripSetupScreen';
import { Trip } from './tripModel';

export default function CreateTripScreen({ lists = [], ...props }: { initialCityKey?: string; initialTitle?: string; lists?: SavedPlaceList[]; onBack: () => void; onSave: (trip: Trip) => void }) {
  return <TripSetupScreen {...props} lists={lists} />;
}
