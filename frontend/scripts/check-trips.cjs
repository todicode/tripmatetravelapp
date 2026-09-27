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
assert.throws(() => model.addStop(days, 2, { name: 'Different name at the same location', lat: 11.0001, lng: 108.0001 }));
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
const flexible = model.createTrip(destination, 'Flexible', '', '', days, { dateMode: 'flexible' });
assert.equal(flexible.flexibleDays, days.length);
assert.equal(flexible.startDate, '');
const stay = (startDay, endDay) => ({ id: `${startDay}_${endDay}`, hotel: { name: 'Hotel' }, startDay, endDay, checkInTime: '', checkOutTime: '', notes: '' });
assert.equal(model.validStayRange(4, [stay(1, 3)], 3, 4), true, 'Adjacent stays must be allowed');
assert.equal(model.validStayRange(4, [stay(1, 3)], 2, 4), false, 'Overlapping nights must be rejected');
assert.equal(model.validStayRange(4, [], 3, 3), false);
assert.equal(model.validStayRange(1, [], 1, 1), true);
assert.equal(model.validStayRange(1, [stay(1, 1)], 1, 1), false);
assert.equal(model.nextStayGap(4, [stay(1, 4)]), null);
assert.equal(model.nextStayGap(4, [stay(2, 3)]).startDay, 1);
assert.equal(model.nextStayGap(4, [stay(2, 3)]).endDay, 2);
assert.throws(() => model.createTrip(destination, 'Overlap', '', '', days, { dateMode: 'flexible', hotelStays: [stay(1, 3), stay(2, 3)] }));
const reordered = model.reorderStop(days, 0, days[0].stops[0].id, 1);
assert.equal(reordered[0].stops[1].id, days[0].stops[0].id);
assert.notEqual(reordered[0].stops, days[0].stops);
const movingId = days[0].stops[0].id;
const moved = model.moveStop(days, 0, 2, movingId);
assert.equal(moved[0].stops.some(stop => stop.id === movingId), false);
assert.equal(moved[2].stops.at(-1).id, movingId);
assert.equal(days[0].stops[0].id, movingId, 'Move must not mutate previous days');
const withMember = model.addTripMember(trip, { id: 'friend', name: 'Real friend' });
assert.equal(withMember.members.length, 1);
assert.equal(model.addTripMember(withMember, { id: 'friend', name: 'Real friend' }), withMember);
assert.equal(model.addTripMember(withMember, { id: 'another-id', name: '  REAL FRIEND  ' }), withMember, 'Same person must not be added twice under another ID');
assert.equal(trip.members.length, 0);
const savedModelSource = fs.readFileSync(path.join(root, '../savedPlacesModel.ts'), 'utf8');
const savedContext = { exports: {} };
vm.runInNewContext(ts.transpileModule(savedModelSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, savedContext);
const savedLists = [{ id: 'list', name: 'My places', destination, places: [{ id: 'p', name: 'Place', lat: 11, lng: 108 }] }];
assert.equal(savedContext.exports.parseSavedLists(JSON.stringify(savedLists))[0].places[0].name, 'Place');
assert.throws(() => savedContext.exports.parseSavedLists('{'));
assert.throws(() => savedContext.exports.parseSavedLists(JSON.stringify([{ id: 'x', name: 'Broken', places: [], destination: {} }])));
assert.throws(() => savedContext.exports.parseSavedLists(JSON.stringify([{ ...savedLists[0], places: [{ name: 42 }] }])));
assert.throws(() => savedContext.exports.parseSavedLists(JSON.stringify([{ ...savedLists[0], places: [{ name: 'Place', image: {} }] }])));
assert.throws(() => savedContext.exports.parseSavedLists(JSON.stringify([{ ...savedLists[0], places: [{ name: 'Place', communityNotes: [42] }] }])));

const mapSource = fs.readFileSync(path.join(root, 'TripMap.tsx'), 'utf8');
const html = mapSource.match(/const html = `([\s\S]*?)`;/)[1];
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);

async function checkMap() {
  let fetchCount = 0;
  const messages = [];
  const drawn = [];
  const layer = { addTo() { return this; }, on() { return this; }, setUrl() { return this; }, clearLayers() {} };
  const map = { setView() { return this; }, fitBounds() {}, removeLayer() {}, invalidateSize() {} };
  const mapContext = {
    window: { ReactNativeWebView: { postMessage: (message) => messages.push(message) }, addEventListener() {} },
    L: {
      map: () => map, tileLayer: () => layer, layerGroup: () => layer, marker: () => layer, circleMarker: () => layer,
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
  mapContext.window.setTrip({ ...data, routeEnabled: false });
  assert.equal(fetchCount, 1, 'Explore map must not request a trip route');
  mapContext.window.setTrip({ ...data, routeEnabled: false, focus: { id: 'position', lat: 11, lng: 108 } });
  assert.equal(fetchCount, 1, 'Focusing the current location must not request a trip route');
  mapContext.fetch = async () => { throw new Error('offline'); };
  mapContext.window.setTrip({ ...data, stops: [{ lat: 13, lng: 110 }, { lat: 14, lng: 111 }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.at(-1), 'route-error', 'Offline routing must be reported to the native screen');
}
checkMap().then(() => {
  console.log('Trip checks passed: dates, deduplication, edits, state transitions, expenses, map caching and offline feedback.');
}).catch(error => { console.error(error); process.exitCode = 1; });
