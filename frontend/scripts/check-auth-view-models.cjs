const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { hookHarness } = require('./test-helpers/hook-harness.cjs');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
function model(name, client, authenticated = () => {}) {
  const h = hookHarness(path.resolve(__dirname, '../src/auth', `use${name}ViewModel.ts`), {
    './authClient': {
      getInstallationId: async () => 'installation',
      getApiErrorMessage: (e) => e.message,
      ...client,
    },
    './useResendCooldown': { useResendCooldown: () => ({ seconds: 0, onError() {} }) },
  });
  return { h, render: () => h.render((e) => e[`use${name}ViewModel`](authenticated, () => {})) };
}
test('login serializes repeated taps before a React render and preserves remember choice', async () => {
  const pending = deferred();
  let writes = 0;
  const accepted = [];
  const d = model(
    'Login',
    {
      authRequest: async () => {
        writes++;
        return pending.promise;
      },
    },
    (...args) => accepted.push(args),
  );
  d.render().setEmail(' qa@example.test ');
  d.render().setPassword('Password123');
  d.render().setRememberMe(false);
  const view = d.render();
  const first = view.submit();
  await view.submit();
  await tick();
  assert.equal(writes, 1);
  pending.resolve({ user: { id: 'qa' } });
  await first;
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0][1], false);
  d.h.unmount();
});
test('a login response arriving after unmount cannot authenticate the next screen', async () => {
  const pending = deferred();
  let accepted = 0;
  const d = model('Login', { authRequest: () => pending.promise }, () => accepted++);
  d.render().setEmail('qa@example.test');
  d.render().setPassword('Password123');
  const submitted = d.render().submit();
  await tick();
  d.h.unmount();
  pending.resolve({});
  await submitted;
  assert.equal(accepted, 0);
});
test('login failure retains credentials and permits an explicit retry', async () => {
  let calls = 0;
  const d = model('Login', {
    authRequest: async () => {
      calls++;
      throw Error('offline');
    },
  });
  d.render().setEmail('qa@example.test');
  d.render().setPassword('Password123');
  await d.render().submit();
  assert.equal(d.render().apiError, 'offline');
  assert.equal(d.render().email, 'qa@example.test');
  assert.equal(d.render().password, 'Password123');
  await d.render().submit();
  assert.equal(calls, 2);
  d.h.unmount();
});
test('late registration challenge is cancelled instead of leaking a pending registration', async () => {
  const pending = deferred();
  const cancelled = [];
  const d = model('Registration', {
    authRequest: (url, body) =>
      url === '/auth/register'
        ? pending.promise
        : Promise.resolve(cancelled.push(body.verificationId)),
  });
  const values = {
    Name: 'QA',
    Email: 'qa@example.test',
    Phone: '0912345678',
    Password: 'Password123',
    ConfirmPassword: 'Password123',
    AgreeTerms: true,
  };
  for (const [key, value] of Object.entries(values)) d.render()[`set${key}`](value);
  const submitted = d.render().submit();
  await tick();
  d.h.unmount();
  pending.resolve({ verificationId: 'late' });
  await submitted;
  await tick();
  assert.deepEqual(cancelled, ['late']);
});
test('registration OTP validation rejects incomplete input without an API call', async () => {
  let writes = 0;
  const d = model('Registration', {
    authRequest: async () => {
      writes++;
    },
  });
  d.render().setOtp('123');
  await d.render().verifyOtp();
  assert.equal(writes, 0);
  assert.match(d.render().apiError, /OTP_INVALID/);
  d.h.unmount();
});
test('password reset step transitions live in the ViewModel and a late success cannot close a new screen', async () => {
  const pending = deferred();
  let closed = 0;
  const d = model(
    'PasswordReset',
    {
      authRequest: (url) =>
        url.endsWith('/request') ? Promise.resolve({ resetId: 'reset' }) : pending.promise,
    },
    () => closed++,
  );
  d.render().setEmail('qa@example.test');
  await d.render().requestCode();
  assert.equal(d.render().step, 'otp');
  d.render().setOtp('123456');
  d.render().continueToPassword();
  assert.equal(d.render().step, 'password');
  d.render().back();
  assert.equal(d.render().step, 'otp');
  d.render().continueToPassword();
  d.render().setNewPassword('Password123');
  d.render().setConfirmPassword('Password123');
  const submitted = d.render().resetPassword();
  d.h.unmount();
  pending.resolve();
  await submitted;
  assert.equal(closed, 0);
});

test('resend cooldown runs a timer only until the deadline, including server backoff and unmount', () => {
  let now = 1000,
    nextId = 0;
  const timers = new Map();
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  class ApiRequestError extends Error {
    constructor(delay) {
      super('Wait');
      this.retryAfterSeconds = delay;
    }
  }
  const h = hookHarness(
    path.resolve(__dirname, '../src/auth/useResendCooldown.ts'),
    { './session': { ApiRequestError } },
    {
      Date: Clock,
      setInterval: (fn) => {
        const id = ++nextId;
        timers.set(id, fn);
        return id;
      },
      clearInterval: (id) => timers.delete(id),
    },
  );
  let deadline;
  const render = () => h.render((e) => e.useResendCooldown(deadline));
  render();
  assert.equal(timers.size, 0);
  deadline = new Date(4000).toISOString();
  render();
  assert.equal(render().seconds, 3);
  assert.equal(timers.size, 1);
  now = 2000;
  for (const tick of [...timers.values()]) tick();
  assert.equal(render().seconds, 2);
  now = 4000;
  for (const tick of [...timers.values()]) tick();
  assert.equal(render().seconds, 0);
  assert.equal(timers.size, 0);
  render().onError(new ApiRequestError(2));
  render();
  assert.equal(render().seconds, 2);
  assert.equal(timers.size, 1);
  h.unmount();
  assert.equal(timers.size, 0);
});
