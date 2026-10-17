const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');

const base = process.env.TRIPMATE_TEST_BASE_URL;
const email = process.env.TRIPMATE_TEST_EMAIL;
const password = process.env.TRIPMATE_TEST_PASSWORD;
const otherEmail = process.env.TRIPMATE_TEST_OTHER_EMAIL;
const otherPassword = process.env.TRIPMATE_TEST_OTHER_PASSWORD;
if (![base, email, password, otherEmail, otherPassword].every(Boolean)) {
  throw new Error('Set TRIPMATE_TEST_BASE_URL and both synthetic account credentials first.');
}

const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const exports = {};
  cache.set(file, exports);
  const requireModule = (name) => {
    if (name === 'expo-file-system') return { File: class {} };
    if (!name.startsWith('.')) throw new Error(`Unexpected dependency: ${name}`);
    return load(path.resolve(path.dirname(file), name + (name.endsWith('.json') ? '' : '.ts')));
  };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: requireModule,
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    FormData,
    Error,
    Date,
    Set,
    Map,
    btoa,
    console,
  });
  return exports;
}
const { apiRequest } = load(path.resolve(__dirname, '../src/auth/api.ts'));
const { tripApi } = load(path.resolve(__dirname, '../src/trips/tripApi.ts'));
const { createProfileApi } = load(path.resolve(__dirname, '../src/profile/profileApi.ts'));
const call = (url, body, token, method) => apiRequest(base, 'QA backend', url, body, token, method);
const plain = (value) => JSON.parse(JSON.stringify(value));

