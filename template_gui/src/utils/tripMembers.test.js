import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueMembers } from './tripMembers.js';
import { TripsStore } from '../store/tripsStore.js';

test('members normalize old string data and reject duplicates and empty names', () => {
  const members = uniqueMembers(['Lan', { id: 'lan', name: ' lan ' }, { name: 'Tuấn', phone: '0912 345 678' }, { name: 'Tuấn khác', phone: '0912345678' }]);
  assert.equal(members.length, 2);
  assert.equal(members[0].name, 'Lan');
  assert.throws(() => uniqueMembers([{ name: '  ' }]));
});
test('adding and removing companions preserves itinerary, hotels and expenses', () => {
  const hotels = [{ id: 'hotel', hotel: { name: 'Hotel' }, startDay: 1, endDay: 2 }];
  const trip = TripsStore.createTrip({ title: 'Companions', cityKey: 'dalat', hotelStays: hotels, dayPlans: [{ dayNumber: 1, stops: [] }, { dayNumber: 2, stops: [] }] });
  const expense = TripsStore.addExpense(trip.id, { title: 'Shared cost', amount: 100 });
  const updated = TripsStore.updateTripMembers(trip.id, [{ id: 'f1', name: 'Minh Tuấn' }, { id: 'f2', name: 'Phương Thảo' }]);
  assert.equal(updated.members.length, 2);
  assert.deepEqual(updated.hotelStays, hotels);
  assert.equal(updated.dayPlans.length, 2);
  assert.ok(TripsStore.getExpenses(trip.id).some(item => item.id === expense.id));
  TripsStore.updateTripMembers(trip.id, [updated.members[1]]);
  assert.equal(TripsStore.getTripById(trip.id).members[0].id, 'f2');
  TripsStore.updateTripMembers(trip.id, []);
  assert.deepEqual(TripsStore.getTripById(trip.id).members, []);
});
