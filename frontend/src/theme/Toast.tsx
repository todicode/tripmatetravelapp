import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

const Context = createContext<(title: string, message?: string) => void>(() => {});
export const useToast = () => useContext(Context);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<{ title: string; message?: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const show = useCallback((title: string, message?: string) => {
    if (timer.current) clearTimeout(timer.current);
    setInfo({ title, message });
    timer.current = setTimeout(() => setInfo(null), 2400);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { const animation = Animated.timing(progress, { toValue: info ? 1 : 0, duration: reducedMotion ? 0 : 300, useNativeDriver: true }); animation.start(); return () => animation.stop(); }, [info, reducedMotion, progress]);
  return <Context.Provider value={show}><View style={{ flex: 1 }}>{children}{info && <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', top: 48, left: 16, right: 16, alignItems: 'center', zIndex: 100, opacity: progress }}><View style={{ width: '100%', maxWidth: 360, backgroundColor: '#1d1d1f', borderWidth: 1, borderColor: '#333333', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>{info.title}</Text>{!!info.message && <Text numberOfLines={1} style={{ fontSize: 11, color: '#e0e0e0' }}>{info.message}</Text>}</View><Text style={{ color: '#2997ff', fontSize: 11, fontWeight: '500' }}>Xong</Text></View></Animated.View>}</View></Context.Provider>;
}
