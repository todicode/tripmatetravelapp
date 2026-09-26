const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src/trips');
const source = fs.readFileSync(path.join(root, 'tripModel.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const model = context.exports;
const tomorrow = model.addDays(model.dateKey(new Date()), 1);
const destination = {
  key: 'test', name: 'Test', coords: [11, 108],
  dayPlans: [
    { dayTitle: 'Ngày 1', stops: [{ id: 1, name: 'Hồ A', lat: 11, lng: 108, status: 'completed' }] },
    { dayTitle: 'Ngày 2', stops: [{ id: 2, name: '  hồ   A ', lat: 11, lng: 108 }, { id: 3, name: 'Đồi B', lat: 11.1, lng: 108.1 }] },
  ],
  hotSpots: [{ name: 'Quán C', lat: 11.2, lng: 108.2 }],
};
assert.equal(model.dayCount('2026-03-07', '2026-03-09'), 3);
assert.equal(model.displayDate(tomorrow), tomorrow.split('-').reverse().join('/'));
let days = model.buildDays(destination, 3);
assert.equal(days.flatMap(day => day.stops).length, 3, 'Duplicate destinations must not appear across days');
assert.ok(days.flatMap(day => day.stops).every(stop => stop.status === 'pending'));
assert.equal(new Set(days.flatMap(day => day.stops).map(stop => stop.id)).size, 3);
days = model.addStop(days, 0, { name: 'Điểm tự nhập' });
assert.equal(days[0].stops.at(-1).lat, undefined, 'Manual places must not receive invented coordinates');
assert.throws(() => model.addStop(days, 2, { name: 'điểm  tự nhập' }));
const expanded = model.buildDays(destination, 4, days);
assert.equal(expanded[0].stops.at(-1).name, 'Điểm tự nhập', 'Date changes must preserve edits');
assert.equal(expanded[3].stops.length, 0, 'Extra days must not invent attractions');
assert.equal(model.buildDays(destination, 1, expanded).length, 1);

const end = model.addDays(tomorrow, 2);
let trip = model.createTrip(destination, ' Chuyến đi ', tomorrow, end, days);
assert.equal(trip.title, 'Chuyến đi');
assert.equal(trip.status, 'upcoming');
assert.throws(() => model.createTrip(destination, 'Test', end, tomorrow, days));
assert.throws(() => model.createTrip(destination, 'Test', '2000-01-01', '2000-01-01', days));
assert.throws(() => model.createTrip(destination, 'Test', tomorrow, tomorrow, days));
assert.throws(() => model.createTrip(destination, 'Test', '', '', days));
assert.throws(() => model.createTrip(destination, 'Test', tomorrow, tomorrow, [{ dayNumber: 1, dayTitle: '', stops: [] }]));
const ids = model.tripStops(trip).map(stop => stop.id);
trip = model.toggleStop(trip, ids[0]);
trip = model.toggleStop(trip, ids[1]);
assert.equal(model.tripStops(trip).filter(stop => stop.status === 'active').length, 1);
assert.equal(model.tripStops(trip)[0].status, 'completed');
for (const id of ids) {
  while (model.tripStops(trip).find(stop => stop.id === id).status !== 'completed') trip = model.toggleStop(trip, id);
}
assert.equal(trip.status, 'completed');
trip = model.toggleStop(trip, ids[0]);
assert.equal(trip.status, 'upcoming');
const cancelled = { ...trip, status: 'cancelled' };
assert.equal(model.toggleStop(cancelled, ids[0]), cancelled);
for (const value of ['-1', '0', 'abc', '1.5', '9007199254740992']) assert.throws(() => model.addExpense(trip, 'Ăn uống', value, 'Bạn'));
const withExpense = model.addExpense(trip, 'Ăn uống', '150000', 'Bạn');
assert.equal(withExpense.expenses[0].amount, 150000);
assert.equal(trip.expenses.length, 0, 'Expense updates must not mutate previous state');

const mapSource = fs.readFileSync(path.join(root, 'TripMap.tsx'), 'utf8');
const html = mapSource.match(/const html = `([\s\S]*?)`;/)[1];
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);

async function checkMap() {
  let fetchCount = 0;
  const messages = [];
  const drawn = [];
  const layer = { addTo() { return this; }, clearLayers() {} };
  const map = { setView() { return this; }, fitBounds() {}, removeLayer() {}, invalidateSize() {} };
  const mapContext = {
    window: { ReactNativeWebView: { postMessage: (message) => messages.push(message) }, addEventListener() {} },
    L: {
      map: () => map, tileLayer: () => layer, layerGroup: () => layer, marker: () => layer,
      divIcon: options => options, latLngBounds: points => points,
      polyline: points => { drawn.push(points); return layer; },
    },
    AbortController, setTimeout, clearTimeout,
    fetch: async () => { fetchCount++; return { ok: true, json: async () => ({ routes: [{ geometry: { coordinates: [[108, 11], [109, 12]] } }] }) }; },
  };
  vm.runInNewContext(script, mapContext);
  const data = { coords: [11, 108], stops: [{ lat: 11, lng: 108, status: 'pending' }, { lat: 12, lng: 109, status: 'pending' }, { name: 'Unlocated' }] };
  mapContext.window.setTrip(data);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchCount, 1);
  assert.equal(messages.at(-1), 'ready');
  mapContext.window.setTrip({ ...data, stops: data.stops.map(stop => ({ ...stop, status: 'completed' })) });
  assert.equal(fetchCount, 1, 'Changing stop status must reuse the cached road route');
  assert.equal(drawn.length, 2);
  mapContext.fetch = async () => { throw new Error('offline'); };
  mapContext.window.setTrip({ ...data, stops: [{ lat: 13, lng: 110 }, { lat: 14, lng: 111 }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.at(-1), 'route-error', 'Offline routing must be reported to the native screen');
}
checkMap().then(() => {
  console.log('Trip checks passed: dates, deduplication, edits, state transitions, expenses, map caching and offline feedback.');
}).catch(error => { console.error(error); process.exitCode = 1; });
