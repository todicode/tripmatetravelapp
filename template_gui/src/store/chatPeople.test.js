import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatPerson } from './chatPeople.js';

test('group sender aliases open the same person as their private conversation', () => {
  assert.equal(getChatPerson('Tuấn').id, getChatPerson('Minh Tuấn', 'f1').id);
  assert.equal(getChatPerson('Tuấn', 'f2').name, 'Phương Thảo');
});

test('unknown participants retain their identity without fabricated personal details', () => {
  const person = getChatPerson('An', 'new-person');
  assert.equal(person.id, 'new-person');
  assert.equal(person.name, 'An');
  assert.equal(person.email, undefined);
  assert.equal(person.online, undefined);
});
