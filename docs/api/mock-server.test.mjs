import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createMockServer, spec } from './mock-server.mjs';
import { deref, validate } from './schema.mjs';
let server, base;
before(async () => {
  server = createMockServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
});
after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });

function requestFor(path, method, op) {
  const query = new URLSearchParams();
  for (const p of op.parameters ?? []) {
    if (p.in === 'path') path = path.replace('{' + p.name + '}', encodeURIComponent(p.schema.example));
    if (p.in === 'query' && p.required) query.set(p.name, String(p.schema.example));
  }
  const options = { method: method.toUpperCase(), headers: { Authorization: 'Bearer mock-access-token' } };
  if (op.requestBody?.content['application/json']) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(op.requestBody.content['application/json'].examples.default.value);
  }
  if (op.requestBody?.content['multipart/form-data']) {
    const body = new FormData();
    body.set('purpose', 'AVATAR');
    body.set('file', new Blob(['mock image bytes'], { type: 'image/png' }), 'demo.png');
    options.body = body;
  }
  return [base + path + (query.size ? '?' + query.toString() : ''), options];
}

for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
  test(method.toUpperCase() + ' ' + path + ' matches declared success', async () => {
    const [url, options] = requestFor(path, method, op);
    const response = await fetch(url, options);
    const expected = Object.keys(op.responses).find(s => /^2\d\d$/.test(s));
    assert.equal(response.status, Number(expected), await (response.status === Number(expected) ? Promise.resolve('') : response.text()));
    const contract = deref(spec, op.responses[expected]);
    assert.ok(response.headers.get('x-request-id'));
    if (expected === '204') { assert.equal(await response.text(), ''); return; }
    if (contract.content['application/json']) {
      const body = await response.json();
      assert.deepEqual(validate(spec, contract.content['application/json'].schema, body), []);
      assert.equal(response.headers.get('x-request-id'), body.requestId);
    } else assert.ok((await response.arrayBuffer()).byteLength > 0);
  });
}

