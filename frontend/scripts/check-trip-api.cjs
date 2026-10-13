const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const exports = {};
  const context = {
    exports,
    require: (name) =>
      load(path.resolve(path.dirname(file), name + (name.endsWith('.json') ? '' : '.ts'))),
    Error,
    Date,
    Set,
    Map,
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
  return exports;
}
const { fromServer, createTripInput, itineraryInput, tripApi } = load(
  path.resolve(__dirname, '../src/trips/tripApi.ts'),
);
const copy = (value) => JSON.parse(JSON.stringify(value));
const id = '00000000-0000-4000-8000-000000000031';
const dto = () => ({
  id: 'trip',
  ownerId: 'owner',
  title: 'Trip',
  city: { code: 'DALAT', name: 'Đà Lạt', frontendKey: 'dalat' },
  dateMode: 'FLEXIBLE',
  durationDays: 2,
  startDate: null,
  endDate: null,
  status: 'UPCOMING',
  version: '9007199254740993',
  itineraryVersion: '2',
  myRole: 'OWNER',
});
const schedule = () => ({
  version: '2',
  tripVersion: '9007199254740993',
  days: [
    {
      dayNumber: 1,
      transportMode: 'DRIVE',
      note: null,
      items: [
        {
          id,
          kind: 'PLACE',
          placeId: 'place',
          customTitle: 'Walk',
          startTime: null,
          endTime: null,
          note: 'Bring water',
          estimatedCostVnd: null,
          status: 'ACTIVE',
          placeSnapshot: {
            name: 'Walk',
            provider: 'OSM',
            providerPlaceId: 'N:123',
            lat: 11.9,
            lng: 108.4,
          },
        },
      ],
    },
    { dayNumber: 2, transportMode: 'WALK', note: null, items: [] },
  ],
});
test('server roundtrip preserves flexible dates, UUID, progress, coordinates and bigint strings', () => {
  const trip = fromServer(dto(), schedule());
  assert.equal(trip.dateMode, 'flexible');
  assert.equal(trip.startDate, '');
  assert.equal(trip.version, '9007199254740993');
  assert.equal(trip.dayPlans[0].stops[0].status, 'active');
  assert.equal(trip.dayPlans[0].stops[0].lat, 11.9);
  const input = copy(itineraryInput(trip));
  assert.equal(input[0].items[0].id, id);
  assert.equal(input[0].items[0].startTime, null);
  assert.equal(input[1].items.length, 0);
  assert.equal(input[0].transportMode, 'DRIVE');
  assert.equal('status' in input[0].items[0], false);
});
test('creation removes draft IDs, uses null dates and keeps manual places without invented coordinates', () => {
  const trip = fromServer(dto(), schedule());
  trip.dayPlans[0].stops = [{ id: 'draft_1', name: 'Manual', time: '', status: 'pending' }];
  const input = copy(createTripInput(trip));
  const item = input.days[0].items[0];
  assert.equal(input.startDate, null);
  assert.equal(input.durationDays, 2);
  assert.equal('id' in item, false);
  assert.equal(item.placeSnapshot.provider, 'MANUAL');
  assert.equal(item.placeSnapshot.lat, null);
  assert.equal(item.placeSnapshot.lng, null);
});
test('API reconciles independently fetched versions instead of granting stale metadata a new version', async () => {
  let reads = 0;
  const api = tripApi(async (p) =>
    p.endsWith('/itinerary') ? schedule() : ++reads === 1 ? { ...dto(), version: '0' } : dto(),
  );
  const trip = await api.get('trip');
  assert.equal(reads, 2);
  assert.equal(trip.version, '9007199254740993');
});
test('API fails visibly if server keeps changing, and never writes during reconciliation', async () => {
  const calls = [];
  const api = tripApi(async (p, b, method) => {
    calls.push(method);
    return p.endsWith('/itinerary') ? schedule() : { ...dto(), version: '0' };
  });
  await assert.rejects(api.get('trip'), /tải lại/);
  assert.equal(calls.length, 6);
  assert.ok(calls.every((method) => method === undefined));
});
test('mutations carry expected versions; API errors reach the caller without blind retries', async () => {
  const calls = [];
  const failure = new Error('VERSION_CONFLICT');
  const api = tripApi(async (p, b, method) => {
    calls.push({ p, b, method });
    throw failure;
  });
  const trip = fromServer(dto(), schedule());
  await assert.rejects(api.progress(trip, id, 'completed'), /VERSION_CONFLICT/);
  assert.equal(calls.length, 1);
  assert.deepEqual(copy(calls[0].b), { expectedVersion: '2', status: 'COMPLETED' });
  await assert.rejects(api.remove(trip));
  assert.match(calls[1].p, /expectedTripVersion=9007199254740993/);
});
