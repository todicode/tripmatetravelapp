import test from 'node:test';
import assert from 'node:assert/strict';
import { getTheme, saveTheme, applyTheme } from './theme.js';

test('theme persists, applies immediately and defaults safely', () => {
  const previousStorage = globalThis.localStorage;
  const previousDocument = globalThis.document;
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  globalThis.document = { documentElement: { dataset: {} } };
  try {
    assert.equal(getTheme(), 'light');
    saveTheme('dark');
    assert.equal(getTheme(), 'dark');
    assert.equal(document.documentElement.dataset.theme, 'dark');
    applyTheme(getTheme());
    saveTheme('light');
    assert.equal(getTheme(), 'light');
    assert.equal(document.documentElement.dataset.theme, 'light');
    data.set('tripmate_theme', 'invalid');
    assert.equal(getTheme(), 'light');
    localStorage.getItem = () => { throw new Error('unavailable'); };
    assert.equal(getTheme(), 'light');
  } finally {
    globalThis.localStorage = previousStorage;
    globalThis.document = previousDocument;
  }
});
