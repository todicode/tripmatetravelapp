const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
function load(name) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/chat', name), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, Error, Date, BigInt };
  vm.runInNewContext(output, context);
  return context.exports;
}
const { createDirectMessageApi } = load('directMessageApi.ts');
const { DirectMessagingSession, compareSeq, mergeMessages, toDeliveryMessage, toListConversation } = load('directMessagingModel.ts');
const time = '2026-10-03T00:00:00Z';
const user = { id: 'peer', displayName: 'Bạn An', avatarMediaId: null };
const message = (seq, senderId = 'peer', clientMessageId = `client-${seq}`) => ({ id: `message-${seq}-${senderId}`, conversationId: 'conversation',
  seq: String(seq), sender: { ...user, id: senderId }, clientMessageId, body: `Text ${seq}`, createdAt: time });
const conversation = (changes = {}) => ({ id: 'conversation', user, lastMessage: null, lastSeq: '0', lastReadSeq: '0',
  unreadCount: '0', canSend: true, createdAt: time, updatedAt: time, ...changes });
const page = (items = [], changes = {}) => ({ items, pageInfo: { hasMore: false, nextBeforeSeq: null,
  nextAfterSeq: items.at(-1)?.seq ?? '0', ...changes } });
const ids = store => Array.from(store.getSnapshot().threads.conversation.messages, m => m.id);
function fixture(overrides = {}) {
  const calls = [];
  let uuid = 0;
  const api = {
    conversations: async () => [conversation()], open: async () => conversation(), history: async () => page(),
    send: async (id, clientId, body) => { calls.push({ id, clientId, body }); return { ...message('1', 'me', clientId), body }; },
    read: async (id, seq) => ({ conversationId: id, lastReadSeq: seq, unreadCount: '0' }), ...overrides,
  };
  const store = new DirectMessagingSession(api, 'me', () => `generated-${++uuid}`);
  return { store, api, calls, uuids: () => uuid };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function ready(f) { await f.store.refresh(); await f.store.load('conversation'); }

test('API adapter paginates conversations and uses exact REST methods and preserved text', async () => {
  const calls = [];
  const api = createDirectMessageApi(async (url, body, method) => {
    calls.push({ url, body, method });
    if (url === '/direct-conversations?limit=20') return { items: [conversation()], pageInfo: { hasMore: true, nextCursor: 'signed+cursor' } };
    if (url.includes('cursor=')) return { items: [conversation({ id: 'other' })], pageInfo: { hasMore: false, nextCursor: null } };
    return {};
  });
  assert.deepEqual(Array.from(await api.conversations(), c => c.id), ['conversation', 'other']);
  await api.open('peer'); await api.send('conversation', 'client', '  hello\n');
  await api.history('conversation', { beforeSeq: '9007199254740993' });
  await api.history('conversation', { afterSeq: '9007199254740994' });
  await api.read('conversation', '9007199254740994');
  assert.equal(calls[1].url, '/direct-conversations?limit=20&cursor=signed%2Bcursor');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2])), { url: '/direct-conversations', body: { recipientId: 'peer' }, method: 'POST' });
  assert.equal(calls[3].body.body, '  hello\n'); assert.equal(calls[3].body.clientMessageId, 'client');
  assert.equal(calls[4].url, '/direct-conversations/conversation/messages?limit=50&beforeSeq=9007199254740993');
  assert.equal(calls[5].url, '/direct-conversations/conversation/messages?limit=50&afterSeq=9007199254740994');
  assert.equal(calls[6].method, 'PUT'); assert.equal(calls[6].body.lastReadSeq, '9007199254740994');
  assert.throws(() => api.history('conversation', { beforeSeq: '1', afterSeq: '2' }));
});

test('adapter rejects repeated or missing cursors instead of looping forever', async () => {
  const bad = createDirectMessageApi(async () => ({ items: [], pageInfo: { hasMore: true, nextCursor: 'same' } }));
  await assert.rejects(bad.conversations(), /danh sách/);
  const missing = createDirectMessageApi(async () => ({ items: [], pageInfo: { hasMore: true, nextCursor: null } }));
  await assert.rejects(missing.conversations(), /danh sách/);
});

test('sequences retain bigint precision, list previews map sender correctly and unread badge is capped', () => {
  assert.equal(compareSeq('9007199254740993', '9007199254740992'), 1);
  const view = toListConversation(conversation({ unreadCount: '9223372036854775807', lastMessage: message('9007199254740993', 'me') }), 'me');
  assert.equal(view.unreadLabel, '99+'); assert.equal(view.lastMessage.isMe, true);
  assert.equal(view.lastMessage.text, 'Text 9007199254740993');
  assert.equal(view.members[0], 'peer');
});

