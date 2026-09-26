import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { c, Icon, s } from '../trips/tripUi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export { c, Icon, s };
export function IconButton({ name, label, onPress, blue = false, disabled = false }: { name: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void; blue?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [u.iconButton, blue && { backgroundColor: c.blue, borderColor: c.blue }, (pressed || disabled) && { opacity: 0.5 }]}><Icon name={name} size={18} color={blue ? c.white : c.ink} /></Pressable>;
}
export function Avatar({ text, group = false }: { text: string; group?: boolean }) { return <View style={[u.avatar, { backgroundColor: group ? c.blue : c.ink }]}><Text style={u.avatarText}>{text}</Text></View>; }
export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  return <View style={u.tabs}>{tabs.map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: tab.key === value }} onPress={() => onChange(tab.key)} style={({ pressed }) => [u.tab, value === tab.key && { backgroundColor: c.white }, pressed && { opacity: 0.6 }]}><Text style={[s.text, { color: value === tab.key ? c.ink : c.muted, fontWeight: value === tab.key ? '600' : '400', textAlign: 'center' }]}>{tab.label}</Text></Pressable>)}</View>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={u.scrim} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng hộp thoại" /><View style={[u.sheet, { paddingBottom: Math.max(16, insets.bottom) }]}><View style={s.between}><Text style={s.title}>{title}</Text><IconButton name="close" label="Đóng" onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>;
}
export const u = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.white }, iconButton: { width: 44, height: 44, borderRadius: 24, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: c.white, fontSize: 13, fontWeight: '700' },
  notice: { fontSize: 10, color: c.muted, textAlign: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.pale },
  tabs: { flexDirection: 'row', backgroundColor: c.pale, padding: 4, borderRadius: 12 }, tab: { flex: 1, borderRadius: 8, minHeight: 36, justifyContent: 'center', padding: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 25, backgroundColor: c.pale, paddingHorizontal: 12 },
  searchInput: { flex: 1, minHeight: 40, paddingVertical: 8, fontSize: 12, color: c.ink }, listRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  empty: { padding: 24, alignItems: 'center', gap: 8 }, scrim: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }, sheet: { maxHeight: '85%', backgroundColor: c.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 12 },
});
