import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { lightPalette, Palette, useAppTheme } from '../theme/AppTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const c = lightPalette;
export function Icon({ name, size = 18, color }: { name: keyof typeof MaterialCommunityIcons.glyphMap; size?: number; color?: string }) {
  const { colors } = useAppTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? colors.blue} />;
}
export function Button({ label, onPress, outline = false, disabled = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) {
  const { c, s } = useTripUi();
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, outline && s.outline, (pressed || disabled) && { opacity: 0.6 }]}><Text style={[s.buttonText, outline && { color: c.blue }]}>{label}</Text></Pressable>;
}
export function Header({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack: () => void; action?: React.ReactNode }) {
  const { c, s } = useTripUi();
  return <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.chrome }}><View style={[s.row, { minHeight: 44, gap: 12 }]}><Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={onBack} style={[s.back, { width: 44, height: 44 }]}><Icon name="arrow-left" size={20} color={c.ink} /></Pressable><Text numberOfLines={1} style={[s.title, s.grow, { fontSize: 20, lineHeight: 26 }]}>{title}</Text>{action}</View>{subtitle && <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>{subtitle}</Text>}</View>;
}
const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.pale }, grow: { flex: 1, minWidth: 0 }, header: { minHeight: 57, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.white, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 32, height: 32, borderRadius: 20, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }, body: { padding: 16, gap: 16, paddingBottom: 24 }, card: { backgroundColor: c.white, borderRadius: 18, padding: 16, gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, title: { fontSize: 17, color: c.ink, fontWeight: '600' }, text: { fontSize: 14, color: c.ink }, small: { fontSize: 12, color: c.muted }, label: { fontSize: 12, color: c.muted, fontWeight: '600' }, link: { color: c.blue, fontSize: 14, fontWeight: '600' }, input: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: c.border, backgroundColor: c.pale, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: c.ink }, button: { minHeight: 44, backgroundColor: c.blue, borderRadius: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, buttonText: { fontSize: 14, fontWeight: '600', color: c.onBlue }, outline: { borderWidth: 1, borderColor: c.blue, backgroundColor: c.white }, badge: { backgroundColor: c.pale, borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, color: c.blue, fontSize: 12 }, divider: { borderTopWidth: 1, borderColor: c.border, paddingTop: 8 }, chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.pale }, selected: { backgroundColor: c.primaryLight, borderColor: c.blue }, error: { fontSize: 12, color: c.red }, footer: { padding: 16, backgroundColor: c.white, borderTopWidth: 1, borderColor: c.border },
});

export const s = makeStyles(lightPalette);
export function useTripUi() { const { colors } = useAppTheme(); return useMemo(() => ({ c: colors, s: makeStyles(colors) }), [colors]); }
