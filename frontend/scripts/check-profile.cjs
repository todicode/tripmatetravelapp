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
  const context = { exports: {}, btoa, require: name => load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(resolved), name + '.ts'))) };
  vm.runInNewContext(compiled.outputText, context); cache.set(resolved, context.exports);
  return context.exports;
}
const { ProfileStore } = load('profile/profileStore.ts');
const { displayNameError } = load('profile/profileModel.ts');
const { createProfileApi } = load('profile/profileApi.ts');
const { EditProfileModel } = load('profile/editProfileModel.ts');
const { SessionManager, ApiRequestError } = load('auth/session.ts');
test('thumbnail bytes become a data URI without Blob or FileReader, including multiple chunks', async () => {
  const bytes = Uint8Array.from({ length: 20000 }, (_, index) => index % 256);
  const api = createProfileApi(async (path, body, method, options) => {
    assert.equal(path, '/media/avatar/thumbnail');
    assert.equal(method, 'GET'); assert.equal(options.responseType, 'arrayBuffer');
    return bytes.buffer;
  }, 'a');
  assert.equal(await api.image('avatar'), `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`);
});
const profile = (name = 'An', id = 'a') => ({ id, displayName: name, email: `${id}@example.test`,
  avatarMediaId: null, phone: null, interestCodes: [], createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test('form validates normalized changes and confirms unsaved navigation', () => {
  let backs = 0;
  const form = new EditProfileModel('An', async () => true, () => {}, () => backs++);
  assert.equal(form.canSave, false); form.setName(' An '); assert.equal(form.isDirty, false);
  assert.equal(form.requestBack(), 'leave'); assert.equal(backs, 1);
  form.setName('B'); assert.equal(form.requestBack(), 'confirm'); assert.equal(backs, 1);
  form.discard(); assert.equal(backs, 2);
  form.setName(' '); assert.equal(form.canSave, false);
  form.setName('a'.repeat(101)); assert.equal(form.canSave, false);
});

const avatarFile = { uri: 'file:///cache/avatar.jpg', name: 'avatar.jpg', type: 'image/jpeg' };
test('avatar draft uploads only on save and reuses READY ID when PATCH fails', async () => {
  let uploads = 0, patches = 0, saved = 0;
  const form = new EditProfileModel('An', async (name, id) => {
    patches++; assert.equal(id, 'media-id'); if (patches === 1) throw Error('Offline'); return true;
  }, () => saved++, () => {}, {
    pick: async () => avatarFile, upload: async () => { uploads++; return 'media-id'; }, release: async () => {}, hasAvatar: false,
  });
  await form.chooseAvatar(); assert.equal(uploads, 0); assert.equal(form.canSave, true);
  await form.save(); assert.equal(saved, 0); assert.equal(form.getSnapshot().draftAvatar, avatarFile);
  await form.save(); assert.equal(uploads, 1); assert.equal(patches, 2); assert.equal(saved, 1);
});
test('removing an existing avatar sends explicit null; cancel picker preserves draft', async () => {
  let chosen = avatarFile, sent = 'unset';
  const form = new EditProfileModel('An', async (name, id) => { sent = id; return true; }, () => {}, () => {}, {
    pick: async () => chosen, upload: async () => 'new', release: async () => {}, hasAvatar: true,
  });
  await form.chooseAvatar(); chosen = null; await form.chooseAvatar();
  assert.equal(form.getSnapshot().draftAvatar, avatarFile);
  await form.removeAvatar(); assert.equal(form.getSnapshot().removeAvatar, true);
  await form.save(); assert.equal(sent, null);
});
test('late picker and upload after unmount release draft and never PATCH', async () => {
  const pick = deferred(), upload = deferred(); let releases = 0, patches = 0;
  const dependencies = { pick: () => pick.promise, upload: () => upload.promise, release: async () => releases++, hasAvatar: false };
  const form = new EditProfileModel('An', async () => { patches++; return true; }, () => {}, () => {}, dependencies);
  const choosing = form.chooseAvatar(); assert.equal(form.requestBack(), 'blocked'); form.setActive(false);
  pick.resolve(avatarFile); await choosing; assert.ok(releases > 0); assert.equal(patches, 0);
  const second = new EditProfileModel('An', async () => { patches++; return true; }, () => {}, () => {}, { ...dependencies, pick: async () => avatarFile });
  await second.chooseAvatar(); const saving = second.save(); second.setActive(false); upload.resolve('id'); await saving;
  assert.equal(patches, 0);
});
test('stale avatar downloads cannot restore an image after removal', async () => {
  const image = deferred();
  const store = new ProfileStore({ get: async () => ({ ...profile(), avatarMediaId: 'old' }),
    image: () => image.promise, update: async () => profile() }, profile());
  await store.load(); await store.save('An', null); image.resolve('data:image/jpeg;base64,old');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(store.getSnapshot().avatarUri, null); assert.equal(store.getSnapshot().profile.avatarMediaId, null);
});
test('form blocks back and double submit until server confirms success', async () => {
  const pending = deferred(); let calls = 0; const events = [];
  const form = new EditProfileModel('An', () => { calls++; return pending.promise; }, () => events.push('saved'), () => events.push('back'));
  form.setName('B'); const saving = form.save(); await form.save();
  assert.equal(form.requestBack(), 'blocked'); form.discard(); form.setName('C');
  assert.equal(form.getSnapshot().name, 'B'); assert.equal(events.length, 0); assert.equal(calls, 1);
  pending.resolve(true); await saving; assert.deepEqual(events, ['saved', 'back']);
});
test('failed save preserves draft; unmount suppresses late navigation and toast', async () => {
  let events = 0;
  const failed = new EditProfileModel('An', async () => { throw Error('Offline'); }, () => events++, () => events++);
  failed.setName('B'); await failed.save();
  assert.equal(failed.getSnapshot().name, 'B'); assert.ok(failed.getSnapshot().errorMessage); assert.equal(events, 0);
  const pending = deferred();
  const old = new EditProfileModel('An', () => pending.promise, () => events++, () => events++);
  old.setName('C'); const save = old.save(); old.setActive(false); pending.resolve(true); await save;
  assert.equal(events, 0);
});

test('name validation trims whitespace and counts code points', () => {
  assert.equal(displayNameError(' \u00a0'), 'Vui lòng nhập tên hiển thị.');
  assert.equal(displayNameError('😀'.repeat(100)), null);
  assert.ok(displayNameError('😀'.repeat(101)));
  assert.equal(displayNameError(' Nguyễn An '), null);
});

test('PATCH refresh retry preserves method and remember preference', async () => {
  let writes = 0, patches = 0;
  const session = { accessToken: 'old', refreshToken: 'refresh', expiresIn: 900,
    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), user: profile() };
  const manager = new SessionManager(async (path, body, token, method) => {
    if (path === '/auth/refresh') return { ...session, accessToken: 'new' };
    assert.equal(method, 'PATCH'); patches++;
    if (token === 'old') throw new ApiRequestError('ACCESS_TOKEN_EXPIRED', 'Expired', 401);
    return profile(body.displayName);
  }, { read: async () => null, write: async () => writes++, remove: async () => {} }, () => {});
  await manager.accept(session, false);
  const store = new ProfileStore(createProfileApi(manager.request.bind(manager), 'a'), profile());
  await store.save('B'); assert.equal(patches, 2); assert.equal(writes, 0); assert.equal(store.getSnapshot().user.displayName, 'B');
});
test('late token refresh cannot overwrite saved profile', async () => {
  let now = Date.now(); const pending = deferred(); const started = deferred();
  const session = { accessToken: 'old', refreshToken: 'refresh', expiresIn: 900,
    refreshExpiresAt: new Date(now + 86400000).toISOString(), user: profile() };
  const manager = new SessionManager(async path => {
    if (path === '/auth/refresh') { started.resolve(); return pending.promise; }
    return profile('B');
  }, { read: async () => null, write: async () => {}, remove: async () => {} }, () => {}, () => now);
  await manager.accept(session);
  const store = new ProfileStore(createProfileApi(manager.request.bind(manager), 'a'), profile());
  await store.save('B'); now += 900000;
  const refresh = manager.ensureFresh(); await started.promise;
  pending.resolve({ ...session, accessToken: 'new', user: profile('Old') }); await refresh;
  assert.equal(store.getSnapshot().user.displayName, 'B');
});
test('account switch rejects a late PATCH without updating either account', async () => {
  const pending = deferred(), started = deferred();
  const session = { accessToken: 'old', refreshToken: 'refresh', expiresIn: 900,
    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), user: profile() };
  const manager = new SessionManager(async () => { started.resolve(); return pending.promise; },
    { read: async () => null, write: async () => {}, remove: async () => {} }, () => {});
  await manager.accept(session);
  const store = new ProfileStore(createProfileApi(manager.request.bind(manager), 'a'), profile());
  const saving = store.save('Changed'); await started.promise;
  await manager.clear(); await manager.accept({ ...session, user: profile('B', 'b') });
  const other = new ProfileStore(createProfileApi(manager.request.bind(manager), 'b'), profile('B', 'b'));
  pending.resolve(profile('Changed')); await assert.rejects(saving);
  assert.equal(store.getSnapshot().user.displayName, 'An'); assert.equal(other.getSnapshot().user.displayName, 'B');
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
