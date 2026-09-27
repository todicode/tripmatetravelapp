import test from 'node:test';
import assert from 'node:assert/strict';
import { getProfile, saveProfile, getProfileSettings, saveProfileSettings } from './profile.js';

test('profile and notification settings persist independently', () => {
  const previous = globalThis.localStorage;
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  try {
    const profile = { name: 'Minh Anh', email: 'anh@example.com', avatar: 'data:image/png;base64,example' };
    saveProfile(profile);
    saveProfileSettings({ tripReminders: false, chatNotifications: true });
    assert.deepEqual(getProfile(), profile);
    assert.deepEqual(getProfileSettings(), { tripReminders: false, chatNotifications: true });
    data.set('tripmate_profile', 'invalid JSON');
    assert.equal(getProfile().name, 'Nguyễn Văn A');
    assert.equal(getProfileSettings().tripReminders, false);
  } finally { globalThis.localStorage = previous; }
});
