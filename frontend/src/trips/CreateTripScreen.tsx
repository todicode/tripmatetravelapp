import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { destinations, popularNames, searchDestinations, searchPlaces } from './destinations';
import { addDays, addStop, buildDays, createTrip, dayCount, displayDate, durationLabel, Place, Trip, TripDay, TripDestination } from './tripModel';
import TripCalendar from './TripCalendar';
import TripMap from './TripMap';
import { Button, c, Header, Icon, s } from './tripUi';

type Props = { initialCityKey?: string; initialTitle?: string; onBack: () => void; onSave: (trip: Trip) => void };

export default function CreateTripScreen({ initialCityKey, initialTitle, onBack, onSave }: Props) {
  const [destination, setDestination] = useState<TripDestination | null>(() => destinations.find((item) => item.key === initialCityKey) ?? null);
  const [title, setTitle] = useState(() => initialTitle ?? (destination ? `Khám phá ${destination.name}` : ''));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TripDestination[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [days, setDays] = useState<TripDay[]>(() => destination ? buildDays(destination, 1) : []);
  const [activeDay, setActiveDay] = useState(0);
  const [editingDates, setEditingDates] = useState(false);
  const [customOn, setCustomOn] = useState(false);
  const [inviteOn, setInviteOn] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [preferences, setPreferences] = useState(['Nghỉ dưỡng thư giãn', 'Ẩm thực bản địa']);
  const [prompt, setPrompt] = useState('Thích khám phá danh lam thắng cảnh, quán cafe view đẹp, chi phí vừa phải, thưởng thức đặc sản.');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [error, setError] = useState('');
  const back = () => { if (destination) { setDestination(null); setError(''); } else onBack(); };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [destination, onBack]);

  useEffect(() => {
    setResults([]); setSearchError('');
    if (destination || query.trim().length < 2) { setSearching(false); return; }
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const found = await searchDestinations(query.trim(), controller.signal);
        if (!disposed) { setResults(found); if (!found.length) setSearchError('Không tìm thấy điểm đến. Hãy thử tên khác.'); }
      } catch { if (!disposed) setSearchError('Không tìm được điểm đến. Kiểm tra kết nối hoặc chọn gợi ý bên dưới.'); }
      finally { clearTimeout(timeout); if (!disposed) setSearching(false); }
    }, 450);
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [query, destination]);

  useEffect(() => {
    setPlaceResults([]); setPlaceError('');
    if (!destination || !customOn || placeQuery.trim().length < 2) { setPlaceSearching(false); return; }
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(async () => {
      setPlaceSearching(true);
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const found = await searchPlaces(placeQuery.trim(), destination, controller.signal);
        if (!disposed) { setPlaceResults(found); if (!found.length) setPlaceError('Không tìm thấy vị trí. Bạn có thể lưu tên địa điểm bên dưới.'); }
      } catch { if (!disposed) setPlaceError('Không tải được vị trí. Bạn có thể lưu tên địa điểm bên dưới.'); }
      finally { clearTimeout(timeout); if (!disposed) setPlaceSearching(false); }
    }, 450);
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [placeQuery, destination, customOn]);

  const selectDestination = (item: TripDestination) => {
    setDestination(item); setTitle(`Khám phá ${item.name}`); setDays(buildDays(item, start && end ? dayCount(start, end) : 1));
    setActiveDay(0); setPlaceQuery(''); setError('');
  };
  const changeDates = (from: string, to: string) => {
    setStart(from); setEnd(to); setError('');
    if (destination && from && to) {
      const count = dayCount(from, to);
      setDays(buildDays(destination, count, days)); setActiveDay(Math.min(activeDay, count - 1));
    }
  };
  const addDay = () => {
    if (!destination) return;
    setDays(buildDays(destination, days.length + 1, days)); setActiveDay(days.length);
    if (start) setEnd(addDays(start, days.length));
  };
  const removeDay = (index: number) => {
    const remaining = days.filter((_, dayIndex) => index !== dayIndex).map((day, dayIndex) => ({ ...day, dayNumber: dayIndex + 1 }));
    setDays(remaining); setActiveDay(Math.min(activeDay, remaining.length - 1));
    if (start) setEnd(addDays(start, remaining.length - 1));
  };
  const addPlace = (place: Place) => {
    try { setDays(addStop(days, activeDay, place)); setPlaceQuery(''); setPlaceError(''); }
    catch (failure) { Alert.alert('Không thể thêm', failure instanceof Error ? failure.message : 'Vui lòng thử lại.'); }
  };
  const save = () => {
    if (!destination) return;
    try {
      const trip = createTrip(destination, title, start, end, days);
      onSave({ ...trip, aiRequested: aiOn, aiPrompt: aiOn ? prompt : '', aiPreferences: aiOn ? [...preferences] : [] });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể lưu chuyến đi.'); if (!start || !end) setEditingDates(true); }
  };
  const activeStops = days[activeDay]?.stops ?? [];

  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Header title={destination ? 'Kế hoạch chuyến đi' : 'Chọn điểm đến'} onBack={back} />
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {!destination ? <>
        <View style={s.card}><Text style={s.title}>Bạn muốn đi đâu?</Text><View style={[s.row, s.input, { borderRadius: 25 }]}><Icon name="magnify" color={c.muted} /><TextInput accessibilityLabel="Tìm điểm đến" value={query} onChangeText={setQuery} placeholder="Nhập tên tỉnh thành, địa danh..." placeholderTextColor={c.muted} style={[s.grow, { fontSize: 13, color: c.ink, padding: 0 }]} /></View>
          {searching && <Text style={s.small}>Đang tìm điểm đến...</Text>}{searchError ? <Text style={s.error}>{searchError}</Text> : null}
          {results.map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => selectDestination(item)} style={[s.between, s.divider]}><View style={s.grow}><Text style={s.title}>{item.name}</Text><Text style={s.small}>{item.fullName}</Text></View><Icon name="chevron-right" color={c.muted} /></Pressable>)}
        </View>
        <Text style={s.label}>ĐIỂM ĐẾN PHỔ BIẾN</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{popularNames.map((name) => <Pressable key={name} onPress={() => { const item = destinations.find((candidate) => candidate.name === name); if (item) selectDestination(item); }} style={[s.card, s.between, { width: '48.7%', padding: 12 }]}><Text style={s.title}>{name}</Text><Icon name="chevron-right" size={15} color={c.muted} /></Pressable>)}</View>
        <View style={s.card}><TripCalendar start={start} end={end} onChange={changeDates} /></View>
      </> : <>
        <View style={s.card}><View style={s.between}><View style={s.grow}><Text style={[s.label, { color: c.blue }]}>ĐIỂM ĐẾN ĐÃ CHỌN</Text><Text style={[s.title, { fontSize: 15 }]}>{destination.fullName ?? destination.name}</Text></View><Pressable onPress={() => setDestination(null)}><Text style={s.link}>Đổi điểm đến</Text></Pressable></View><Text style={s.label}>TÊN CHUYẾN ĐI</Text><TextInput accessibilityLabel="Tên chuyến đi" style={s.input} value={title} onChangeText={setTitle} /><TripMap coords={destination.coords} stops={activeStops} height={256} /></View>
        <View style={s.card}><View style={s.between}><View style={s.grow}><Text style={[s.label, { color: c.blue }]}>THỜI GIAN CHUYẾN ĐI • {start && end ? durationLabel(dayCount(start, end)) : 'Chưa chọn ngày'}</Text><Text style={s.text}>{start ? `${displayDate(start)} — ${displayDate(end)}` : 'Chưa chọn ngày'}</Text></View><Pressable onPress={() => setEditingDates(!editingDates)} style={s.chip}><Text style={s.link}>{editingDates ? 'Đóng lịch' : 'Chỉnh sửa lịch'}</Text></Pressable></View>{editingDates && <TripCalendar start={start} end={end} onChange={changeDates} />}</View>
        <View style={s.card}><View style={s.between}><View><Text style={s.title}>Gợi ý chuyến đi</Text><Text style={s.small}>Lịch trình chi tiết theo từng ngày</Text></View><Text style={s.badge}>{days.length} ngày</Text></View>
          {days.map((day, index) => <Pressable key={index} onPress={() => setActiveDay(index)} style={[s.card, { padding: 12, borderRadius: 12 }, index === activeDay && s.selected]}><View style={s.between}><View style={s.grow}><Text style={s.link}>Ngày {index + 1} • 1 ngày</Text><Text style={s.title} numberOfLines={1}>{day.dayTitle}</Text><Text style={s.small} numberOfLines={1}>{day.highlight}</Text></View><Text style={s.badge}>{index === activeDay ? 'Đang chọn' : 'Xem'}</Text>{days.length > 1 && <Pressable accessibilityLabel={`Xóa ngày ${index + 1}`} hitSlop={8} onPress={() => removeDay(index)}><Icon name="trash-can-outline" size={16} color={c.muted} /></Pressable>}</View><View style={[s.between, s.divider]}><Text style={[s.small, s.grow]} numberOfLines={1}>{day.stops.map((stop, stopIndex) => `${stopIndex + 1}. ${stop.name}`).slice(0, 3).join(' • ') || 'Chưa có điểm dừng'}</Text><Text style={s.link}>{day.stops.length} điểm</Text></View></Pressable>)}
          <Pressable onPress={addDay} style={[s.button, s.outline, { borderStyle: 'dashed', borderRadius: 12 }]}><Text style={s.link}>+ Thêm ngày</Text></Pressable>
        </View>
        <View style={s.card}><View style={s.between}><View style={s.grow}><Text style={s.title}>Địa điểm chuyến đi</Text><Text style={s.small}>Tùy chỉnh điểm dừng trong hành trình</Text></View><Switch accessibilityLabel="Tùy chỉnh điểm dừng" value={customOn} onValueChange={setCustomOn} trackColor={{ false: c.border, true: c.blue }} /></View>
          {!customOn ? <Text style={s.small}>Bật để tùy chỉnh thêm, bớt hoặc tự nhập các địa điểm theo ý thích.</Text> : <>
            <TextInput accessibilityLabel="Tìm điểm dừng" style={s.input} value={placeQuery} onChangeText={setPlaceQuery} placeholder="Tự nhập điểm đến (quán cafe, thắng cảnh...)" placeholderTextColor={c.muted} />
            {placeSearching && <Text style={s.small}>Đang tìm vị trí...</Text>}{placeError ? <Text style={s.small}>{placeError}</Text> : null}
            {placeResults.map((place, index) => <Pressable key={`${place.name}-${index}`} style={[s.between, s.divider]} onPress={() => addPlace(place)}><View style={s.grow}><Text style={s.text}>{place.name}</Text><Text style={s.small}>{place.note}</Text></View><Icon name="plus" /></Pressable>)}
            {placeQuery.trim() && !placeSearching && !placeResults.length ? <Button outline label="+ Lưu tên địa điểm (chưa có vị trí bản đồ)" onPress={() => addPlace({ name: placeQuery, note: 'Chưa có tọa độ bản đồ' })} /> : null}
            {!placeQuery && destination.hotSpots.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{destination.hotSpots.map((place) => <Pressable key={place.name} style={s.chip} onPress={() => addPlace(place)}><Text style={s.link}>+ {place.name}</Text></Pressable>)}</ScrollView>}
            <Text style={s.label}>ĐIỂM DỪNG NGÀY {activeDay + 1}</Text>{activeStops.map((stop, index) => <View key={stop.id} style={[s.between, s.input]}><Text style={[s.text, s.grow]}>{index + 1}. {stop.name}</Text><Pressable accessibilityLabel={`Gỡ ${stop.name}`} onPress={() => setDays(days.map((day, dayIndex) => dayIndex !== activeDay ? day : { ...day, stops: day.stops.filter((item) => item.id !== stop.id) }))}><Text style={s.small}>Gỡ</Text></Pressable></View>)}
          </>}
        </View>
        <View style={s.card}><View style={s.between}><View style={s.grow}><Text style={s.title}>Thành viên tham gia</Text><Text style={s.small}>Mời bạn bè cùng tham gia chuyến đi</Text></View><Switch accessibilityLabel="Mời bạn bè" value={inviteOn} onValueChange={setInviteOn} trackColor={{ false: c.border, true: c.blue }} /></View><Text style={s.small}>{inviteOn ? 'Chưa có danh sách bạn bè. Tính năng gửi lời mời sẽ được nối khi có API bạn bè.' : 'Bật để mời bạn bè cùng tham gia và chia sẻ lịch trình.'}</Text></View>
        <View style={s.card}><View style={s.between}><View style={s.grow}><Text style={s.title}>Nhờ AI tối ưu lịch trình</Text><Text style={s.small}>Sắp xếp thứ tự các điểm dừng hợp lý</Text></View><Switch accessibilityLabel="Yêu cầu AI tối ưu" value={aiOn} onValueChange={setAiOn} trackColor={{ false: c.border, true: c.blue }} /></View>
          {aiOn ? <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{['Nghỉ dưỡng thư giãn', 'Khám phá & check-in', 'Ẩm thực bản địa', 'Gần gũi thiên nhiên'].map((item) => <Pressable key={item} style={[s.chip, preferences.includes(item) && { backgroundColor: c.blue }]} onPress={() => setPreferences(preferences.includes(item) ? preferences.filter((preference) => preference !== item) : [...preferences, item])}><Text style={[s.small, { color: preferences.includes(item) ? c.white : c.ink }]}>{item}</Text></Pressable>)}</View><TextInput accessibilityLabel="Mong muốn cho lịch trình" multiline style={[s.input, { minHeight: 65, textAlignVertical: 'top' }]} value={prompt} onChangeText={setPrompt} /><Text style={s.small}>Hiện chỉ lưu mong muốn của bạn; dịch vụ AI chưa được kết nối.</Text></> : <Text style={s.small}>Bật để ghi lại mong muốn tối ưu lịch trình.</Text>}
        </View>
      </>}
    </ScrollView>
    {destination && <View style={s.footer}>{error ? <Text style={[s.error, { marginBottom: 8 }]}>{error}</Text> : null}<Button label="Lưu chuyến đi & Theo dõi hành trình" onPress={save} /></View>}
  </KeyboardAvoidingView>;
}
