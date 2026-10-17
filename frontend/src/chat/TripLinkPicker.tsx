import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Trip } from '../trips/tripModel';
import { displayDate } from '../trips/tripModel';
import { Icon, useChatUi } from './chatUi';

export default function TripLinkPicker({
  trips,
  value,
  disabled = false,
  onChange,
}: {
  trips: Trip[];
  value: string | null;
  disabled?: boolean;
  onChange: (id: string | null) => void;
}) {
  const { c, s } = useChatUi();
  const choices = [
    {
      id: null,
      title: 'Không liên kết chuyến đi',
      subtitle: 'Có thể thêm sau trong thông tin nhóm.',
    },
    ...trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      subtitle:
        trip.dateMode === 'flexible'
          ? `${trip.city} · ${trip.flexibleDays ?? trip.dayPlans.length} ngày linh hoạt`
          : `${trip.city} · ${displayDate(trip.startDate)} – ${displayDate(trip.endDate)}`,
    })),
  ];
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.title}>Chuyến đi liên kết</Text>
      <Text style={s.small}>
        Chọn chuyến do bạn tạo. Thành viên nhóm được xem, không tự có quyền sửa.
      </Text>
      {choices.map((choice) => (
        <Pressable
          key={choice.id ?? 'none'}
          accessibilityRole="radio"
          accessibilityLabel={`Liên kết ${choice.title}`}
          accessibilityState={{ checked: choice.id === value, disabled }}
          disabled={disabled}
          onPress={() => onChange(choice.id)}
          style={[s.row, { minHeight: 64, paddingVertical: 8 }]}
        >
          <Icon
            name={choice.id === value ? 'radiobox-marked' : 'radiobox-blank'}
            color={choice.id === value ? c.blue : c.muted}
          />
          <View style={s.grow}>
            <Text style={s.text}>{choice.title}</Text>
            <Text style={s.small}>{choice.subtitle}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
