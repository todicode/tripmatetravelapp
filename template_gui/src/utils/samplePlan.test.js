import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleDayPlans } from './samplePlan.js';

const destination = { image: 'cover.webp', dayPlans: [{ stops: [
  { name: 'Hồ Xuân Hương', lat: 11.94, lng: 108.44 },
  { name: 'Quảng trường Lâm Viên', lat: 11.936, lng: 108.445 },
  { name: 'Hồ Xuân Hương', lat: 11.94, lng: 108.44 },
  { name: 'Thác Datanla', lat: 11.90, lng: 108.44 }
] }] };

test('sample keeps the requested day count, unique stops and source coordinates', () => {
  const original = JSON.stringify(destination);
  const plans = sampleDayPlans(destination, 3);
  assert.equal(plans.length, 3);
  assert.deepEqual(plans.map(day => day.stops.length), [1, 1, 1]);
  assert.equal(plans[0].stops[0].lat, 11.94);
  assert.equal(plans[0].stops[0].image, 'cover.webp');
  assert.deepEqual(plans.map(day => day.stops[0].dayNumber), [1, 2, 3]);
  assert.equal(JSON.stringify(destination), original);
});

test('sample does not repeat places to fill extra days', () => {
  const plans = sampleDayPlans(destination, 7);
  assert.equal(plans.length, 7);
  assert.equal(plans.flatMap(day => day.stops).length, 3);
  assert.ok(plans.some(day => !day.stops.length));
  assert.equal(sampleDayPlans(destination, 1)[0].stops.length, 3);
});