test('send displays pending state then replaces it with server message without trimming text', async () => {
  const response = deferred();
  const f = fixture({ send: async (id, clientId, body) => { f.calls.push({ id, clientId, body }); return response.promise; } });
  await ready(f);
  const sending = f.store.send('conversation', '  hello\n');
  assert.equal(f.store.getSnapshot().threads.conversation.messages[0].status, 'sending');
  response.resolve({ ...message('1', 'me', 'generated-1'), body: '  hello\n' }); await sending;
  assert.equal(ids(f.store).length, 1);
  assert.equal(f.store.getSnapshot().threads.conversation.messages[0].status, 'sent');
  assert.equal(f.calls[0].body, '  hello\n');
  assert.equal(f.store.getSnapshot().conversations[0].lastMessage.body, '  hello\n');
});

test('failed send retry reuses the original client UUID and exact payload, and double retry is coalesced', async () => {
  let attempts = 0;
  const response = deferred();
  const f = fixture({ send: async (id, clientId, body) => {
    f.calls.push({ id, clientId, body });
    if (++attempts === 1) throw Error('offline');
    return response.promise;
  } });
  await ready(f); await f.store.send('conversation', ' hello ');
  assert.equal(f.store.getSnapshot().threads.conversation.messages[0].status, 'failed');
  const retry = f.store.retry('conversation', 'generated-1');
  await f.store.retry('conversation', 'generated-1');
  assert.equal(attempts, 2);
  response.resolve({ ...message('1', 'me', 'generated-1'), body: ' hello ' }); await retry;
  assert.deepEqual(f.calls[0], f.calls[1]); assert.equal(f.uuids(), 1); assert.equal(ids(f.store).length, 1);
});

test('timeout after commit reconciles via polling, even if retry later fails', async () => {
  let attempts = 0;
  const delayedRetry = deferred();
  const committed = { ...message('1', 'me', 'generated-1'), body: 'hello' };
  const f = fixture({
    send: async () => { if (++attempts === 1) throw Error('timeout'); return delayedRetry.promise; },
    history: async (id, bounds) => bounds?.afterSeq !== undefined ? page([committed]) : page(),
  });
  await ready(f); await f.store.send('conversation', 'hello');
  const retry = f.store.retry('conversation', 'generated-1');
  await f.store.sync('conversation');
  delayedRetry.reject(Error('offline')); await retry;
  assert.deepEqual(ids(f.store), [committed.id]);
  assert.equal(f.store.getSnapshot().threads.conversation.messages[0].status, 'sent');
});

test('outgoing response does not skip intervening incoming messages or mark an unseen gap read', async () => {
  const queried = [], readSeqs = [];
  const f = fixture({
    history: async (id, bounds) => { queried.push(bounds); return bounds?.afterSeq ? page([message('6'), message('7', 'me', 'generated-1')]) : page([message('5')]); },
    send: async () => message('7', 'me', 'generated-1'),
    read: async (id, seq) => { readSeqs.push(seq); return { conversationId: id, lastReadSeq: seq, unreadCount: '0' }; },
  });
  await ready(f); await f.store.send('conversation', 'hello');
  assert.equal(f.store.getSnapshot().threads.conversation.afterSeq, '5');
  await f.store.read('conversation', '7'); assert.deepEqual(readSeqs, ['5']);
  await f.store.sync('conversation');
  assert.equal(queried[1].afterSeq, '5');
  assert.deepEqual(Array.from(f.store.getSnapshot().threads.conversation.messages, m => m.seq), ['5', '6', '7']);
  await f.store.read('conversation', '7'); assert.deepEqual(readSeqs, ['5', '7']);
});

test('catch-up drains all pages and coalesces overlapping sync into one follow-up for late events', async () => {
  const response = deferred();
  const queried = [];
  const f = fixture({ history: async (id, bounds) => {
    queried.push(bounds?.afterSeq);
    if (!bounds) return page([message('9007199254740993')]);
    if (bounds.afterSeq === '9007199254740993') return response.promise;
    if (bounds.afterSeq === '9007199254740994') return page([message('9007199254740995')]);
    return page([], { nextAfterSeq: bounds.afterSeq });
  } });
  await ready(f);
  const syncing = f.store.sync('conversation'); await f.store.sync('conversation');
  response.resolve(page([message('9007199254740994')], { hasMore: true })); await syncing;
  assert.deepEqual(queried, [undefined, '9007199254740993', '9007199254740994', '9007199254740995']);
  await f.store.sync('conversation');
  assert.equal(f.store.getSnapshot().threads.conversation.afterSeq, '9007199254740995');
  assert.equal(ids(f.store).length, 3);
});

test('live events immediately reconcile pending messages but never skip REST gaps or mark unread history', async () => {
  const response = deferred();
  const f = fixture({ history: async () => page([message('5')]), send: () => response.promise });
  await ready(f);
  const sending = f.store.send('conversation', 'hello');
  const event = { eventId: 'event-1', type: 'direct.message.created', schemaVersion: 1, occurredAt: time,
    data: { ...message('7', 'me', 'generated-1'), body: 'hello' } };
  f.store.receive(event); f.store.receive(event);
  assert.equal(ids(f.store).length, 2);
  assert.equal(f.store.getSnapshot().threads.conversation.afterSeq, '5');
  response.reject(new Error('late timeout')); await sending;
  assert.equal(f.store.getSnapshot().threads.conversation.messages.at(-1).status, 'sent');
  f.store.deactivate();
  f.store.receive({ ...event, eventId: 'late-event', data: message('8') });
  assert.equal(ids(f.store).length, 2);
});

