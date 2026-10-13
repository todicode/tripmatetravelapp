import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import ManualPlannerScreen from './ManualPlannerScreen';
import TripMetadataForm from './TripMetadataForm';
import { useTripDetailsViewModel } from './useTripDetailsViewModel';
import { Button, useTripUi } from './tripUi';
import SamplePlanScreen from './SamplePlanScreen';
import { Place, Trip } from './tripModel';
import { destinations } from './destinations';

export default function TrackTripScreen({
  trip,
  companions = [],
  onBack,
  onSavePlace,
}: {
  trip: Trip;
  companions?: Trip['members'];
  onBack: () => void;
  onSavePlace?: (place: Place) => void;
}) {
  const vm = useTripDetailsViewModel(trip, onBack, Alert.alert);
  const { s } = useTripUi();
  const destination = destinations.find((item) => item.key === trip.cityKey) ?? {
    key: trip.cityKey,
    name: trip.city,
    fullName: trip.destination,
    coords: trip.coords,
    image: trip.image,
    dayPlans: [],
    hotSpots: [],
  };
  if (vm.metadata)
    return (
      <TripMetadataForm
        trip={trip}
        busy={vm.busy}
        error={vm.error}
        onBack={() => vm.setMetadata(false)}
        onSave={vm.saveMetadata}
      />
    );
  if (vm.editing)
    return (
      <ManualPlannerScreen
        trip={vm.draft}
        destination={destination}
        onBack={() => {
          if (!vm.busy) vm.setEditing(false);
        }}
        onClose={vm.back}
        onUpdate={vm.update}
        onSave={vm.save}
        saving={vm.busy}
        error={vm.error}
      />
    );
  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 8 }}>
        <Button
          outline
          label="Chỉnh lịch"
          disabled={vm.busy || trip.status === 'cancelled'}
          onPress={() => vm.setEditing(true)}
        />
        {trip.myRole === 'OWNER' && (
          <Button
            outline
            label="Thông tin"
            disabled={vm.busy || trip.status === 'cancelled'}
            onPress={() => vm.confirmDiscard(() => vm.setMetadata(true))}
          />
        )}
        <Button outline label="Tải lại" disabled={vm.busy} onPress={vm.reload} />
        {trip.myRole === 'OWNER' && (
          <>
            <Button
              outline
              label={trip.status === 'cancelled' ? 'Khôi phục' : 'Hủy chuyến'}
              disabled={vm.busy}
              onPress={vm.changeStatus}
            />
            <Button outline label="Xóa" disabled={vm.busy} onPress={vm.remove} />
          </>
        )}
      </ScrollView>
      {trip.status === 'cancelled' && (
        <Text style={s.error}>Chuyến đã hủy. Khôi phục để chỉnh sửa.</Text>
      )}
      <View style={{ flex: 1 }} pointerEvents={vm.busy ? 'none' : 'auto'}>
        <SamplePlanScreen
          trip={vm.draft}
          destination={destination}
          companions={companions}
          onBack={vm.back}
          onUpdate={(next) => {
            if (trip.status !== 'cancelled') vm.update(next);
          }}
          onSave={vm.save}
          error={vm.busy ? 'Đang lưu…' : vm.error}
          onSavePlace={onSavePlace}
        />
      </View>
    </View>
  );
}
