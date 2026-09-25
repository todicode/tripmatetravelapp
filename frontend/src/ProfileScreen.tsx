import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Props = {
  user: { displayName: string; email: string };
  onExplore: () => void;
  onLogout: () => void;
};

const colors = {
  blue: '#0066cc',
  ink: '#1d1d1f',
  muted: '#7a7a7a',
  border: '#e0e0e0',
  canvas: '#f5f5f7',
  white: '#ffffff',
  red: '#ff3b30',
};

const pending = (title: string) => Alert.alert(title, 'Giao diện này sẽ được bổ sung ở phần tiếp theo.');

export default function ProfileScreen({ user, onExplore, onLogout }: Props) {
  const name = user.displayName?.trim() || user.email;
  const initial = name.charAt(0).toLocaleUpperCase('vi-VN');
  const menuItems: { label: string; icon: IconName; action: () => void }[] = [
    { label: 'Chuyến đi của tôi', icon: 'calendar-month-outline', action: () => pending('Chuyến đi của tôi') },
    { label: 'Lời mời kết bạn', icon: 'account-outline', action: () => pending('Lời mời kết bạn') },
    { label: 'Điểm đến yêu thích', icon: 'heart-outline', action: () => pending('Điểm đến yêu thích') },
    { label: 'Bản đồ OpenStreetMap đã qua', icon: 'compass-outline', action: onExplore },
    { label: 'Thông báo & nhắc nhở', icon: 'bell-outline', action: () => pending('Thông báo & nhắc nhở') },
    { label: 'Quyền riêng tư & Bảo mật', icon: 'shield-outline', action: () => pending('Quyền riêng tư & Bảo mật') },
    { label: 'Cài đặt giao diện & Hệ thống', icon: 'cog-outline', action: () => pending('Cài đặt giao diện & Hệ thống') },
  ];

  return <View style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Cá nhân</Text>
    </View>

    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
      <View style={styles.userCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <View style={styles.userDetails}>
          <Text style={styles.userName} numberOfLines={1}>{name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          <View style={styles.memberBadge}>
            <MaterialCommunityIcons name="medal-outline" size={13} color={colors.blue} />
            <Text style={styles.memberText}>Thành viên TripMate</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Chuyến đi', value: '—' },
          { label: 'Tỉnh thành', value: '—' },
          { label: 'Km đường bộ', value: '—' },
        ].map((item) => <View key={item.label} style={styles.statCard}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>)}
      </View>

      <View style={styles.menuCard}>
        {menuItems.map((item, index) => <Pressable
          key={item.label}
          accessibilityRole="button"
          onPress={item.action}
          style={({ pressed }) => [styles.menuRow, index < menuItems.length - 1 && styles.menuDivider, pressed && styles.pressed]}
        >
          <View style={styles.menuIcon}><MaterialCommunityIcons name={item.icon} size={17} color={colors.blue} /></View>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
        </Pressable>)}
      </View>

      <Pressable accessibilityRole="button" onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="logout" size={18} color={colors.red} />
        <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
      </Pressable>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { height: 53, paddingHorizontal: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 16, paddingBottom: 24 },
  userCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  userDetails: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  userName: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  userEmail: { color: colors.muted, fontSize: 11, marginTop: 2 },
  memberBadge: { backgroundColor: '#e8f2fc', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  memberText: { color: colors.blue, fontSize: 10, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: colors.blue, fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 10, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  menuCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
  menuRow: { minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '500' },
  pressed: { backgroundColor: colors.canvas },
  logoutButton: { height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  logoutText: { color: colors.red, fontSize: 13, fontWeight: '600' },
});
