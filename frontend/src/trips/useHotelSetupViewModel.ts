import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { HotelStay, makeId, nextStayGap, Place, TripDestination, validStayRange } from './tripModel';
export function useHotelSetupViewModel({ destination, days, stays, onChange, onBack, onDone }: { destination: TripDestination; days: number; stays: HotelStay[]; onChange: (stays: HotelStay[]) => void; onBack: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<'summary' | 'search' | 'dates' | 'details'>(stays.length ? 'summary' : 'search');
  const [timesOpen, setTimesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [hotel, setHotel] = useState<Place | null>(null);
  const gap = nextStayGap(days, stays);
  const [start, setStart] = useState(gap?.startDay ?? 1);
  const [end, setEnd] = useState(gap?.endDay ?? days);
  const [checkIn, setCheckIn] = useState(''); const [checkOut, setCheckOut] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState('');
  const back = () => { if (phase === 'details') setPhase('dates'); else if (phase === 'dates') setPhase('search'); else if (phase === 'search' && stays.length) setPhase('summary'); else onBack(); };
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => sub.remove(); }, [phase, stays.length]);
  const save = () => { if (!hotel || !validStayRange(days, stays, start, end)) return setError('Ngày nhận/trả phòng không hợp lệ hoặc trùng đêm lưu trú.'); if ([checkIn, checkOut].some(value => value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) return setError('Giờ cần có dạng HH:mm, ví dụ 14:00.'); onChange([...stays, { id: makeId(), hotel, startDay: start, endDay: end, checkInTime: checkIn, checkOutTime: checkOut, notes: notes.trim() }]); setPhase('summary'); setHotel(null); };
  const choose = (place: Place) => { const next = nextStayGap(days, stays); if (!next) return; setHotel(place); setStart(next.startDay); setEnd(next.endDay); setCheckIn(''); setCheckOut(''); setNotes(''); setError(''); setTimesOpen(false); setNotesOpen(false); setPhase('dates'); };
  const valid = validStayRange(days, stays, start, end);
  return { phase, setPhase, hotel, setHotel, gap, start, setStart, end, setEnd, checkIn, setCheckIn, checkOut, setCheckOut, notes, setNotes, error, setError, timesOpen, setTimesOpen, notesOpen, setNotesOpen, valid, choose, back, save };
}
