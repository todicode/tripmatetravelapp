import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export function useSettingsViewModel({ onBack, notify }: { onBack: () => void; notify: typeof Alert.alert }) {
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState({ tripReminders: false, chatNotifications: false });
  useEffect(() => { let active = true; void SecureStore.getItemAsync('tripmate_notification_preferences').then(value => { if (value && active) { const parsed = JSON.parse(value); setPrefs({ tripReminders: parsed.tripReminders === true, chatNotifications: parsed.chatNotifications === true }); } }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; }); return () => sub.remove(); }, [onBack]);
  const toggle = async (key: keyof typeof prefs) => { if (busy) return; setBusy(true); try { const next = { ...prefs, [key]: !prefs[key] }; await SecureStore.setItemAsync('tripmate_notification_preferences', JSON.stringify(next)); setPrefs(next); } catch { notify('Chưa lưu được', 'Vui lòng thử lại.'); } finally { setBusy(false); } };
  return { busy, setBusy, prefs, toggle };
}