test('older history prepends and deduplicates without moving the catch-up cursor backwards', async () => {
  const f = fixture({ history: async (id, bounds) => bounds?.beforeSeq ? page([message('1'), message('2')])
    : page([message('2'), message('3')], { nextBeforeSeq: '2' }) });
  await ready(f); await f.store.older('conversation');
  assert.deepEqual(Array.from(f.store.getSnapshot().threads.conversation.messages, m => m.seq), ['1', '2', '3']);
  assert.equal(f.store.getSnapshot().threads.conversation.afterSeq, '3');
  assert.equal(f.store.getSnapshot().threads.conversation.olderSeq, null);
});

test('same client UUID from the other sender cannot erase a failed outgoing message', () => {
  const pending = { id: 'pending:shared', clientMessageId: 'shared', text: 'mine', isMe: true, createdAt: time, status: 'failed' };
  const other = toDeliveryMessage(message('1', 'peer', 'shared'), 'me');
  assert.equal(mergeMessages([pending], [other]).length, 2);
});

test('opening is coalesced and late list responses cannot regress sent previews or read markers', async () => {
  const lateList = deferred(), opening = deferred();
  const f = fixture({ open: () => opening.promise });
  await ready(f);
  const first = f.store.open('peer'); assert.equal(await f.store.open('peer'), null);
  opening.resolve(conversation()); assert.equal(await first, 'conversation');
  f.api.conversations = () => lateList.promise;
  const refreshing = f.store.refresh();
  await f.store.send('conversation', 'new');
  f.api.history = async () => page([message('1', 'me', 'generated-1')]); await f.store.sync('conversation');
  await f.store.read('conversation', '1');
  lateList.resolve([conversation()]); await refreshing;
  assert.equal(f.store.getSnapshot().conversations[0].lastSeq, '1');
  assert.equal(f.store.getSnapshot().conversations[0].lastReadSeq, '1');
});

test('read updates coalesce visible targets and avoid redundant or backwards requests', async () => {
  const response = deferred(), calls = [];
  const f = fixture({ history: async () => page([message('3')]),
    read: async (id, seq) => { calls.push(seq); return seq === '1' ? response.promise : { conversationId: id, lastReadSeq: seq, unreadCount: '0' }; } });
  await ready(f);
  const first = f.store.read('conversation', '1'); await f.store.read('conversation', '3');
  response.resolve({ conversationId: 'conversation', lastReadSeq: '1', unreadCount: '2' }); await first;
  await f.store.read('conversation', '2');
  assert.deepEqual(calls, ['1', '3']);
  assert.equal(f.store.getSnapshot().conversations[0].unreadCount, '0');
});

test('unfriend denial preserves message history and stops new sends and retries', async () => {
  const denied = Object.assign(Error('Only friends'), { code: 'NOT_FRIENDS' });
  const f = fixture({ history: async () => page([message('1')]), send: async () => { throw denied; } });
  await ready(f); await f.store.send('conversation', 'blocked');
  assert.equal(f.store.getSnapshot().conversations[0].canSend, false);
  assert.equal(ids(f.store).length, 2);
  await assert.rejects(f.store.send('conversation', 'again'));
  await f.store.retry('conversation', 'generated-1');
  assert.equal(f.store.getSnapshot().threads.conversation.messages[1].status, 'failed');
});

test('body validation counts Unicode code points and sends nothing for invalid input', async () => {
  const f = fixture(); await ready(f);
  await assert.rejects(f.store.send('conversation', '   '));
  await assert.rejects(f.store.send('conversation', '😀'.repeat(4001)));
  assert.equal(f.calls.length, 0);
  await f.store.send('conversation', '😀'.repeat(4000)); assert.equal(f.calls[0].body.length, 8000);
});

test('failed history can be retried, and stale account responses cannot revive private data', async () => {
  let attempts = 0;
  const f = fixture({ history: async () => { if (++attempts === 1) throw Error('offline'); return page([message('1')]); } });
  await ready(f); assert.equal(f.store.getSnapshot().threads.conversation.initialized, false);
  assert.ok(f.store.getSnapshot().threads.conversation.error);
  await f.store.load('conversation'); assert.equal(f.store.getSnapshot().threads.conversation.initialized, true);
  const late = deferred();
  const old = fixture({ conversations: () => late.promise });
  const loading = old.store.refresh(); old.store.deactivate();
  late.resolve([conversation()]); await loading;
  assert.equal(old.store.getSnapshot().conversations.length, 0);
  const fresh = fixture(); await fresh.store.refresh(); assert.equal(fresh.store.getSnapshot().conversations.length, 1);
});
