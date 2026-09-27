import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStayGap, validStayRange } from './hotelStays.js';
test('full stay hides additional hotels; partial stays expose uncovered nights', () => {
  assert.equal(nextStayGap(3, [{ startDay: 1, endDay: 3 }]), null);
  assert.deepEqual(nextStayGap(5, [{ startDay: 1, endDay: 3 }]), { startDay: 3, endDay: 5 });
  assert.deepEqual(nextStayGap(5, [{ startDay: 3, endDay: 5 }]), { startDay: 1, endDay: 3 });
  assert.equal(nextStayGap(5, [{ startDay: 1, endDay: 3 }, { startDay: 3, endDay: 5 }]), null);
});
test('checkout day can be the next check-in, but stays cannot overlap', () => {
  const stays = [{ startDay: 1, endDay: 3 }];
  assert.equal(validStayRange(5, stays, 3, 5), true);
  assert.equal(validStayRange(5, stays, 2, 4), false);
  assert.equal(validStayRange(5, [], 3, 3), false);
  assert.equal(validStayRange(5, [], 1, 6), false);
  assert.equal(validStayRange(1, [], 1, 1), true);
  assert.equal(nextStayGap(1, [{ startDay: 1, endDay: 1 }]), null);
});


test('hotel selections and their dates survive saving a planned trip', async () => {
  const { manualTripPayload, initialManualPlans } = await import('./manualPlanner.js');
  const { TripsStore } = await import('../store/tripsStore.js');
  const hotelStays = [{ id: 'stay-test', hotel: { name: 'Khách sạn của tôi' }, startDay: 1, endDay: 3, checkInTime: '14:00', checkOutTime: '12:00', notes: 'Phòng yên tĩnh' }];
  const setup = { destination: { name: 'Đà Lạt', key: 'dalat', coords: [11.94, 108.44] }, days: 3, dateMode: 'flexible', preferences: [], importedSpots: [], lodgingType: 'hotel', hotelStays };
  const payload = manualTripPayload(setup, 'Hotel test', initialManualPlans(setup));
  const trip = TripsStore.createTrip(payload);
  assert.deepEqual(TripsStore.getTripById(trip.id).hotelStays, hotelStays);
});


test('editing a saved itinerary preserves its identity, hotel stays and expenses', async () => {
  const { TripsStore } = await import('../store/tripsStore.js');
  const hotelStays = [{ id: 'hotel-preserve', hotel: { name: 'Chosen hotel' }, startDay: 1, endDay: 3 }];
  const trip = TripsStore.createTrip({ title: 'Original title', city: 'Đà Lạt', cityKey: 'dalat', hotelStays, dayPlans: [{ dayNumber: 1, stops: [] }], stops: [] });
  const count = TripsStore.getAllTrips().length;
  const expense = TripsStore.addExpense(trip.id, { title: 'Hotel', amount: 100 });
  const plans = [{ dayNumber: 1, stops: [{ id: 'updated-stop', name: 'New place', lat: 11.94, lng: 108.44 }] }];
  const updated = TripsStore.updateTripPlans(trip.id, plans);
  assert.equal(updated.id, trip.id);
  assert.equal(updated.title, 'Original title');
  assert.equal(TripsStore.getAllTrips().length, count);
  assert.deepEqual(updated.hotelStays, hotelStays);
  assert.equal(updated.stops[0].id, 'updated-stop');
  assert.ok(TripsStore.getExpenses(trip.id).some(item => item.id === expense.id));
  TripsStore.updateTripPlans(trip.id, [{ dayNumber: 1, stops: [] }]);
  assert.equal(TripsStore.getTripById(trip.id).stops.length, 0);
});


test('adding hotels to an existing trip retains its route and rejects overlapping stays', async () => {
  const { TripsStore } = await import('../store/tripsStore.js');
  const trip = TripsStore.createTrip({ title: 'Add hotel', cityKey: 'dalat', dayPlans: [1, 2, 3].map(dayNumber => ({ dayNumber, stops: [] })) });
  const count = TripsStore.getAllTrips().length;
  const stay = { id: 'added-hotel', hotel: { name: 'Selected hotel' }, startDay: 1, endDay: 3 };
  const updated = TripsStore.updateTripHotelStays(trip.id, [stay]);
  assert.equal(updated.id, trip.id);
  assert.equal(updated.lodgingType, 'hotel');
  assert.equal(updated.dayPlans.length, 3);
  assert.deepEqual(updated.hotelStays, [stay]);
  assert.equal(TripsStore.getAllTrips().length, count);
  assert.throws(() => TripsStore.updateTripHotelStays(trip.id, [stay, { ...stay, id: 'overlap' }]));
  assert.deepEqual(TripsStore.getTripById(trip.id).hotelStays, [stay]);
});
