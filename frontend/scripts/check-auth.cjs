const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(name, globals = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/auth', name), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const context = { exports: {}, ...globals };
  vm.runInNewContext(compiled.outputText, context);
  return context.exports;
}
const { SessionManager, ApiRequestError } = load('session.ts');
const { passwordError } = load('password.ts');
const initialTime = Date.now();
const session = (id = 1) => ({ accessToken: `access-${id}`, refreshToken: `refresh-${id}`, expiresIn: 900,
  refreshExpiresAt: new Date(initialTime + 86400000).toISOString(), tokenType: 'Bearer', deviceId: 'device',
  user: { id: 'user', displayName: 'An', email: 'an@example.test' } });
function fixture(transport) {
  let stored = null, current = null, now = initialTime;
  const manager = new SessionManager(transport, {
    read: async () => stored, write: async value => { stored = value; }, remove: async () => { stored = null; },
  }, value => { current = value; }, () => now);
  return { manager, saved: () => stored, current: () => current,
    setSaved: value => { stored = value; }, advance: ms => { now += ms; } };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const unauthorized = () => new ApiRequestError('UNAUTHORIZED', 'Expired', 401);

test('remember me stores only refresh credentials; unchecked removes them', async () => {
  const f = fixture(async () => {});
  await f.manager.accept(session());
  assert.deepEqual(JSON.parse(f.saved()), { refreshToken: 'refresh-1', refreshExpiresAt: session().refreshExpiresAt });
  await f.manager.accept(session(2), false);
  assert.equal(f.saved(), null);
  assert.equal(f.current().accessToken, 'access-2');
});

test('restoring twice shares a single rotation and persists the new credential', async () => {
  const pending = deferred(); let calls = 0;
  const f = fixture(async (path, body) => {
    calls++; assert.equal(path, '/auth/refresh'); assert.equal(body.refreshToken, 'refresh-1'); return pending.promise;
  });
  f.setSaved(JSON.stringify({ refreshToken: 'refresh-1', refreshExpiresAt: session().refreshExpiresAt }));
  const first = f.manager.restore(), second = f.manager.restore();
  pending.resolve(session(2)); await Promise.all([first, second]);
  assert.equal(calls, 1); assert.equal(f.current().accessToken, 'access-2');
  assert.equal(JSON.parse(f.saved()).refreshToken, 'refresh-2');
});

test('offline startup retains saved credentials for retry', async () => {
  const f = fixture(async () => { throw new ApiRequestError('NETWORK_ERROR', 'Offline', 0); });
  const saved = JSON.stringify({ refreshToken: 'refresh-1', refreshExpiresAt: session().refreshExpiresAt });
  f.setSaved(saved); await assert.rejects(f.manager.restore());
  assert.equal(f.saved(), saved); assert.equal(f.current(), null);
});

test('invalid or expired saved credentials clear without entering the app', async () => {
  for (const raw of ['broken json', JSON.stringify({ refreshToken: 'x', refreshExpiresAt: '2000-01-01' })]) {
    const f = fixture(async () => { assert.fail('must not refresh'); });
    f.setSaved(raw); await f.manager.restore(); assert.equal(f.saved(), null);
  }
  const f = fixture(async () => { throw unauthorized(); });
  f.setSaved(JSON.stringify({ refreshToken: 'x', refreshExpiresAt: session().refreshExpiresAt }));
  await f.manager.restore(); assert.equal(f.saved(), null);
});

test('parallel requests near expiry share one refresh', async () => {
  let rotations = 0; const pending = deferred();
  const f = fixture(async (path, body, token) => {
    if (path === '/auth/refresh') { rotations++; return pending.promise; }
    assert.equal(token, 'access-2'); return 'ok';
  });
  await f.manager.accept(session()); f.advance(880000);
  const requests = [f.manager.request('/users/me'), f.manager.request('/users/me')];
  pending.resolve(session(2)); assert.deepEqual(await Promise.all(requests), ['ok', 'ok']);
  assert.equal(rotations, 1);
});

test('401 refreshes and retries once; second 401 clears the session', async () => {
  let calls = 0, rotations = 0;
  const f = fixture(async path => {
    if (path === '/auth/refresh') { rotations++; return session(2); }
    calls++; throw unauthorized();
  });
  await f.manager.accept(session()); await assert.rejects(f.manager.request('/private'));
  assert.equal(calls, 2); assert.equal(rotations, 1);
  assert.equal(f.saved(), null); assert.equal(f.current(), null);
});

test('successful 401 recovery uses the new token', async () => {
  const f = fixture(async (path, body, token) => {
    if (path === '/auth/refresh') return session(2);
    if (token === 'access-1') throw unauthorized();
    return token;
  });
  await f.manager.accept(session());
  assert.equal(await f.manager.request('/private'), 'access-2');
});

test('network and server errors do not retry a protected mutation', async () => {
  for (const status of [0, 403, 429, 500]) {
    let calls = 0;
    const f = fixture(async () => { calls++; throw new ApiRequestError('FAIL', 'Error', status); });
    await f.manager.accept(session()); await assert.rejects(f.manager.request('/mutation', {}));
    assert.equal(calls, 1); assert.ok(f.current());
  }
});

test('a late refresh cannot resurrect a cleared session', async () => {
  const pending = deferred();
  const f = fixture(async () => pending.promise);
  await f.manager.accept(session()); f.advance(880000);
  const refresh = f.manager.ensureFresh();
  await f.manager.clear(); pending.resolve(session(2));
  await assert.rejects(refresh); assert.equal(f.current(), null); assert.equal(f.saved(), null);
});

test('logout refreshes expired access token and removes local credentials', async () => {
  const paths = [];
  const f = fixture(async (path, body, token) => {
    paths.push(path);
    if (path === '/auth/refresh') return session(2);
    assert.equal(token, 'access-2');
  });
  await f.manager.accept(session()); f.advance(900000); await f.manager.logout();
  assert.deepEqual(paths, ['/auth/refresh', '/auth/logout']);
  assert.equal(f.saved(), null); assert.equal(f.current(), null);
});

test('offline logout clears local state while reporting revocation failure', async () => {
  const f = fixture(async () => { throw new ApiRequestError('NETWORK_ERROR', 'Offline', 0); });
  await f.manager.accept(session()); await assert.rejects(f.manager.logout());
  assert.equal(f.saved(), null); assert.equal(f.current(), null);
});

test('unremembered sessions rotate in memory without persisting credentials', async () => {
  const f = fixture(async () => session(2));
  await f.manager.accept(session(), false); f.advance(880000); await f.manager.ensureFresh();
  assert.equal(f.saved(), null); assert.equal(f.current().accessToken, 'access-2');
});

test('password policy counts UTF-8 bytes including Vietnamese and emoji', () => {
  assert.equal(passwordError('ệ'.repeat(24)), null);
  assert.ok(passwordError('ệ'.repeat(25)));
  assert.equal(passwordError('a'.repeat(72)), null);
  assert.ok(passwordError('a'.repeat(73)));
  assert.equal(passwordError('😀'.repeat(18)), null);
  assert.ok(passwordError('😀'.repeat(19)));
  assert.ok(passwordError('\ud800'.repeat(8)));
  assert.ok(passwordError('short'));
});

test('refresh observes Retry-After without dropping credentials', async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; throw new ApiRequestError('RATE_LIMITED', 'Wait', 429, 60); });
  await f.manager.accept(session()); f.advance(880000);
  await assert.rejects(f.manager.ensureFresh());
  f.advance(30000); await assert.rejects(f.manager.ensureFresh());
  assert.equal(calls, 1); assert.ok(f.saved());
  f.advance(31000); await assert.rejects(f.manager.ensureFresh()); assert.equal(calls, 2);
});

