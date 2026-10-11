const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
function load(name) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/chat', name), 'utf8');
  const context = { exports: {}, Error, Date, BigInt };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const { createGroupMessageApi } = load('groupMessageApi.ts');
const { DirectMessagingSession } = load('directMessagingModel.ts');
const time = '2026-10-06T00:00:00Z';
const conversation = () => ({ id: 'group', user: { id: 'group', displayName: 'Group' }, canSend: true, lastSeq: '0', lastReadSeq: '0', unreadCount: '0', updatedAt: time });
const message = (seq, sender, clientMessageId = 'same') => ({ id: `${sender}-${seq}`, conversationId: 'group', seq, sender: { id: sender, displayName: sender }, clientMessageId, body: ' exact\n body ', createdAt: time });
const page = items => ({ items, pageInfo: { hasMore: false, nextBeforeSeq: null, nextAfterSeq: items.at(-1)?.seq ?? '0' } });
const copy = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };

test('group adapter paginates and calls all REST operations with correct bodies and version queries', async () => {
  const calls = [];
  const api = createGroupMessageApi(async (url, body, method = 'GET') => {
    calls.push({ url, body, method });
    if (url === '/group-conversations?limit=20') return { items: [{ id: 'one' }], pageInfo: { hasMore: true, nextCursor: '+token' } };
    if (url.includes('cursor=')) return { items: [{ id: 'two' }], pageInfo: { hasMore: false, nextCursor: null } };
    return {};
  });
  assert.deepEqual(Array.from(await api.conversations(), item => item.id), ['one', 'two']);
  assert.equal(calls[1].url, '/group-conversations?limit=20&cursor=%2Btoken');
  await api.create('My group', ['friend']); await api.detail('a/b'); await api.members('g');
  await api.update('g', '9007199254740993', { name: 'Renamed' }); await api.update('g', '2', { tripId: null });
  await api.add('g', 'friend', '3'); await api.remove('g', 'friend', '4'); await api.leave('g');
  await api.transfer('g', 'friend', '5'); await api.archive('g', '6'); await api.trip('g');
  await api.history('g', { beforeSeq: '9007199254740993' }); await api.history('g', { afterSeq: '9007199254740994' });
  await api.send('g', 'uuid', ' exact\n body '); await api.read('g', '9007199254740994');
  assert.deepEqual(copy(calls[2]), { url: '/group-conversations', body: { name: 'My group', memberIds: ['friend'], tripId: null }, method: 'POST' });
  assert.equal(calls[3].url, '/group-conversations/a%2Fb');
  assert.deepEqual(copy(calls[5].body), { name: 'Renamed', expectedVersion: '9007199254740993' });
  assert.equal('tripId' in calls[5].body, false); assert.equal(calls[6].body.tripId, null);
  assert.equal(calls[7].method, 'POST'); assert.equal(calls[7].body.expectedVersion, '3');
  assert.equal(calls[8].url, '/group-conversations/g/members/friend?expectedVersion=4'); assert.equal(calls[8].method, 'DELETE');
  assert.equal(calls[9].url, '/group-conversations/g/members/me'); assert.equal(calls[9].method, 'DELETE');
  assert.equal(calls[10].method, 'PUT'); assert.equal(calls[11].method, 'DELETE');
  assert.equal(calls[13].url, '/group-conversations/g/messages?limit=50&beforeSeq=9007199254740993');
  assert.equal(calls[14].url, '/group-conversations/g/messages?limit=50&afterSeq=9007199254740994');
  assert.equal(calls[15].body.body, ' exact\n body '); assert.equal(calls[16].body.lastReadSeq, '9007199254740994');
  assert.throws(() => api.history('g', { beforeSeq: '1', afterSeq: '2' }));
});

test('group pagination rejects looping or missing cursors', async () => {
  for (const nextCursor of [null, 'repeated']) {
    const api = createGroupMessageApi(async () => ({ items: [], pageInfo: { hasMore: true, nextCursor } }));
    await assert.rejects(api.conversations(), /danh sách nhóm/);
  }
});

function fixture(overrides = {}) {
  const api = { conversations: async () => [conversation()], history: async () => page([]),
    send: async (id, uuid, body) => ({ ...message('1', 'me', uuid), body }),
    read: async (id, seq) => ({ conversationId: id, lastReadSeq: seq, unreadCount: '0' }), ...overrides };
  return { api, store: new DirectMessagingSession(api, 'me', () => 'uuid', true) };
}
async function ready(store) { await store.refresh(); await store.load('group'); }

test('removed groups disappear with cached history and late history cannot revive them', async () => {
  const delayed = deferred(); let listing = [conversation()]; let histories = 0;
  const { store } = fixture({ conversations: async () => listing,
    history: async () => ++histories === 1 ? page([message('1', 'alice')]) : delayed.promise });
  await ready(store); const syncing = store.sync('group'); listing = []; await store.refresh();
  assert.equal(store.getSnapshot().conversations.length, 0); assert.equal(store.getSnapshot().threads.group, undefined);
  delayed.resolve(page([message('2', 'bob')])); await syncing;
  assert.equal(store.getSnapshot().threads.group, undefined);
});

test('membership denial clears history and blocks further sends', async () => {
  let failed = false;
  const { store } = fixture({ history: async () => { if (failed) throw Object.assign(new Error('Removed'), { code: 'GROUP_NOT_FOUND' }); return page([message('1', 'alice')]); } });
  await ready(store); failed = true; await store.sync('group');
  assert.equal(store.getSnapshot().conversations.length, 0);
  assert.equal(store.getSnapshot().threads.group?.messages.length ?? 0, 0);
  await assert.rejects(store.send('group', 'hello'));
});

