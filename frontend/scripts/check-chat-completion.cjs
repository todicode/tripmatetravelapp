const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { hookHarness } = require('./test-helpers/hook-harness.cjs');
const chat = (name, deps, environment) =>
  hookHarness(path.resolve(__dirname, '../src/chat', name), deps, environment);
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('removing a known conversation prunes its route even if the leave screen unmounts first', async () => {
  const api = { friends: async () => [], requests: async () => [] };
  const direct = { conversations: [], listConversations: [], store: {}, onlineUsers: {} };
  let group = {
    groups: [{ id: 'g' }],
    conversations: [{ id: 'g' }],
    listConversations: [],
    store: {},
    realtime: {},
  };
  const h = chat('useChatSession.ts', {
    'react-native': {
      AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    },
    './friendApi': { createFriendApi: () => api },
    './chatImageApi': { createChatImageApi: () => ({}) },
    './useDirectMessaging': { useDirectMessaging: () => direct },
    './useGroupMessaging': { useGroupMessaging: () => group },
  });
  const request = () => {},
    credentials = () => {};
  const render = () => h.render((e) => e.useChatSession(request, 'me', true, credentials));
  render().open('g');
  assert.equal(render().routes.length, 1);
  group = { ...group, groups: [], conversations: [] };
  render();
  assert.equal(render().routes.length, 0);
  render().open('not-loaded-yet');
  render();
  assert.equal(render().routes.length, 1);
  await tick();
  h.unmount();
});

test('measured reads require visible pixels for 500ms, reset offscreen/background and stop on unmount', () => {
  let now = 0,
    timer,
    appListener,
    y = 100;
  const reads = [],
    native = {
      currentState: 'active',
      addEventListener: (_event, fn) => {
        appListener = fn;
        return { remove() {} };
      },
    };
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const h = chat(
    'useMeasuredRead.ts',
    { 'react-native': { AppState: native } },
    {
      Date: Clock,
      setInterval: (fn) => {
        timer = fn;
        return 1;
      },
      clearInterval: () => {
        timer = undefined;
      },
    },
  );
  const refs = h.render((e) => e.useMeasuredRead('3', true, (seq) => reads.push(seq)));
  refs.viewport.current = { measureInWindow: (fn) => fn(0, 0, 400, 600) };
  refs.row.current = { measureInWindow: (fn) => fn(0, y, 300, 100) };
  timer();
  now = 499;
  timer();
  assert.equal(reads.length, 0);
  y = 700;
  timer();
  now = 1000;
  y = 100;
  timer();
  assert.equal(reads.length, 0);
  now = 1499;
  timer();
  assert.equal(reads.length, 0);
  now = 1500;
  timer();
  assert.deepEqual(reads, ['3']);
  native.currentState = 'background';
  appListener('background');
  now = 3000;
  timer();
  assert.equal(reads.length, 1);
  native.currentState = 'active';
  appListener('active');
  timer();
  now = 3499;
  timer();
  assert.equal(reads.length, 1);
  now = 3500;
  timer();
  assert.equal(reads.length, 2);
  h.unmount();
  assert.equal(timer, undefined);
});

test('group creation retains selected server trip and draft after failure', async () => {
  const inputs = [];
  const h = chat('useCreateGroup.ts');
  const create = async (...args) => {
    inputs.push(args);
    if (inputs.length === 1) throw Error('offline');
  };
  const render = () => h.render((e) => e.useCreateGroup(create));
  render().setName(' My group ');
  render().toggle('peer');
  render().setTripId('server-trip');
  await render().create();
  assert.equal(render().tripId, 'server-trip');
  assert.equal(render().error, 'offline');
  await render().create();
  assert.deepEqual(JSON.parse(JSON.stringify(inputs)), [
    ['My group', ['peer'], 'server-trip'],
    ['My group', ['peer'], 'server-trip'],
  ]);
  h.unmount();
});

test('saved list import asks for a catalog city and keeps stops until the planner opens', () => {
  const destination = {
    key: 'hanoi',
    name: 'Hanoi',
    coords: [21, 105],
    hotSpots: [],
    dayPlans: [],
  };
  const h = hookHarness(path.resolve(__dirname, '../src/trips/useTripSetupViewModel.ts'), {
    './TripProvider': { useTrips: () => ({ cities: [{ code: 'HANOI', frontendKey: 'hanoi' }] }) },
    './destinations': { destinations: [destination] },
  });
  const props = { lists: [], onBack() {}, onSave() {}, notify() {} };
  const render = () => h.render((e) => e.useTripSetupViewModel(props));
  render().importList({
    destination: { key: 'saved_custom' },
    places: [{ name: 'Hoan Kiem', lat: 21, lng: 105 }],
  });
  assert.equal(render().searchOpen, true);
  assert.equal(render().step, 0);
  render().choose(destination);
  assert.equal(render().destination.key, 'hanoi');
  render().openPlanner(false);
  assert.equal(render().draft.dayPlans[0].stops[0].name, 'Hoan Kiem');
  render().importList({
    destination,
    places: [{ name: 'Duplicate' }, { name: 'Duplicate' }],
  });
  render().openPlanner(false);
  assert.equal(render().draft, null);
  assert.ok(render().error.includes('đã có'));
  h.unmount();
});
