const profileKey = 'tripmate_profile';
const settingsKey = 'tripmate_profile_settings';
const defaultProfile = { name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', avatar: '' };

export function getProfile() {
  try { return { ...defaultProfile, ...JSON.parse(localStorage.getItem(profileKey) || '{}') }; }
  catch { return { ...defaultProfile }; }
}
export const saveProfile = profile => localStorage.setItem(profileKey, JSON.stringify(profile));
export function getProfileSettings() {
  const defaults = { tripReminders: true, chatNotifications: true };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(settingsKey) || '{}') }; }
  catch { return defaults; }
}
export const saveProfileSettings = settings => localStorage.setItem(settingsKey, JSON.stringify(settings));
