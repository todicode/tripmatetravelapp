import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatPin, setChatPin, removeChatPin } from './chatPins.js';

test('new chats are unpinned and friend/group pins remain independent', () => {
  assert.equal(getChatPin('friend:test'), null);
  assert.equal(getChatPin('group:test'), null);
  setChatPin('friend:test', 'trip-1');
  assert.equal(getChatPin('friend:test'), 'trip-1');
  assert.equal(getChatPin('group:test'), null);
  setChatPin('group:test', 'trip-2');
  setChatPin('friend:test', 'trip-3');
  assert.equal(getChatPin('friend:test'), 'trip-3');
  assert.equal(getChatPin('group:test'), 'trip-2');
  removeChatPin('friend:test');
  assert.equal(getChatPin('friend:test'), null);
  assert.equal(getChatPin('group:test'), 'trip-2');
  removeChatPin('group:test');
});