test('auth is required on protected operation', async () => {
  const response = await fetch(base + '/trips');
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'AUTH_REQUIRED');
});
test('registration accepts only the mock OTP 123456', async () => {
  const valid = spec.paths['/auth/register/verify'].post.requestBody.content['application/json'].examples.default.value;
  const response = await fetch(base + '/auth/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, otp: '654321' })
  });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, 'OTP_INVALID');
});
test('registration verification returns the submitted user details', async () => {
  const registration = {
    ...spec.paths['/auth/register'].post.requestBody.content['application/json'].examples.default.value,
    displayName: 'Test User',
    email: 'test.user@example.test',
    phone: '+84987654321',
    password: 'TripMate2026!'
  };
  const registerResponse = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registration)
  });
  assert.equal(registerResponse.status, 202);
  const challenge = await registerResponse.json();
  const verifyResponse = await fetch(base + '/auth/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationId: challenge.data.verificationId, otp: '123456' })
  });
  assert.equal(verifyResponse.status, 201);
  const session = await verifyResponse.json();
  assert.deepEqual({
    displayName: session.data.user.displayName,
    email: session.data.user.email,
    phone: session.data.user.phone
  }, {
    displayName: registration.displayName,
    email: registration.email,
    phone: registration.phone
  });
  assert.equal('password' in session.data.user, false);
});
test('login rejects an incorrect mock password', async () => {
  const valid = spec.paths['/auth/login'].post.requestBody.content['application/json'].examples.default.value;
  const response = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, password: 'Wrong-password-123!' })
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'INVALID_CREDENTIALS');
});
test('login returns the submitted email in the session user', async () => {
  const valid = spec.paths['/auth/login'].post.requestBody.content['application/json'].examples.default.value;
  const email = 'signed.in@example.test';
  const response = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, email })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.user.email, email);
});
test('mock chooses empty and READY/FAILED/stale fixtures', async () => {
  const trip = '00000000-0000-4000-8000-000000000010';
  const draft = '00000000-0000-4000-8000-000000000051';
  const headers = { Authorization: 'Bearer mock', 'X-Mock-Example': 'empty' };
  const empty = await (await fetch(base + '/trips', { headers })).json();
  assert.deepEqual(empty.data.items, []);
  for (const example of ['ready', 'failed', 'stale']) {
    headers['X-Mock-Example'] = example;
    const value = await (await fetch(base + '/trips/' + trip + '/ai-drafts/' + draft, { headers })).json();
    assert.equal(value.data.status, example === 'failed' ? 'FAILED' : 'READY');
    assert.equal(value.data.isStale, example === 'stale');
  }
});
test('409 scenario works without a mutation body and exposes conflict versions', async () => {
  const response = await fetch(base + '/trips/00000000-0000-4000-8000-000000000010/itinerary', {
    method: 'PUT', headers: { 'X-Mock-Status': '409', 'X-Mock-Example': 'VERSION_CONFLICT' }
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error.code, 'VERSION_CONFLICT');
  assert.equal(body.error.context.currentItineraryVersion, '3');
});
test('rejects numeric VND, unknown fields and empty patches', async () => {
  const auth = { Authorization: 'Bearer mock', 'Content-Type': 'application/json' };
  const valid = spec.paths['/trips'].post.requestBody.content['application/json'].examples.default.value;
  for (const body of [{ ...valid, budgetVnd: 5000000 }, { ...valid, ownerId: 'fake' }, { ...valid, budgetVnd: '9223372036854775808' }]) {
    const response = await fetch(base + '/trips', { method:'POST', headers:auth, body:JSON.stringify(body) });
    assert.equal(response.status, 422); await response.arrayBuffer();
  }
  const response = await fetch(base + '/users/me', { method:'PATCH', headers:auth, body:'{}' });
  assert.equal(response.status, 422); await response.arrayBuffer();
});
test('rejects invalid query, duplicate params and mixed chat directions', async () => {
  const headers = { Authorization:'Bearer mock' };
  for (const path of ['/trips?limit=0', '/trips?limit=1&limit=2', '/trips?limit=', '/trips?unknown=true', '/trips/00000000-0000-4000-8000-000000000010/messages?afterSeq=0&beforeSeq=2']) {
    const response = await fetch(base + path, { headers });
    assert.equal(response.status, 400); await response.arrayBuffer();
  }
});
test('malformed JSON, unsupported content, unknown fixture are visible errors', async () => {
  const headers = { Authorization:'Bearer mock', 'Content-Type':'application/json' };
  const malformed = await fetch(base + '/trips', { method:'POST', headers, body:'{' });
  assert.equal(malformed.status, 400); await malformed.arrayBuffer();
  const unsupported = await fetch(base + '/trips', { method:'POST', headers:{...headers,'Content-Type':'text/plain'}, body:'hello' });
  assert.equal(unsupported.status, 415); await unsupported.arrayBuffer();
  const unknown = await fetch(base + '/trips', { headers:{Authorization:'Bearer mock','X-Mock-Example':'does-not-exist'} });
  assert.equal(unknown.status, 400); await unknown.arrayBuffer();
});
test('429 Retry-After and PDF fixture', async () => {
  const limited = await fetch(base + '/trips', { headers:{'X-Mock-Status':'429'} });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '30');
  await limited.arrayBuffer();
  const pdf = await fetch(base + '/media/00000000-0000-4000-8000-000000000040/content', {headers:{Authorization:'Bearer mock',Accept:'application/pdf'}});
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.ok((await pdf.text()).startsWith('%PDF-1.4'));
});
test('CORS preflight has no body', async () => {
  const response = await fetch(base + '/trips', { method:'OPTIONS' });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(await response.text(), '');
});

test('location TTL is usable now and empty catch-up preserves the client cursor', async () => {
  const headers = { Authorization: 'Bearer mock' };
  const trip = '/trips/00000000-0000-4000-8000-000000000010';
  const snapshot = await (await fetch(base + trip + '/locations', { headers })).json();
  assert.ok(Math.abs(Date.parse(snapshot.data.serverTime) - Date.now()) < 5000);
  assert.equal(Date.parse(snapshot.data.items[0].expiresAt) - Date.parse(snapshot.data.items[0].serverReceivedAt), 60000);
  const messages = await (await fetch(base + trip + '/messages?afterSeq=42', {
    headers: { ...headers, 'X-Mock-Example': 'empty' }
  })).json();
  assert.equal(messages.data.pageInfo.nextAfterSeq, '42');
});