test('frontend adapters against real Spring Boot and PostgreSQL', async (t) => {
  const login = (email, password) =>
    call('/auth/login', { email, password, installationId: randomUUID() });
  const first = await login(email, password);
  const second = await login(otherEmail, otherPassword);
  const request = (url, body, method, options) =>
    apiRequest(base, 'QA backend', url, body, first.accessToken, method, options);
  const outsider = (url, body, method) => call(url, body, second.accessToken, method);
  const api = tripApi(request);
  const profile = createProfileApi(request, first.user.id);
  const cleanup = new Set();
  t.after(async () => {
    for (const id of cleanup) {
      const current = await api.get(id);
      await api.remove(current);
    }
    await call('/auth/logout', {}, first.accessToken);
    await call('/auth/logout', {}, second.accessToken);
  });
  const cities = await api.cities();
  const city = cities.items.find((item) => item.code === 'DALAT') ?? cities.items[0];
  assert.ok(city);
  const input = (days, specific = false) => ({
    clientRequestId: randomUUID(),
    title: 'Adapter QA',
    cityCode: city.code,
    dateMode: specific ? 'SPECIFIC' : 'FLEXIBLE',
    durationDays: days,
    startDate: specific ? '2030-01-01' : null,
    endDate: specific ? `2030-01-${String(days).padStart(2, '0')}` : null,
    days: Array.from({ length: days }, (_, i) => ({
      dayNumber: i + 1,
      transportMode: 'WALK',
      items: [],
    })),
  });
  let created;
  await t.test('profile and interest adapters persist selections', async () => {
    const original = await profile.get();
    const interests = await profile.interests();
    assert.ok(interests.length);
    try {
      await profile.update('Adapter QA', undefined, [interests[0].code]);
      const saved = await profile.get();
      assert.equal(saved.displayName, 'Adapter QA');
      assert.deepEqual(plain(saved.interestCodes), [interests[0].code]);
    } finally {
      await profile.update(original.displayName, undefined, original.interestCodes);
    }
  });
  const body = input(1);
  await t.test('atomic flexible creation and version-consistent hydration', async () => {
    body.days[0].items = [
      {
        kind: 'PLACE',
        customTitle: 'Manual QA',
        startTime: null,
        endTime: null,
        placeSnapshot: { name: 'Manual QA', provider: 'MANUAL', lat: null, lng: null },
      },
    ];
    const dto = await api.create(body);
    cleanup.add(dto.id);
    created = await api.get(dto.id, dto);
    assert.equal(created.dateMode, 'flexible');
    assert.equal(created.dayPlans[0].stops[0].time, '');
    assert.equal(created.dayPlans[0].stops[0].lat, undefined);
  });
  await t.test('retrying the same creation key returns exactly the same trip', async () => {
    const replay = await api.create(body);
    assert.equal(replay.id, created.id);
    const page = await api.page();
    assert.equal(page.items.filter((item) => item.id === created.id).length, 1);
  });
  await t.test('the same creation key with changed content returns conflict', async () => {
    await assert.rejects(
      api.create({ ...body, title: 'Different content' }),
      (error) => error.status === 409,
    );
  });
  await t.test('specific 30-day creation survives a separate read', async () => {
    const longTrip = input(30, true);
    longTrip.days[0].items = [{ kind: 'NOTE', customTitle: 'Preparation QA' }];
    const dto = await api.create(longTrip);
    cleanup.add(dto.id);
    const saved = await api.get(dto.id);
    assert.equal(saved.dayPlans.length, 30);
    assert.equal(saved.startDate, '2030-01-01');
    assert.equal(saved.endDate, '2030-01-30');
  });
  await t.test('invalid duration and dates are rejected', async () => {
    for (const value of [0, 31])
      await assert.rejects(api.create(input(value)), (error) => error.status === 422);
    await assert.rejects(
      api.create({ ...input(1, true), endDate: '2029-12-31' }),
      (error) => error.status === 422,
    );
  });
  await t.test('another account cannot read or edit the trip', async () => {
    await assert.rejects(outsider(`/trips/${created.id}`), (error) =>
      [403, 404].includes(error.status),
    );
    await assert.rejects(
      outsider(
        `/trips/${created.id}`,
        { expectedTripVersion: created.version, title: 'Forbidden' },
        'PATCH',
      ),
      (error) => [403, 404].includes(error.status),
    );
  });
  await t.test('itinerary replacement retains UUID and nullable time fields', async () => {
    const stop = created.dayPlans[0].stops[0];
    stop.note = 'Updated through adapter';
    await api.replace(created);
    const saved = await api.get(created.id);
    assert.equal(saved.dayPlans[0].stops[0].id, stop.id);
    assert.equal(saved.dayPlans[0].stops[0].note, stop.note);
    assert.equal(saved.dayPlans[0].stops[0].time, '');
    created = saved;
  });
  await t.test('a stale itinerary version cannot overwrite the accepted write', async () => {
    const stale = { ...created };
    await api.replace(created);
    await assert.rejects(api.replace(stale), (error) => error.status === 409);
    created = await api.get(created.id);
  });
  await t.test('progress completes and reopens the trip after separate reads', async () => {
    const item = created.dayPlans[0].stops[0].id;
    await api.progress(created, item, 'completed');
    created = await api.get(created.id);
    assert.equal(created.status, 'completed');
    await api.progress(created, item, 'pending');
    created = await api.get(created.id);
    assert.equal(created.status, 'upcoming');
  });
  await t.test('cancelled trips reject edits until restored', async () => {
    await api.update(created.id, { expectedTripVersion: created.version, status: 'CANCELLED' });
    created = await api.get(created.id);
    assert.equal(created.status, 'cancelled');
    await assert.rejects(api.replace(created), (error) => [409, 422].includes(error.status));
    await api.update(created.id, { expectedTripVersion: created.version, status: 'UPCOMING' });
    created = await api.get(created.id);
    assert.equal(created.status, 'upcoming');
  });
  await t.test('soft deletion removes detail and itinerary access', async () => {
    await api.remove(created);
    cleanup.delete(created.id);
    await assert.rejects(api.get(created.id), (error) => error.status === 404);
    await assert.rejects(
      request(`/trips/${created.id}/itinerary`),
      (error) => error.status === 404,
    );
  });
});
