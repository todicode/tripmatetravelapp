const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const { hookHarness } = require('./test-helpers/hook-harness.cjs');
const harness = (name, deps) => hookHarness(path.resolve(__dirname, '../src/trips', name), deps);

const copy = (value) => JSON.parse(JSON.stringify(value));
const trip = () => ({
  id: 't',
  title: 'Trip',
  version: '0',
  itineraryVersion: '0',
  dayPlans: [
    {
      dayNumber: 1,
      stops: [
        { id: 'a', status: 'active' },
        { id: 'b', status: 'pending' },
      ],
    },
  ],
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
function detail(session) {
  const h = harness('useTripDetailsViewModel.ts', {
    './TripProvider': { useTrips: () => session, message: (e) => e.message },
    './tripApi': {
      itineraryInput: (t) => t.dayPlans,
      applyMetadata: (t, dto) => ({ ...t, ...dto }),
      applyItinerary: (t, dto) =>
        dto
          ? {
              ...t,
              version: dto.tripVersion,
              itineraryVersion: dto.version,
              dayPlans: dto.dayPlans ?? t.dayPlans,
            }
          : t,
    },
  });
  const original = trip();
  return {
    h,
    original,
    render: () =>
      h.render((e) =>
        e.useTripDetailsViewModel(
          original,
          () => {},
          () => {},
        ),
      ),
  };
}
test('starting a new stop sends its ID, not the previous active stop that became completed', async () => {
  const calls = [];
  const session = {
    api: { progress: async (_, id, status) => calls.push({ id, status }) },
    load: async () => trip(),
  };
  const d = detail(session);
  const next = copy(d.original);
  next.dayPlans[0].stops[0].status = 'completed';
  next.dayPlans[0].stops[1].status = 'active';
  d.render().update(next);
  await tick();
  assert.deepEqual(calls, [{ id: 'b', status: 'active' }]);
  d.h.unmount();
});
test('version conflict retains unsaved title and itinerary and does not load over the draft', async () => {
  let reads = 0;
  const session = {
    api: {
      update: async () => {
        throw new Error('VERSION_CONFLICT');
      },
    },
    load: async () => {
      reads++;
      return trip();
    },
  };
  const d = detail(session);
  d.render().update({ ...d.original, title: 'Unsaved title' });
  await d.render().save();
  const state = d.render();
  assert.equal(state.draft.title, 'Unsaved title');
  assert.equal(state.error, 'VERSION_CONFLICT');
  assert.equal(reads, 0);
  d.h.unmount();
});
test('a successful metadata write followed by itinerary failure keeps the new version for recovery', async () => {
  const session = {
    api: {
      update: async () => ({ version: '1', itineraryVersion: '0' }),
      replace: async () => {
        throw new Error('offline');
      },
    },
  };
  const d = detail(session);
  d.render().update({ ...d.original, title: 'Saved metadata' });
  await d.render().save();
  assert.equal(d.render().draft.version, '1');
  assert.equal(d.render().draft.title, 'Saved metadata');
  assert.equal(d.render().error, 'offline');
  d.h.unmount();
});
test('creation retry reuses the original key and body after an uncertain response', async () => {
  const calls = [];
  let attempt = 0;
  class ApiRequestError extends Error {}
  const api = {
    page: async () => ({ items: [], pageInfo: { nextCursor: null } }),
    cities: async () => ({ items: [] }),
    create: async (body) => {
      calls.push(copy(body));
      if (++attempt === 1) throw new Error('offline');
      return { id: 'created' };
    },
    get: async () => ({ id: 'created' }),
  };
  const h = harness('TripProvider.tsx', {
    'expo-crypto': { randomUUID: () => 'stable-key' },
    '../auth/session': { ApiRequestError },
    './tripApi': { tripApi: () => api, createTripInput: (t) => ({ title: t.title }) },
  });
  const request = () => {};
  const render = () => h.render((e) => e.TripProvider({ request, userId: 'user', children: null }));
  const state = render();
  await tick();
  await assert.rejects(state.create({ title: 'Original' }), /offline/);
  await assert.rejects(render().create({ title: 'Edited' }), /Kiểm tra/);
  assert.equal(calls.length, 1);
  assert.equal((await render().retryCreate()).id, 'created');
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(render().hasPendingCreate, false);
  h.unmount();
});
test('a list response arriving after account change cannot populate the new account', async () => {
  let resolveOld;
  let calls = 0;
  class ApiRequestError extends Error {}
  const api = {
    page: () =>
      ++calls === 1
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({ items: [], pageInfo: { nextCursor: null } }),
    cities: async () => ({ items: [] }),
    get: async (id) => ({ id }),
  };
  const h = harness('TripProvider.tsx', {
    'expo-crypto': {},
    '../auth/session': { ApiRequestError },
    './tripApi': { tripApi: () => api },
  });
  const request = () => {};
  const render = (userId) => h.render((e) => e.TripProvider({ request, userId, children: null }));
  render('old');
  render('new');
  await tick();
  resolveOld({ items: [{ id: 'private-old-trip' }], pageInfo: { nextCursor: null } });
  await tick();
  assert.equal(render('new').trips.length, 0);
  h.unmount();
});
test('changing both dates preserves occupied days, while shortening refuses to silently delete them', () => {
  const modelExports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(path.resolve(__dirname, '../src/trips/tripModel.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    { exports: modelExports },
  );
  const destination = {
    key: 'dalat',
    name: 'Dalat',
    coords: [11, 108],
    dayPlans: [],
    hotSpots: [],
  };
  const cities = [{ code: 'DALAT', frontendKey: 'dalat', name: 'Dalat' }];
  const h = harness('useTripSetupViewModel.ts', {
    './TripProvider': { useTrips: () => ({ cities }) },
    './destinations': { destinations: [destination] },
    './tripModel': modelExports,
  });
  const props = { initialCityKey: 'dalat', lists: [], onBack() {}, onSave() {}, notify() {} };
  const render = () => h.render((e) => e.useTripSetupViewModel(props));
  render().setDraft({
    ...trip(),
    dateMode: 'flexible',
    dayPlans: [
      { dayNumber: 1, stops: [] },
      { dayNumber: 2, stops: [] },
      { dayNumber: 3, stops: [{ id: 'keep', name: 'Keep', status: 'pending' }] },
    ],
  });
  render().setDateMode('specific');
  render().setDates('2030-01-01', '2030-01-03');
  render();
  render().setDates('2030-02-01', '2030-02-03');
  render();
  assert.equal(render().draft.dayPlans[2].stops[0].id, 'keep');
  assert.equal(render().draft.startDate, '2030-02-01');
  render().setDates('2030-02-01', '2030-02-01');
  assert.equal(render().end, '2030-02-03');
  assert.match(render().error, /còn điểm dừng/);
  h.unmount();
});

test('acknowledged itinerary keeps server IDs and versions when the following read fails', async () => {
  const acknowledged = {
    version: '2',
    tripVersion: '3',
    dayPlans: [{ dayNumber: 1, stops: [{ id: 'server-id', status: 'pending' }] }],
  };
  const writes = [];
  const session = {
    api: {
      replace: async (t) => {
        writes.push(copy(t));
        return acknowledged;
      },
    },
    load: async () => {
      throw Error('offline');
    },
  };
  const d = detail(session);
  d.render().update({
    ...d.original,
    dayPlans: [{ dayNumber: 1, stops: [{ id: 'local-id', status: 'pending' }] }],
  });
  await d.render().save();
  assert.equal(d.render().draft.dayPlans[0].stops[0].id, 'server-id');
  assert.equal(d.render().draft.version, '3');
  assert.equal(d.render().dirty, false);
  d.render().update({
    ...d.render().draft,
    dayPlans: [{ dayNumber: 1, stops: [{ id: 'server-id', status: 'pending', note: 'Edited' }] }],
  });
  await d.render().save();
  assert.equal(writes[1].dayPlans[0].stops[0].id, 'server-id');
  assert.equal(writes[1].itineraryVersion, '2');
  d.h.unmount();
});
test('metadata retry uses the acknowledged version after a failed refresh', async () => {
  const writes = [];
  const session = {
    api: {
      update: async (_, body) => {
        writes.push(body.expectedTripVersion);
        return { title: 'Saved', version: String(writes.length), itineraryVersion: '0' };
      },
    },
    load: async () => {
      throw Error('offline');
    },
  };
  const d = detail(session);
  await d.render().saveMetadata({ title: 'Saved' });
  await d.render().saveMetadata({ title: 'Saved again' });
  assert.deepEqual(writes, ['0', '1']);
  d.h.unmount();
});

function planner(initial) {
  const model = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(path.resolve(__dirname, '../src/trips/tripModel.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    { exports: model },
  );
  const h = harness('useTripPlanViewModel.ts', { './tripModel': model });
  let current = initial;
  const notices = [];
  return {
    h,
    current: () => current,
    render: () =>
      h.render((e) =>
        e.useTripPlanViewModel({
          trip: current,
          destination: {},
          onBack() {},
          onUpdate: (t) => {
            current = t;
          },
          notify: (...args) => notices.push(args),
        }),
      ),
    notices,
  };
}
test('shared planner workflows preserve stops across reorder and day changes and reject duplicate picks', () => {
  const d = planner({
    ...trip(),
    members: [],
    dayPlans: [
      {
        dayNumber: 1,
        stops: [
          { id: 'a', name: 'First', status: 'pending' },
          { id: 'b', name: 'Second', status: 'pending' },
        ],
      },
      { dayNumber: 2, stops: [] },
    ],
  });
  d.render().reorder(0, 'b', -1);
  assert.equal(d.current().dayPlans[0].stops[0].id, 'b');
  d.render().move(0, 1, 'b');
  assert.equal(d.current().dayPlans[1].stops[0].id, 'b');
  d.render().setPicker(1);
  d.render().pickPlace(1, { name: 'First' });
  assert.equal(d.current().dayPlans[1].stops.length, 1);
  assert.ok(d.render().message);
  assert.equal(d.render().picker, 1);
  d.render().pickPlace(1, { name: 'Manual without coordinates' }, true);
  const stop = d.current().dayPlans[1].stops.at(-1);
  assert.equal(stop.lat, undefined);
  assert.equal(d.render().edit, stop.id);
  assert.equal(d.render().picker, null);
  d.render().removeStop(stop.id);
  assert.equal(d.current().dayPlans[1].stops.length, 1);
  assert.equal(d.render().edit, null);
  d.h.unmount();
});
test('planner progress retains the one-active-stop rule and unlocated stops do not reach the map', () => {
  const d = planner({ ...trip(), members: [] });
  const next = d.current().dayPlans[0].stops[1];
  d.render().setSelected(next);
  d.render().advanceSelected();
  assert.equal(d.current().dayPlans[0].stops[0].status, 'completed');
  assert.equal(d.current().dayPlans[0].stops[1].status, 'active');
  d.render().locate(next);
  assert.equal(d.render().focus, null);
  assert.equal(d.notices.length, 1);
  d.h.unmount();
});
