import test from 'node:test';
import assert from 'node:assert/strict';
import { countDays, dateKey, emptyDayPlans, parseLocalDate } from './tripSetup.js';
import { TripsStore } from '../store/tripsStore.js';
import { createSpotList, getSavedSpots, getSpotLists, saveSpots } from '../store/savedSpots.js';

test('specific dates include both endpoints across month and year boundaries', () => {
  assert.equal(countDays('2026-12-31', '2027-01-02'), 3);
  assert.equal(countDays('2028-02-28', '2028-03-01'), 3);
  assert.equal(countDays('2026-09-26', '2026-09-26'), 1);
  assert.equal(countDays('2026-09-27', '2026-09-26'), 0);
  assert.equal(countDays('2026-09-26', ''), 0);
  assert.equal(dateKey(parseLocalDate('2026-09-26')), '2026-09-26');
});

test('manual flexible trip keeps its duration without inventing dates or stops', () => {
  const plans = emptyDayPlans(3);
  const trip = TripsStore.createTrip({ city: 'Đà Lạt', cityKey: 'dalat', dateMode: 'flexible', flexibleDays: 3, startDate: 'Chưa chốt ngày', duration: '3 ngày 2 đêm', dayPlans: plans, stops: [], aiPreferences: ['Thiên nhiên'], aiScheduled: false });
  assert.equal(trip.dateMode, 'flexible');
  assert.equal(trip.flexibleDays, 3);
  assert.equal(trip.startDate, 'Chưa chốt ngày');
  assert.equal(trip.endDate, '');
  assert.equal(trip.dayPlans.length, 3);
  assert.equal(trip.dayPlans.flatMap(p => p.stops).length, 0);
  assert.deepEqual(trip.aiPreferences, ['Thiên nhiên']);
  assert.equal(trip.aiScheduled, false);
});

test('imported list keeps real coordinates and does not mutate saved spots', () => {
  const items = [{ id: 'spot', name: 'Hồ Xuân Hương', city: 'Đà Lạt', lat: 11.9419, lng: 108.4442 }];
  const plans = emptyDayPlans(2, items);
  assert.equal(plans[0].stops[0].lat, 11.9419);
  assert.equal(plans[0].stops[0].dayNumber, 1);
  assert.equal(plans[1].stops.length, 0);
  assert.equal(items[0].dayNumber, undefined);
});

test('saved lists persist and resolve the selected spot IDs', () => {
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const spots = getSavedSpots();
  saveSpots(spots);
  const list = createSpotList('  Những nơi muốn đến  ', [spots[0].id]);
  const saved = getSpotLists().find(l => l.id === list.id);
  assert.equal(saved.name, 'Những nơi muốn đến');
  assert.equal(saved.spots.length, 1);
  assert.equal(saved.spots[0].id, spots[0].id);
  assert.ok(getSpotLists().some(l => l.id.startsWith('city_')));
  delete globalThis.localStorage;
});
