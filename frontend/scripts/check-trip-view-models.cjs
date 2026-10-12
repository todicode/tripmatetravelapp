const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(moduleName, dependencies) {
  const slots = [], effects = [], cleanup = [];
  let cursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo(fn, deps) { const index = cursor++; if (!slots[index] || deps.some((v, i) => v !== slots[index].deps[i])) slots[index] = { deps, value: fn() }; return slots[index].value; },
    useEffect(fn, deps) { const index = cursor++; if (!slots[index] || !deps || deps.some((v, i) => v !== slots[index][i])) { slots[index] = deps; effects.push(() => { cleanup[index]?.(); cleanup[index] = fn(); }); } },
    createContext() { return { Provider: 'provider' }; }, createElement(_type, props) { return props.value; },
  };
  react.default = react;
  const exports = {};
  const context = { exports, require: name => name === 'react' ? react : name === 'react-native' ? { BackHandler: { addEventListener: () => ({ remove() {} }) } } : dependencies[name], Error, Promise, JSON, console };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/trips', moduleName), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, context);
  return { render(fn) { cursor = 0; const value = fn(exports); effects.splice(0).forEach(effect => effect()); return value; }, unmount() { cleanup.forEach(fn => fn?.()); } };
}
const copy = value => JSON.parse(JSON.stringify(value));
const trip = () => ({ id: 't', title: 'Trip', version: '0', itineraryVersion: '0', dayPlans: [{ dayNumber: 1, stops: [{ id: 'a', status: 'active' }, { id: 'b', status: 'pending' }] }] });
const tick = () => new Promise(resolve => setImmediate(resolve));
function detail(session) {
  const h = harness('useTripDetailsViewModel.ts', { './TripProvider': { useTrips: () => session, message: e => e.message }, './tripApi': { itineraryInput: t => t.dayPlans } });
  const original = trip();return { h, original, render: () => h.render(e => e.useTripDetailsViewModel(original, () => {}, () => {})) };
}
test('starting a new stop sends its ID, not the previous active stop that became completed', async () => {
  const calls = [];const session = { api: { progress: async (_, id, status) => calls.push({ id, status }) }, load: async () => trip() };
  const d = detail(session);const next = copy(d.original);next.dayPlans[0].stops[0].status = 'completed';next.dayPlans[0].stops[1].status = 'active';
  d.render().update(next);await tick();assert.deepEqual(calls, [{ id: 'b', status: 'active' }]);d.h.unmount();
});
test('version conflict retains unsaved title and itinerary and does not load over the draft', async () => {
  let reads = 0;const session = { api: { update: async () => { throw new Error('VERSION_CONFLICT'); } }, load: async () => { reads++;return trip(); } };
  const d = detail(session);d.render().update({ ...d.original, title: 'Unsaved title' });await d.render().save();
  const state = d.render();assert.equal(state.draft.title, 'Unsaved title');assert.equal(state.error, 'VERSION_CONFLICT');assert.equal(reads, 0);d.h.unmount();
});
test('a successful metadata write followed by itinerary failure keeps the new version for recovery', async () => {
  const session = { api: { update: async () => ({ version: '1', itineraryVersion: '0' }), replace: async () => { throw new Error('offline'); } } };
  const d = detail(session);d.render().update({ ...d.original, title: 'Saved metadata' });await d.render().save();
  assert.equal(d.render().draft.version, '1');assert.equal(d.render().draft.title, 'Saved metadata');assert.equal(d.render().error, 'offline');d.h.unmount();
});
test('creation retry reuses the original key and body after an uncertain response', async () => {
  const calls = [];let attempt = 0;
  class ApiRequestError extends Error {}
  const api = { page: async () => ({ items: [], pageInfo: { nextCursor: null } }), cities: async () => ({ items: [] }), create: async body => { calls.push(copy(body)); if (++attempt === 1) throw new Error('offline');return { id: 'created' }; }, get: async () => ({ id: 'created' }) };
  const h = harness('TripProvider.tsx', { 'expo-crypto': { randomUUID: () => 'stable-key' }, '../auth/session': { ApiRequestError }, './tripApi': { tripApi: () => api, createTripInput: t => ({ title: t.title }) } });
  const request = () => {};const render = () => h.render(e => e.TripProvider({ request, userId: 'user', children: null }));
  const state = render();await tick();await assert.rejects(state.create({ title: 'Original' }), /offline/);
  await assert.rejects(render().create({ title: 'Edited' }), /Kiểm tra/);assert.equal(calls.length, 1);
  assert.equal((await render().retryCreate()).id, 'created');assert.deepEqual(calls[0], calls[1]);assert.equal(render().hasPendingCreate, false);h.unmount();
});
test('a list response arriving after account change cannot populate the new account', async () => {
  let resolveOld;let calls = 0;
  class ApiRequestError extends Error {}
  const api = { page: () => ++calls === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ items: [], pageInfo: { nextCursor: null } }), cities: async () => ({ items: [] }), get: async id => ({ id }) };
  const h = harness('TripProvider.tsx', { 'expo-crypto': {}, '../auth/session': { ApiRequestError }, './tripApi': { tripApi: () => api } });
  const request = () => {};const render = userId => h.render(e => e.TripProvider({ request, userId, children: null }));
  render('old');render('new');await tick();resolveOld({ items: [{ id: 'private-old-trip' }], pageInfo: { nextCursor: null } });await tick();assert.equal(render('new').trips.length, 0);h.unmount();
});
test('changing both dates preserves occupied days, while shortening refuses to silently delete them', () => {
  const modelExports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/trips/tripModel.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: modelExports });
  const destination = { key: 'dalat', name: 'Dalat', coords: [11, 108], dayPlans: [], hotSpots: [] };
  const cities = [{ code: 'DALAT', frontendKey: 'dalat', name: 'Dalat' }];
  const h = harness('useTripSetupViewModel.ts', { './TripProvider': { useTrips: () => ({ cities }) }, './destinations': { destinations: [destination] }, './tripModel': modelExports });
  const props = { initialCityKey: 'dalat', lists: [], onBack() {}, onSave() {}, notify() {} };
  const render = () => h.render(e => e.useTripSetupViewModel(props));
  render().setDraft({ ...trip(), dateMode: 'flexible', dayPlans: [{ dayNumber: 1, stops: [] }, { dayNumber: 2, stops: [] }, { dayNumber: 3, stops: [{ id: 'keep', name: 'Keep', status: 'pending' }] }] });
  render().setDateMode('specific');render().setDates('2030-01-01', '2030-01-03');render();
  render().setDates('2030-02-01', '2030-02-03');render();
  assert.equal(render().draft.dayPlans[2].stops[0].id, 'keep');assert.equal(render().draft.startDate, '2030-02-01');
  render().setDates('2030-02-01', '2030-02-01');
  assert.equal(render().end, '2030-02-03');assert.match(render().error, /còn điểm dừng/);h.unmount();
});
