import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Header } from '../trips/tripUi';
import { Friend, matchesFriend } from './chatModel';
import { useCreateGroup } from './useCreateGroup';
import { Avatar, useChatUi, Icon } from './chatUi';
import TripLinkPicker from './TripLinkPicker';
import ChatAvatar from './ChatAvatar';
import type { Trip } from '../trips/tripModel';

export default function CreateGroupScreen({
  friends,
  trips,
  loadAvatar,
  onBack,
  onCreate,
}: {
  friends: Friend[];
  trips: Trip[];
  loadAvatar?: (id: string) => Promise<string>;
  onBack: () => void;
  onCreate: (name: string, members: string[], tripId: string | null) => Promise<void>;
}) {
  const { c, s, u } = useChatUi();
  const [query, setQuery] = useState('');
  const { name, setName, selected, toggle, error, busy, create, tripId, setTripId } =
    useCreateGroup(onCreate);
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header
        title="Tạo nhóm"
        subtitle="Trò chuyện cùng bạn bè."
        onBack={onBack}
        action={
          <Button
            label={busy ? 'Đang tạo...' : 'Tạo'}
            disabled={busy}
            onPress={() => {
              void create();
            }}
          />
        }
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
        <View style={s.card}>
          <Text style={s.label}>TÊN NHÓM</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!busy}
            accessibilityLabel="Tên nhóm"
            style={s.input}
          />
        </View>
        <View style={s.card}>
          <TripLinkPicker trips={trips} value={tripId} disabled={busy} onChange={setTripId} />
        </View>
        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.title}>Thêm bạn bè</Text>
            <Text style={s.badge}>{selected.length}/99</Text>
          </View>
          <View style={u.search}>
            <Icon name="magnify" color={c.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Tìm bạn bè"
              placeholder="Tìm bạn bè..."
              placeholderTextColor={c.muted}
              style={u.searchInput}
            />
          </View>
          {!friends.length && (
            <Text style={s.text}>
              Chưa có bạn bè. Bạn vẫn có thể tạo nhóm và thêm thành viên sau.
            </Text>
          )}
          {friends
            .filter((friend) => matchesFriend(friend, query))
            .map((friend) => {
              const checked = selected.includes(friend.id);
              return (
                <Pressable
                  key={friend.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked,
                    disabled: busy || (!checked && selected.length >= 99),
                  }}
                  disabled={busy || (!checked && selected.length >= 99)}
                  onPress={() => toggle(friend.id)}
                  style={({ pressed }) => [s.row, { minHeight: 64 }, pressed && { opacity: 0.6 }]}
                >
                  <ChatAvatar
                    text={friend.avatar}
                    mediaId={friend.avatarMediaId}
                    load={loadAvatar}
                  />
                  <Text style={[s.title, s.grow]}>{friend.name}</Text>
                  <Icon
                    name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    color={checked ? c.blue : c.muted}
                  />
                </Pressable>
              );
            })}
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