test('retry preserves UUID/body without merging other senders using the same UUID', async () => {
  const calls = []; let fail = true;
  const { store } = fixture({ send: async (id, uuid, body) => {
    calls.push({ uuid, body }); if (fail) throw new Error('Offline'); return { ...message('3', 'me', uuid), body };
  }, history: async () => page([message('1', 'alice', 'uuid'), message('2', 'bob', 'uuid')]) });
  await ready(store); await store.send('group', ' exact\n body ');
  assert.equal(store.getSnapshot().threads.group.messages.length, 3);
  fail = false; await store.retry('group', 'uuid');
  assert.deepEqual(calls, [{ uuid: 'uuid', body: ' exact\n body ' }, { uuid: 'uuid', body: ' exact\n body ' }]);
  assert.deepEqual(Array.from(store.getSnapshot().threads.group.messages, item => item.senderId), ['alice', 'bob', 'me']);
});

test('archive denial disables sending while preserving readable history', async () => {
  const { store } = fixture({ history: async () => page([message('1', 'alice')]),
    send: async () => { throw Object.assign(new Error('Archived'), { code: 'GROUP_ARCHIVED' }); } });
  await ready(store); await store.send('group', 'hello');
  assert.equal(store.getSnapshot().conversations[0].canSend, false);
  assert.equal(store.getSnapshot().threads.group.messages[0].senderId, 'alice');
});

test('late read cannot restore membership or crash after removal', async () => {
  const delayed = deferred(); let listing = [conversation()];
  const { store } = fixture({ conversations: async () => listing, history: async () => page([message('1', 'alice')]), read: () => delayed.promise });
  await ready(store); const reading = store.read('group', '1'); listing = []; await store.refresh();
  delayed.resolve({ conversationId: 'group', lastReadSeq: '1', unreadCount: '0' }); await reading;
  assert.equal(store.getSnapshot().conversations.length, 0); assert.equal(store.getSnapshot().threads.group, undefined);
});

test('rejoining a group can sync again after an in-flight request was denied', async () => {
  let fail = false; let count = 0;
  const { store } = fixture({ history: async () => {
    count++; if (fail) throw Object.assign(new Error('Removed'), { code: 'GROUP_NOT_FOUND' });
    return page([message(String(count), 'alice')]);
  } });
  await ready(store); fail = true; await store.sync('group'); fail = false;
  await store.refresh(); await store.load('group'); await store.sync('group');
  assert.equal(count, 4);
  assert.equal(store.getSnapshot().threads.group.afterSeq, '4');
});

function hookHarness(file, modules) {
  let cursor = 0; const slots = [];
  const react = {
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: value => { const i = cursor++; return slots[i] ||= { current: value }; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((dep, j) => dep !== slots[i].deps[j])) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect: () => {}, useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  };
  const context = { exports: {}, require: name => name === 'react' ? react : modules[name] };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/chat', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { render: (name, ...args) => { cursor = 0; return context.exports[name](...args); } };
}

test('create form validates, limits membership and coalesces repeated taps until the API finishes', async () => {
  const h = hookHarness('useCreateGroup.ts', {}); const pending = deferred(); const calls = [];
  const create = (name, members) => { calls.push({ name, members }); return pending.promise; };
  const render = () => h.render('useCreateGroup', create);
  await render().create(); assert.equal(calls.length, 0); assert.match(render().error, /Tên nhóm/);
  render().setName('a'.repeat(101)); await render().create(); assert.equal(calls.length, 0);
  render().setName('  Nhóm bạn  ');
  for (let i = 0; i < 100; i++) render().toggle(`friend-${i}`);
  assert.equal(render().selected.length, 99);
  const submitting = render().create(); await render().create();
  assert.equal(calls.length, 1); assert.equal(calls[0].name, 'Nhóm bạn'); assert.equal(render().busy, true);
  pending.resolve(); await submitting; assert.equal(render().busy, false);
});

test('group hook connects server metadata, unread counts, messages and creation to the list', async () => {
  let groups = [{ ...conversation(), name: 'Nhóm thật', ownerId: 'me', version: '9', memberCount: 2,
    tripId: null, archived: false, unreadCount: '9007199254740993', lastMessage: message('1', 'alice') }];
  const calls = [];
  const request = async (url, body, method) => {
    calls.push({ url, body, method });
    if (method === 'POST' && url === '/group-conversations') {
      const created = { ...groups[0], id: 'new', name: body.name }; groups = [created, ...groups]; return created;
    }
    return { items: groups, pageInfo: { hasMore: false, nextCursor: null } };
  };
  const h = hookHarness('useGroupMessaging.ts', {
    'react-native': { AppState: { currentState: 'active' } }, 'expo-crypto': { randomUUID: () => 'uuid' },
    './groupMessageApi': { createGroupMessageApi }, './directMessagingModel': load('directMessagingModel.ts'),
  });
  const render = () => h.render('useGroupMessaging', request, 'me', false, null);
  await render().store.refresh();
  assert.equal(render().groups[0].version, '9'); assert.equal(render().listConversations[0].name, 'Nhóm thật');
  assert.equal(render().listConversations[0].unreadLabel, '99+'); assert.equal(render().listConversations[0].lastMessage.senderName, 'alice');
  assert.equal(await render().create('Nhóm mới', ['friend']), 'new');
  assert.equal(render().listConversations.length, 2); assert.equal(calls.find(call => call.method === 'POST').body.tripId, null);
  groups = []; await render().store.refresh(); assert.equal(render().listConversations.length, 0);
});
