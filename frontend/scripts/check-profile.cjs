const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const cache = new Map();
function load(file) {
  const resolved = path.resolve(__dirname, '../src', file);
  if (cache.has(resolved)) return cache.get(resolved);
  const compiled = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, require: name => load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(resolved), name + '.ts'))) };
  vm.runInNewContext(compiled.outputText, context); cache.set(resolved, context.exports);
  return context.exports;
}
const { ProfileStore } = load('profile/profileStore.ts');
const { displayNameError } = load('profile/profileModel.ts');
const { createProfileApi } = load('profile/profileApi.ts');
const profile = (name = 'An', id = 'a') => ({ id, displayName: name, email: `${id}@example.test`,
  avatarMediaId: null, phone: null, interestCodes: [], createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test('name validation trims whitespace and counts code points', () => {
  assert.equal(displayNameError(' \u00a0'), 'Vui lòng nhập tên hiển thị.');
  assert.equal(displayNameError('😀'.repeat(100)), null);
  assert.ok(displayNameError('😀'.repeat(101)));
  assert.equal(displayNameError(' Nguyễn An '), null);
});
test('profile adapter uses PATCH and rejects responses for another account', async () => {
  const api = createProfileApi(async (path, body, method) => {
    assert.equal(path, '/users/me'); assert.equal(method, 'PATCH'); assert.equal(body.displayName, 'Bình'); return profile('Bình');
  }, 'a');
  assert.equal((await api.update('Bình')).displayName, 'Bình');
  await assert.rejects(createProfileApi(async () => profile('B', 'b'), 'a').get());
});
test('late GET cannot overwrite successful PATCH', async () => {
  const get = deferred();
  const store = new ProfileStore({ get: () => get.promise, update: async name => profile(name) }, profile());
  const loading = store.load(); await store.save(' Bình '); get.resolve(profile()); await loading;
  assert.equal(store.getSnapshot().user.displayName, 'Bình'); assert.equal(store.getSnapshot().isLoading, false);
});
test('latest load wins and account stores remain isolated', async () => {
  const old = deferred(); let calls = 0;
  const store = new ProfileStore({ get: () => ++calls === 1 ? old.promise : Promise.resolve(profile('New')), update: async () => profile() }, profile());
  const first = store.load(); await store.load(); old.resolve(profile('Old')); await first;
  const other = new ProfileStore({}, profile('B', 'b'));
  assert.equal(store.getSnapshot().user.displayName, 'New'); assert.equal(other.getSnapshot().user.id, 'b');
});
test('save blocks duplicates and load during write; failures preserve current profile', async () => {
  const pending = deferred(); let calls = 0;
  const store = new ProfileStore({ get: () => { throw Error('must not load during save'); }, update: () => { calls++; return pending.promise; } }, profile());
  const save = store.save('B'); assert.equal(await store.save('B'), false); await store.load();
  pending.reject(Error('Offline')); await assert.rejects(save);
  assert.equal(calls, 1); assert.equal(store.getSnapshot().user.displayName, 'An'); assert.equal(store.getSnapshot().isSaving, false);
});
