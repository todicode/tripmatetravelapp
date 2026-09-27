import React, { useEffect, useRef } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { destinations } from './destinations';
import { displayDate, SavedPlaceList, Trip } from './tripModel';
import { Icon, useTripUi } from './tripUi';
import { useTripSetupViewModel } from './useTripSetupViewModel';
import TripCalendar from './TripCalendar';
import TripDurationWheel from './TripDurationWheel';
import HotelSetupScreen from './HotelSetupScreen';
import SamplePlanScreen from './SamplePlanScreen';
import ManualPlannerScreen from './ManualPlannerScreen';
import RoutePreview from './RoutePreview';
import { Sheet } from '../chat/chatUi';
import { useReducedMotion } from '../theme/useReducedMotion';

export type { SavedPlaceList } from './tripModel';
const interests = [
  { label: 'Nổi bật', icon: 'map-marker-outline' }, { label: 'Bảo tàng', icon: 'bank-outline' },
  { label: 'Thiên nhiên', icon: 'pine-tree' }, { label: 'Ẩm thực', icon: 'silverware-fork-knife' },
  { label: 'Lịch sử', icon: 'camera-outline' }, { label: 'Mua sắm', icon: 'shopping-outline' },
] as const;
const trending = ['Đà Lạt', 'Đà Nẵng', 'Hà Nội', 'Hội An', 'TP. Hồ Chí Minh'];

function SetupAction({ label, onPress, disabled = false, secondary = false, icon }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: React.ComponentProps<typeof Icon>['name'] }) {
  const { c } = useTripUi();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: secondary ? c.pale : c.blue, opacity: disabled ? 0.4 : pressed ? 0.65 : 1 }]}>
    {icon && <Icon name={icon} size={16} color={secondary ? c.blue : c.onBlue} />}
    <Text style={{ color: secondary ? c.blue : c.onBlue, fontSize: 14, fontWeight: secondary ? '400' : '600' }}>{label}</Text>
  </Pressable>;
}

