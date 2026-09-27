import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export const lightPalette = { blue: '#0066cc', ink: '#1d1d1f', muted: '#6e6e73', border: '#e0e0e0', pale: '#f5f5f7', white: '#ffffff', green: '#34c759', red: '#ff3b30', onBlue: '#ffffff', primaryLight: '#f0f6ff', hotel: '#8061c7', chrome: '#ffffff', avatar: '#1d1d1f', createButton: '#1d1d1f', subtle: '#a1a1a6' };
export type Palette = typeof lightPalette;
const darkPalette: Palette = { ...lightPalette, blue: '#2997ff', ink: '#eeeef2', muted: '#aeb2bd', border: '#343841', pale: '#191b20', white: '#24272e', red: '#ff6961', primaryLight: '#29394d', hotel: '#b29bea', chrome: '#191b20', avatar: '#344356', createButton: '#0066cc', subtle: '#8e94a1' };
type Mode = 'light' | 'dark';
type Theme = { mode: Mode; colors: Palette; setMode: (mode: Mode) => Promise<void> };
const Context = createContext<Theme>({ mode: 'light', colors: lightPalette, setMode: async () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('light');
  const changed = useRef(false);
  useEffect(() => { let active = true; void SecureStore.getItemAsync('tripmate_theme').then(value => { if (active && !changed.current) setModeState(value === 'dark' ? 'dark' : 'light'); }).catch(() => {}); return () => { active = false; }; }, []);
  const setMode = async (value: Mode) => { changed.current = true; await SecureStore.setItemAsync('tripmate_theme', value); setModeState(value); };
  const value = useMemo(() => ({ mode, colors: mode === 'dark' ? darkPalette : lightPalette, setMode }), [mode]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAppTheme = () => useContext(Context);
