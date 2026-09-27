import test from 'node:test';
import assert from 'node:assert/strict';
import { initialManualPlans, isDuplicateStop, manualTripPayload, moveStop, reorderStop } from './manualPlanner.js';
import { TripsStore } from '../store/tripsStore.js';

const setup = { destination: { name: 'Đà Lạt', coords: [11.94, 108.44], key: 'dalat' }, dateMode: 'flexible', days: 3, preferences: ['Thiên nhiên'], importedSpots: [] };
const first = { id: 'first', name: 'Hồ Xuân Hương', lat: 11.94, lng: 108.44, time: '08:30', note: 'Đi dạo' };
const second = { id: 'second', name: 'Quảng trường Lâm Viên', lat: 11.9365, lng: 108.4452, time: '10:00' };

test('manual itinerary starts empty, or imports unique saved places with their coordinates', () => {
  assert.equal(initialManualPlans(setup).flatMap(p => p.stops).length, 0);
  const plans = initialManualPlans({ ...setup, importedSpots: [first, { ...first, id: 'duplicate', name: '  HỒ XUÂN HƯƠNG ' }, second] });
  assert.equal(plans.length, 3);
  assert.equal(plans[0].stops.length, 2);
  assert.equal(plans[0].stops[0].lat, first.lat);
  assert.equal(first.dayNumber, undefined);
  assert.ok(isDuplicateStop(plans, { ...first, name: 'Tên khác gần cùng tọa độ' }));
});

test('reordering changes the route sequence without editing times, notes, or the original array', () => {
  const plans = initialManualPlans({ ...setup, importedSpots: [first, second] });
  const updated = reorderStop(plans, 0, second.id, -1);
  assert.deepEqual(updated[0].stops.map(s => s.id), ['second', 'first']);
  assert.equal(updated[0].stops[1].time, '08:30');
  assert.equal(updated[0].stops[1].note, 'Đi dạo');
  assert.equal(plans[0].stops[0].id, 'first');
  assert.equal(reorderStop(plans, 0, first.id, -1), plans);
});

test('moving a stop across days removes it from the source and preserves edited data', () => {
  const plans = initialManualPlans({ ...setup, importedSpots: [first, second] });
  const updated = moveStop(plans, 0, 2, first.id);
  assert.equal(updated[0].stops.length, 1);
  assert.equal(updated[2].stops[0].dayNumber, 3);
  assert.equal(updated[2].stops[0].time, '08:30');
  assert.equal(updated[2].stops[0].note, 'Đi dạo');
  assert.equal(updated.flatMap(p => p.stops).length, 2);
  assert.equal(plans[0].stops.length, 2);
});

test('saving a flexible edited itinerary retains days, preferences, and final stop order in the store', () => {
  const plans = moveStop(initialManualPlans({ ...setup, importedSpots: [first, second] }), 0, 2, first.id);
  const payload = manualTripPayload(setup, '  Cuối tuần của tôi  ', plans);
  const trip = TripsStore.createTrip(payload);
  assert.equal(trip.title, 'Cuối tuần của tôi');
  assert.equal(trip.dateMode, 'flexible');
  assert.equal(trip.flexibleDays, 3);
  assert.equal(trip.startDate, 'Chưa chốt ngày');
  assert.equal(trip.dayPlans[2].stops[0].id, 'first');
  assert.deepEqual(trip.stops.map(s => s.id), ['second', 'first']);
  assert.deepEqual(trip.aiPreferences, ['Thiên nhiên']);
  assert.equal(trip.aiScheduled, false);
});

test('specific dates survive saving without a timezone date shift', () => {
  const specific = { ...setup, dateMode: 'specific', start: '2026-12-31', end: '2027-01-02' };
  const payload = manualTripPayload(specific, '', initialManualPlans(specific));
  assert.match(payload.startDate, /31\/12\/2026/);
  assert.match(payload.endDate, /2\/1\/2027/);
  assert.equal(payload.flexibleDays, null);
  assert.equal(payload.duration, '3 ngày 2 đêm');
});
