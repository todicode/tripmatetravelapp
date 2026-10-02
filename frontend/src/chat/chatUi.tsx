import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { c, Icon, s, useTripUi } from '../trips/tripUi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export { c, Icon, s };
export function IconButton({ name, label, onPress, blue = false, disabled = false }: { name: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void; blue?: boolean; disabled?: boolean }) {
  const { c, s, u } = useChatUi();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [u.iconButton, blue && { backgroundColor: c.blue, borderColor: c.blue }, (pressed || disabled) && { opacity: 0.5 }]}><Icon name={name} size={18} color={blue ? c.onBlue : c.ink} /></Pressable>;
}
export function Avatar({ text, group = false, size = 44 }: { text: string; group?: boolean; size?: number }) { const { c, u } = useChatUi(); return <View style={[u.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: group ? c.blue : c.avatar }]}><Text style={u.avatarText}>{text}</Text></View>; }
export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  const { c, s, u } = useChatUi();
  return <View style={u.tabs}>{tabs.map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: tab.key === value }} onPress={() => onChange(tab.key)} style={({ pressed }) => [u.tab, value === tab.key && { backgroundColor: c.white }, pressed && { opacity: 0.6 }]}><Text style={[s.text, { color: value === tab.key ? c.ink : c.muted, fontWeight: value === tab.key ? '600' : '400', textAlign: 'center' }]}>{tab.label}</Text></Pressable>)}</View>;
}
export function Sheet({ visible, title, onClose, children, compact = false, footer }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; compact?: boolean; footer?: React.ReactNode }) {
  const { c, s, u } = useChatUi();
  const insets = useSafeAreaInsets();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => { let active = true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion); return () => { active = false; sub.remove(); }; }, []);
  return <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}><KeyboardAvoidingView style={[u.scrim, compact && { backgroundColor: '#00000040' }]} enabled={Platform.OS === 'ios'} behavior="padding"><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng hộp thoại" /><View accessibilityViewIsModal style={[u.sheet, compact && { height: undefined, maxHeight: '85%' }, { paddingBottom: Math.max(16, insets.bottom) }]}>{!compact && <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center' }} />}<View style={s.between}><Text style={[s.title, { fontSize: compact ? 21 : 20 }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={20} color={c.muted} /></Pressable></View><ScrollView style={compact ? { flexShrink: 1 } : { flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: compact ? 0 : 20 }}>{children}</ScrollView>{footer}</View></KeyboardAvoidingView></Modal>;
}
const makeChatStyles = (c: typeof import('../theme/AppTheme').lightPalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.white }, iconButton: { width: 44, height: 44, borderRadius: 24, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: c.onBlue, fontSize: 14, fontWeight: '600' },
  notice: { fontSize: 10, color: c.muted, textAlign: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.pale },
  tabs: { flexDirection: 'row', backgroundColor: c.pale, padding: 4, borderRadius: 12 }, tab: { flex: 1, borderRadius: 8, minHeight: 44, justifyContent: 'center', padding: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 25, backgroundColor: c.pale, paddingHorizontal: 12 },
  searchInput: { flex: 1, minHeight: 44, paddingVertical: 8, fontSize: 14, color: c.ink }, listRow: { minHeight: 76, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: c.border },
  empty: { padding: 24, alignItems: 'center', gap: 8 }, scrim: { flex: 1, backgroundColor: '#00000059', justifyContent: 'flex-end' }, sheet: { height: '85%', backgroundColor: c.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, gap: 12 },
});

export function useChatUi() { const { c, s } = useTripUi(); return { c, s, u: makeChatStyles(c) }; }
export const u = makeChatStyles(c);