function SetupSection({ title, summary, expanded, disabled, onOpen, children }: { title: string; summary: string; expanded: boolean; disabled?: boolean; onOpen: () => void; children: React.ReactNode }) {
  const { c } = useTripUi();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (!expanded) return; progress.setValue(reducedMotion ? 1 : 0); const animation = Animated.timing(progress, { toValue: 1, duration: reducedMotion ? 0 : 300, useNativeDriver: true }); animation.start(); return () => animation.stop(); }, [expanded, reducedMotion, progress]);
  return <View style={[styles.section, { backgroundColor: c.white }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded, disabled: !!disabled }} disabled={disabled} onPress={onOpen} style={styles.sectionHeader}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: disabled ? c.muted : c.ink }}>{title}</Text>
      {!expanded && <Text numberOfLines={2} style={{ marginLeft: 'auto', maxWidth: '65%', textAlign: 'right', color: c.blue, fontSize: 14, lineHeight: 20 }}>{summary}</Text>}
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} color={c.muted} size={16} />
    </Pressable>
    {expanded && <Animated.View style={[styles.sectionBody, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>{children}</Animated.View>}
  </View>;
}

export default function TripSetupScreen({ initialCityKey, initialTitle, lists, onBack, onSave }: { initialCityKey?: string; initialTitle?: string; lists: SavedPlaceList[]; onBack: () => void; onSave: (trip: Trip) => void }) {
  const { c } = useTripUi();
  const vm = useTripSetupViewModel({ initialCityKey, initialTitle, lists, onBack, onSave });
  const content = useRef<ScrollView>(null);
  useEffect(() => { content.current?.scrollTo({ y: 0, animated: false }); }, [vm.step, vm.searchOpen, vm.importing]);
  const small = { color: c.muted, fontSize: 14, lineHeight: 20 };
  const dateSummary = vm.dateMode === 'flexible' ? `${vm.count} ngày · Chưa chốt ngày đi` : vm.days ? `${displayDate(vm.start)} — ${displayDate(vm.end)}` : 'Chọn ngày đi và ngày về';
  const lodgingSummary = vm.lodging === 'hotel' ? vm.stays.length ? `${vm.stays.length} khách sạn` : 'Khách sạn' : vm.lodging === 'friends' ? 'Ở cùng bạn bè' : 'Quyết định sau';
  const aiUnavailable = () => Alert.alert('AI chưa khả dụng', 'Dịch vụ tạo lịch trình bằng AI chưa được kết nối. Bạn có thể đóng lời nhắn và chọn “Không, tôi sẽ tự lên lịch”.');
  if (vm.hotels && vm.destination) return <HotelSetupScreen destination={vm.destination} days={vm.days} stays={vm.stays} onChange={vm.setStays} onBack={() => vm.setHotels(false)} onDone={() => { vm.setHotels(false); vm.setStep(4); }} />;
  if (vm.planning && vm.draft && vm.destination) return <ManualPlannerScreen trip={vm.draft} destination={vm.destination} onBack={() => vm.setPlanning(false)} onClose={onBack} onUpdate={vm.setDraft} onSave={vm.save} error={vm.error} />;

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.pale }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[styles.header, { backgroundColor: c.white, borderColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={vm.back} style={styles.headerButton}><Icon name="arrow-left" size={20} color={c.ink} /></Pressable>
      <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600' }}>Tạo chuyến đi</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng tạo chuyến đi" onPress={onBack} style={styles.headerButton}><Icon name="close" size={20} color={c.ink} /></Pressable>
    </View>
    <ScrollView ref={content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {vm.searchOpen || vm.importing ? <View style={[styles.searchSection, { backgroundColor: c.white }]}>
        <Text style={[styles.heading, { color: c.ink }]}>{vm.importing ? 'Nhập từ danh sách' : 'Bạn muốn đi đâu?'}</Text>
        {vm.searchOpen ? <>
          <View style={[styles.searchInput, { backgroundColor: c.pale }]}>
            <Icon name="magnify" size={16} color={c.muted} />
            <TextInput autoFocus accessibilityLabel="Tìm điểm đến" value={vm.query} onChangeText={vm.setQuery} placeholder="Tìm thành phố hoặc địa điểm" placeholderTextColor={c.muted} style={{ flex: 1, color: c.ink, fontSize: 14, minHeight: 44 }} />
            {!!vm.query && <Pressable accessibilityLabel="Xóa tìm kiếm" onPress={() => vm.setQuery('')} style={styles.headerButton}><Icon name="close" size={16} color={c.ink} /></Pressable>}
          </View>
          <Text accessibilityLiveRegion="polite" style={small}>{vm.query.trim().length < 2 ? 'Nhập ít nhất 2 ký tự để tìm kiếm.' : vm.searching ? 'Đang tìm điểm đến…' : vm.searchError || (!vm.results.length ? 'Không tìm thấy điểm đến. Thử tên khác.' : '')}</Text>
          {vm.results.map(item => <Pressable key={item.key} onPress={() => vm.choose(item)} style={[styles.resultRow, { borderColor: c.border }]}><Icon name="map-marker-outline" size={20} /><View style={{ flex: 1 }}><Text style={{ color: c.ink, fontSize: 17 }}>{item.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{item.fullName}</Text></View></Pressable>)}
        </> : <>
          {!lists.length && <Text style={small}>Chưa có danh sách địa điểm. Bạn có thể tìm điểm đến trước.</Text>}
          {lists.map(list => <Pressable key={list.id} disabled={!list.places.length} onPress={() => vm.choose(list.destination, list.places)} style={[styles.resultRow, { borderColor: c.border, opacity: list.places.length ? 1 : 0.4 }]}><Icon name="format-list-bulleted" size={20} /><View style={{ flex: 1 }}><Text style={{ color: c.ink, fontSize: 17 }}>{list.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{list.places.length} địa điểm đã lưu</Text></View><Icon name="chevron-right" size={16} color={c.ink} /></Pressable>)}
        </>}
      </View> : vm.step < 4 ? <>
        <SetupSection title="Điểm đến" summary={vm.destination?.name ?? 'Chọn điểm đến'} expanded={vm.step === 0} onOpen={() => vm.setStep(0)}>
          <Pressable onPress={() => vm.setSearchOpen(true)} style={[styles.searchInput, { backgroundColor: c.pale }]}><Icon name="magnify" color={c.muted} size={16} /><Text style={small}>Tìm điểm đến</Text></Pressable>
          {vm.destination && <Pressable onPress={() => vm.setStep(1)} style={styles.row}><Icon name="map-marker-outline" size={20} /><Text style={{ color: c.blue, fontSize: 14, flex: 1 }}>{vm.destination.name}</Text><Icon name="chevron-right" size={16} /></Pressable>}
          <Pressable onPress={() => vm.setImporting(true)} style={[styles.importRow, { borderColor: c.border }]}><Icon name="format-list-bulleted" size={20} /><View style={{ flex: 1 }}><Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>Nhập từ danh sách của tôi</Text><Text style={{ color: c.muted, fontSize: 12 }}>Dùng những địa điểm bạn đã lưu</Text></View><Icon name="chevron-right" size={16} color={c.ink} /></Pressable>
          <Text style={{ color: c.muted, fontSize: 12, marginTop: 8 }}>Điểm đến nổi bật</Text>
          {trending.map(name => destinations.find(item => item.name === name)).filter(item => !!item).map(item => <Pressable key={item.key} onPress={() => vm.choose(item)} style={styles.destinationRow}><Icon name="map-marker-outline" size={20} /><View><Text style={{ color: c.ink, fontSize: 17 }}>{item.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>Việt Nam</Text></View></Pressable>)}
        </SetupSection>
        <SetupSection title="Ngày đi" summary={vm.destination ? dateSummary : 'Chọn ngày đi'} expanded={vm.step === 1} disabled={!vm.destination} onOpen={() => vm.setStep(1)}>
          <View style={[styles.dateModes, { backgroundColor: c.pale }]}>{(['flexible', 'specific'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: vm.dateMode === mode }} onPress={() => vm.setDateMode(mode)} style={[styles.dateMode, { backgroundColor: vm.dateMode === mode ? c.white : 'transparent' }]}><Text style={{ color: vm.dateMode === mode ? c.blue : c.muted, fontSize: 14, fontWeight: vm.dateMode === mode ? '600' : '400' }}>{mode === 'flexible' ? 'Linh hoạt' : 'Ngày cụ thể'}</Text></Pressable>)}</View>
          {vm.dateMode === 'flexible' ? <><View style={[styles.row, { justifyContent: 'center' }]}><Icon name="calendar-month-outline" size={16} color={c.muted} /><Text style={small}>Số ngày của chuyến đi</Text></View><TripDurationWheel value={vm.count} onChange={vm.setCount} /><Text style={[small, { textAlign: 'center' }]}>{vm.count} ngày · Chốt ngày khởi hành sau</Text></> : <TripCalendar start={vm.start} end={vm.end} onChange={(start, end) => { vm.setStart(start); vm.setEnd(end); }} />}
          <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8 }]}><Pressable onPress={vm.resetDates} style={{ padding: 8 }}><Text style={{ color: c.blue, fontSize: 14 }}>Đặt lại</Text></Pressable><SetupAction label="Tiếp tục" disabled={!vm.days} onPress={() => vm.setStep(2)} /></View>
        </SetupSection>
        <SetupSection title="Sở thích" summary={vm.preferences.length ? vm.preferences.join(', ') : 'Thêm sở thích'} expanded={vm.step === 2} disabled={!vm.destination || !vm.days} onOpen={() => vm.setStep(2)}>
          <Text style={[small, { marginTop: 8, marginBottom: 8 }]}>Chọn một hoặc nhiều sở thích cho chuyến đi.</Text>
          <View style={styles.interests}>{interests.map(item => { const selected = vm.preferences.includes(item.label); return <Pressable key={item.label} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => vm.setPreferences(current => selected ? current.filter(value => value !== item.label) : [...current, item.label])} style={[styles.interest, { borderColor: selected ? c.blue : c.border, backgroundColor: selected ? c.primaryLight : c.white }]}><Icon name={item.icon} color={selected ? c.blue : c.ink} size={20} /><Text style={{ color: selected ? c.blue : c.ink, fontSize: 14, flex: 1 }}>{item.label}</Text>{selected && <Icon name="check" size={16} />}</Pressable>; })}</View>
          <Pressable onPress={() => { vm.setPreferences([]); vm.setStep(3); }} style={[styles.row, { justifyContent: 'center', marginTop: 8 }]}><Icon name="creation" size={16} /><Text style={{ color: c.blue, fontSize: 14 }}>Bỏ qua, làm tôi bất ngờ nhé!</Text></Pressable>
          <SetupAction label="Tiếp tục" onPress={() => vm.setStep(3)} />
        </SetupSection>
        <SetupSection title="Bạn sẽ nghỉ ở đâu?" summary={lodgingSummary} expanded={vm.step === 3} disabled={!vm.destination || !vm.days} onOpen={() => vm.setStep(3)}>
          <Text style={small}>Bỏ qua nếu bạn chưa quyết định.</Text>
          {([{ value: 'hotel', label: 'Khách sạn', icon: 'bed-outline', color: c.blue }, { value: 'friends', label: 'Ở cùng bạn bè', icon: 'account-group-outline', color: c.green }, { value: 'undecided', label: 'Quyết định sau', icon: 'arrow-right', color: c.muted }] as const).map(item => { const selected = vm.lodging === item.value && item.value !== 'undecided'; return <Pressable key={item.value} onPress={() => vm.chooseLodging(item.value)} style={[styles.lodging, { borderColor: selected ? c.blue : 'transparent', backgroundColor: selected ? c.primaryLight : c.pale }]}><Icon name={item.icon} size={24} color={item.color} /><Text style={{ color: c.ink, fontSize: 14, fontWeight: '600', flex: 1 }}>{item.label}</Text>{selected && <Icon name="check" size={18} />}</Pressable>; })}
        </SetupSection>
      </> : <View style={[styles.planSection, { backgroundColor: c.white }]}>
        <Text style={[styles.heading, { color: c.ink, textAlign: 'center' }]}>Cùng lên kế hoạch chuyến đi</Text>
        <Text style={[small, { textAlign: 'center' }]}>Chúng tôi sẽ gợi ý những địa điểm bạn sẽ yêu thích.</Text>
        <RoutePreview />
        <SetupAction label="Có, lên lịch giúp tôi!" icon="creation" onPress={() => vm.setAiOpen(true)} />
        <SetupAction label="Không, tôi sẽ tự lên lịch" secondary onPress={() => vm.openPlanner(false)} />
      </View>}
    </ScrollView>
    <Sheet visible={vm.aiOpen} title="Bạn muốn nhắn gì với AI?" onClose={() => vm.setAiOpen(false)}>
      <Text style={small}>Có điều gì bạn muốn ưu tiên hoặc tránh trong chuyến đi? Thêm một lời nhắn để hành trình hợp ý bạn hơn.</Text>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>Lời nhắn của bạn <Text style={{ color: c.muted, fontWeight: '400' }}>(không bắt buộc)</Text></Text>
      <TextInput accessibilityLabel="Lời nhắn của bạn" value={vm.notes} onChangeText={vm.setNotes} multiline maxLength={1000} textAlignVertical="top" style={{ minHeight: 140, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 11, backgroundColor: c.pale, color: c.ink, fontSize: 16 }} />
      <Text style={{ color: c.muted, fontSize: 12, textAlign: 'right' }}>{vm.notes.length}/1.000 ký tự</Text>
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>Dịch vụ tạo lịch trình bằng AI hiện chưa được kết nối.</Text>
      <SetupAction label="Tiếp tục với lời nhắn" disabled={!vm.notes.trim()} onPress={aiUnavailable} />
      <Pressable onPress={aiUnavailable} style={[styles.row, { justifyContent: 'center' }]}><Text style={{ color: c.blue, fontSize: 14 }}>Bỏ qua, tạo lịch trình</Text></Pressable>
    </Sheet>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  header: { height: 56, paddingHorizontal: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, flexGrow: 1 },
  section: { borderRadius: 18, overflow: 'hidden' },
  sectionHeader: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  heading: { fontSize: 21, fontWeight: '600' },
  action: { minHeight: 44, paddingHorizontal: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  planSection: { borderRadius: 18, padding: 16, gap: 16 },
  searchSection: { borderRadius: 18, padding: 16, gap: 16, marginTop: 12, flexGrow: 1 },
  searchInput: { minHeight: 44, borderRadius: 24, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultRow: { minHeight: 64, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  importRow: { minHeight: 64, borderRadius: 11, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  destinationRow: { minHeight: 48, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateModes: { padding: 4, borderRadius: 28, flexDirection: 'row', marginBottom: 8 },
  dateMode: { flex: 1, minHeight: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  interest: { width: '48%', flexGrow: 1, minHeight: 80, paddingHorizontal: 12, paddingVertical: 16, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lodging: { minHeight: 64, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
