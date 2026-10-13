const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const file = path.resolve(__dirname, '../src/chat/friendApi.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const { createFriendApi, parseFriendQr } = context.exports;

test('QR scanner accepts only TripMate friend payloads', () => {
  assert.equal(parseFriendQr('tripmate://friend/tm-abc12345'), 'TM-ABC12345');
  assert.equal(parseFriendQr('https://example.com/friend/abc123'), null);
  assert.equal(parseFriendQr('tripmate://friend/abc/extra'), null);
});

test('friend adapter paginates, maps incoming/outgoing and preserves request methods', async () => {
  const calls = [];
  const user = { id: 'user-1', displayName: 'An', avatarMediaId: null };
  const other = { id: 'user-2', displayName: 'Bình', avatarMediaId: null };
  const request = async (url, body, method) => {
    calls.push({ url, body, method });
    if (url.startsWith('/friends?')) return url.includes('cursor=next') ?
      { items: [{ user: other }], pageInfo: { hasMore: false, nextCursor: null } } :
      { items: [{ user }], pageInfo: { hasMore: true, nextCursor: 'next' } };
    if (url.includes('direction=INCOMING')) return { items: [{ id: 'in', sender: other, recipient: user, message: 'Chào bạn' }], pageInfo: { hasMore: false, nextCursor: null } };
    if (url.includes('direction=OUTGOING')) return { items: [{ id: 'out', sender: user, recipient: other, message: null }], pageInfo: { hasMore: false, nextCursor: null } };
    return undefined;
  };
  const api = createFriendApi(request);
  const friends = await api.friends();
  assert.deepEqual(Array.from(friends, item => item.id), ['user-1', 'user-2']);
  const pending = await api.requests();
  assert.deepEqual(Array.from(pending, item => [item.id, item.friend.id, item.direction]), [['in', 'user-2', 'received'], ['out', 'user-2', 'sent']]);
  await api.lookupPhone('+84912345678');
  await api.lookupCode('ABC123');
  await api.send('user-2', '  Xin chào  ');
  await api.resolve('in', 'accept');
  await api.remove('user-2');
  assert.ok(calls.some(call => call.url === '/users/lookup-by-phone?phone=%2B84912345678'));
  assert.ok(calls.some(call => call.url === '/users/lookup?friendCode=ABC123'));
  assert.ok(calls.some(call => call.url === '/friend-requests' && call.method === 'POST' && call.body.message === 'Xin chào'));
  assert.ok(calls.some(call => call.url === '/friend-requests/in/accept' && call.method === 'POST'));
  assert.ok(calls.some(call => call.url === '/friends/user-2' && call.method === 'DELETE'));
});

test('gallery scan finds a QR near the image edge without user cropping and removes temporary crops', async () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/chat/scanFriendQrImage.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const scanned = [];
  const deleted = [];
  let created = 0;
  let released = 0;
  const qr = 'tripmate://friend/TM-ABC12345';
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    require: name => {
      if (name === './friendApi') return { parseFriendQr };
      if (name === 'expo-camera') return { scanFromURLAsync: async uri => {
        scanned.push(uri);
        if (uri === 'original') return [];
        const [, x, y, side] = uri.split(':').map(Number);
        return x <= 900 && x + side >= 900 && y <= 1700 && y + side >= 1700 ? [{ data: qr }] : [];
      } };
      if (name === 'expo-image-manipulator') return {
        SaveFormat: { PNG: 'png' },
        ImageManipulator: { manipulate: () => {
          let region;
          return {
            crop: value => { region = value; },
            renderAsync: async () => ({
              saveAsync: async () => {
                created++;
                return { uri: `crop:${region.originX}:${region.originY}:${region.width}` };
              },
              release: () => { released++; },
            }),
            release: () => { released++; },
          };
        } },
      };
      if (name === 'expo-file-system/legacy') return { deleteAsync: async uri => { deleted.push(uri); } };
      throw Error(`Unexpected import: ${name}`);
    },
  });
  const found = await module.exports.scanFriendQrImage({ uri: 'original', width: 1000, height: 1800 });
  assert.equal(found, qr);
  assert.equal(scanned[0], 'original');
  assert.ok(created > 0);
  assert.equal(deleted.length, created);
  assert.equal(released, created * 2);
});