test('late protected response is discarded after account switch', async () => {
  const pending = deferred(); const f = fixture(async () => pending.promise);
  await f.manager.accept(session()); const request = f.manager.request('/private');
  await Promise.resolve(); await f.manager.accept(session(2)); pending.resolve('old private data');
  await assert.rejects(request); assert.equal(f.current().accessToken, 'access-2');
});

function apiWith(response) {
  return load('api.ts', { require: () => ({ ApiRequestError }), fetch: async () => response,
    AbortController, setTimeout, clearTimeout }).apiRequest;
}

test('HTTP transport sends explicit PATCH while preserving GET and POST defaults', async () => {
  const methods = [];
  const api = load('api.ts', { require: () => ({ ApiRequestError }), AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      methods.push(options.method);
      assert.equal(options.headers.Authorization, 'Bearer token');
      if (options.method === 'PATCH') assert.equal(JSON.parse(options.body).displayName, 'Bình');
      return new Response(JSON.stringify({ data: {} }));
    },
  }).apiRequest;
  await api('https://example.test', 'API', '/users/me', undefined, 'token');
  await api('https://example.test', 'API', '/auth/logout', {}, 'token');
  await api('https://example.test', 'API', '/users/me', { displayName: 'Bình' }, 'token', 'PATCH');
  assert.deepEqual(methods, ['GET', 'POST', 'PATCH']);
});

test('API adapter handles empty 204 and preserves HTTP status from an HTML error', async () => {
  assert.equal(await apiWith(new Response(null, { status: 204 }))('https://example.test', 'API', '/logout', {}), undefined);
  await assert.rejects(apiWith(new Response('<html>Error</html>', { status: 503 }))('https://example.test', 'API', '/private'),
    error => error.status === 503 && error.code === 'REQUEST_FAILED');
});

test('multipart transport lets native fetch set boundary and authenticates binary downloads', async () => {
  class NativeFormData { entries = []; append(key, value) { this.entries.push([key, value]); } }
  const api = load('api.ts', { require: () => ({ ApiRequestError }), AbortController, setTimeout, clearTimeout, FormData: NativeFormData,
    fetch: async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer token');
      if (url.endsWith('/media')) {
        assert.equal(options.headers['Content-Type'], undefined);
        assert.equal(options.body.entries[0][0], 'purpose'); assert.equal(options.body.entries[1][0], 'file');
        return new Response(JSON.stringify({ data: { id: 'media' } }));
      }
      return new Response('binary', { headers: { 'Content-Type': 'image/jpeg' } });
    },
  }).apiRequest;
  await api('https://example.test', 'API', '/media', { purpose: 'AVATAR' }, 'token', 'POST', { file: { uri: 'file://avatar.jpg', name: 'avatar.jpg', type: 'image/jpeg' } });
  const blob = await api('https://example.test', 'API', '/media/id/thumbnail', undefined, 'token', 'GET', { responseType: 'blob' });
  assert.equal(await blob.text(), 'binary');
});

test('API adapter reads retry hints and rejects malformed success payloads', async () => {
  const response = new Response(JSON.stringify({ error: { code: 'OTP_RESEND_TOO_SOON', context: { retryAfterSeconds: 42 } } }), { status: 429 });
  await assert.rejects(apiWith(response)('https://example.test', 'API', '/resend', {}), error => error.retryAfterSeconds === 42);
  for (const body of ['{}', '"not an envelope"', '<html>Wrong server</html>']) {
    await assert.rejects(apiWith(new Response(body))('https://example.test', 'API', '/private'), error => error.code === 'INVALID_RESPONSE');
  }
});
