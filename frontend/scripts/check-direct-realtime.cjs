const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function fixture({ credentials, ready } = {}) {
  const timers = new Map(); let timerId = 0;
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/chat/directRealtime.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: () => ({ Client: class {} }), BigInt,
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(compiled, context);
  const clients = [], events = [], statuses = [], requestedRefreshes = [];
  const connection = new context.exports.DirectRealtimeConnection(async refresh => {
    requestedRefreshes.push(refresh);
    return credentials ? credentials(refresh) : { url: 'ws://localhost:8080/ws', accessToken: 'private-token' };
  }, event => events.push(event), ready || (async () => {}), status => statuses.push(status), config => {
    const client = { config, active: false, subscriptions: [], activate() { this.active = true; },
      deactivate() { this.active = false; config.onWebSocketClose(); return Promise.resolve(); },
      subscribe(destination, receive) { this.subscriptions.push({ destination, receive }); } };
    clients.push(client); return client;
  });
  return { ...context.exports, connection, timers, clients, events, statuses, requestedRefreshes };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const event = { eventId: 'event-1', type: 'direct.message.created', schemaVersion: 1, occurredAt: '2026-10-03T00:00:00Z',
  data: { id: 'message-1', conversationId: 'conversation-1', seq: '9007199254740993', sender: { id: 'peer', displayName: 'Peer' },
    clientMessageId: 'client-1', body: 'Xin chào', createdAt: '2026-10-03T00:00:00Z' } };

test('parses only supported private events and preserves bigint sequences', () => {
  const f = fixture();
  assert.equal(f.parseDirectEvent(JSON.stringify(event)).data.seq, '9007199254740993');
  for (const value of [{ ...event, schemaVersion: 2 }, { ...event, type: 'chat.message.created' },
    { ...event, data: { ...event.data, seq: 1 } }, { ...event, data: { ...event.data, seq: '9223372036854775808' } },
    { ...event, data: { ...event.data, sender: null } }]) assert.equal(f.parseDirectEvent(JSON.stringify(value)), null);
  assert.equal(f.parseDirectEvent('invalid JSON'), null);
});

test('subscribes before REST catch-up, buffers incoming events and authenticates without a query token', async () => {
  let finish;
  const f = fixture({ ready: () => new Promise(resolve => { finish = resolve; }) });
  f.connection.start(); f.connection.start(); await settle();
  assert.equal(f.clients.length, 1);
  const client = f.clients[0];
  assert.equal(client.config.connectHeaders.Authorization, 'Bearer private-token');
  assert.equal(client.config.brokerURL.includes('private-token'), false);
  assert.equal(client.config.forceBinaryWSFrames, true);
  client.config.onConnect();
  assert.equal(client.subscriptions[0].destination, '/user/queue/events');
  client.subscriptions[0].receive({ body: JSON.stringify(event) });
  assert.equal(f.events.length, 0);
  finish(); await settle();
  assert.equal(f.events.length, 1); assert.equal(f.statuses.at(-1), true);
  f.connection.stop();
});

test('disconnect uses bounded backoff and ignores late catch-up and frames from the old connection', async () => {
  let finish;
  const f = fixture({ ready: () => new Promise(resolve => { finish = resolve; }) });
  f.connection.start(); await settle();
  const first = f.clients[0]; first.config.onConnect(); first.config.onWebSocketClose();
  const timer = [...f.timers.values()][0]; assert.ok(timer.ms >= 800 && timer.ms <= 1200);
  finish(); await settle();
  first.subscriptions[0].receive({ body: JSON.stringify(event) });
  assert.equal(f.events.length, 0); assert.equal(f.statuses.at(-1), false);
  f.timers.clear(); timer.fn(); await settle();
  assert.equal(f.clients.length, 2); f.connection.stop(); assert.equal(f.timers.size, 0);
});

test('auth error forces one shared-session refresh, then reconnects without retrying the same rejected token forever', async () => {
  const f = fixture(); f.connection.start(); await settle();
  f.clients[0].config.onStompError({ body: '{"code":"AUTH_REQUIRED"}' });
  let timer = [...f.timers.values()][0]; f.timers.clear(); timer.fn(); await settle();
  assert.equal(f.requestedRefreshes[1], true);
  f.clients[1].config.onStompError({ body: '{"code":"AUTH_REQUIRED"}' });
  timer = [...f.timers.values()][0]; f.timers.clear(); timer.fn(); await settle();
  assert.equal(f.requestedRefreshes[2], false);
  f.connection.stop();
});

test('stopping during credential refresh cannot open a socket or revive a previous account', async () => {
  let finish;
  const f = fixture({ credentials: () => new Promise(resolve => { finish = resolve; }) });
  f.connection.start(); await settle(); f.connection.stop();
  finish({ url: 'ws://localhost/ws', accessToken: 'old-token' }); await settle();
  assert.equal(f.clients.length, 0); assert.equal(f.timers.size, 0);
});
