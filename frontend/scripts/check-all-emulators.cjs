const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { connectedEmulators, runAllEmulators } = require('./run-all-emulators.cjs');

test('discovery excludes physical, offline and unauthorized devices and deduplicates emulators', () => {
  assert.deepEqual(connectedEmulators('List of devices attached\r\nemulator-5554\tdevice\r\nphysical123\tdevice\r\nemulator-5556 offline\nemulator-5558 unauthorized\nemulator-5560 device product:sdk\nemulator-5554 device\n'),
    ['emulator-5554', 'emulator-5560']);
});

function fixture({ devices = 'emulator-5554 device\nemulator-5556 device', boot = '1', failInstall, apk = true } = {}) {
  const calls = [];
  return { calls, options: {
    projectRoot: path.resolve(__dirname, '..'), env: process.env, expoCli: 'expo-cli',
    ready: async () => true, exists: () => apk,
    start: () => { throw new Error('Existing Metro must be reused'); },
    run: (file, args) => {
      calls.push({ file, args });
      if (args[0] === 'devices') return { status: 0, stdout: devices };
      if (args.includes('sys.boot_completed')) return { status: 0, stdout: boot };
      if (args.includes('ro.product.cpu.abi')) return { status: 0, stdout: args[1] === 'emulator-5554' ? 'x86_64' : 'arm64-v8a' };
      if (args.includes('install') && args[1] === failInstall) return { status: 1, stderr: 'INSTALL_FAILED_TEST' };
      return { status: 0, stdout: 'Success' };
    },
  } };
}

test('builds once for mixed architectures, updates and launches every emulator with explicit serials', async () => {
  const { calls, options } = fixture();
  await runAllEmulators(options);
  const builds = calls.filter(call => call.args.includes('assembleDebug'));
  assert.equal(builds.length, 1);
  assert.ok(builds[0].args.includes('-PreactNativeArchitectures=x86_64,arm64-v8a'));
  for (const serial of ['emulator-5554', 'emulator-5556']) {
    assert.ok(calls.some(call => call.args[1] === serial && call.args[2] === 'install' && call.args[3] === '-r'));
    assert.ok(calls.some(call => JSON.stringify(call.args) === JSON.stringify(['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081'])));
    assert.ok(calls.some(call => call.args[1] === serial && call.args.includes('com.tripmate.app/.MainActivity')));
  }
  assert.ok(!calls.some(call => call.args.includes('clear') || call.args.includes('uninstall')));
});

test('no connected emulator or incomplete boot stops before building or installing', async () => {
  for (const config of [{ devices: 'physical123 device\nemulator-5554 offline' }, { boot: '0' }]) {
    const { calls, options } = fixture(config);
    await assert.rejects(runAllEmulators(options), /No connected|still booting/);
    assert.ok(!calls.some(call => call.args.includes('assembleDebug') || call.args.includes('install')));
  }
});

test('failed build or missing APK never installs a stale artifact', async () => {
  const missing = fixture({ apk: false });
  await assert.rejects(runAllEmulators(missing.options), /expected APK/);
  assert.ok(!missing.calls.some(call => call.args.includes('install')));
  const failed = fixture();
  const run = failed.options.run;
  failed.options.run = (file, args) => args.includes('assembleDebug') ? { status: 1, stderr: 'BUILD FAILED' } : run(file, args);
  await assert.rejects(runAllEmulators(failed.options), /BUILD FAILED/);
  assert.ok(!failed.calls.some(call => call.args.includes('install')));
});

test('one failed installation is reported but does not prevent updating the other emulator', async () => {
  const { calls, options } = fixture({ failInstall: 'emulator-5554' });
  await assert.rejects(runAllEmulators(options), /failed on: emulator-5554/);
  assert.ok(calls.some(call => call.args[1] === 'emulator-5556' && call.args.includes('com.tripmate.app/.MainActivity')));
});

test('starts one shared Metro before launching all emulators and preserves the environment', async () => {
  const { calls, options } = fixture();
  const metro = new EventEmitter();
  metro.exitCode = null;
  let probes = 0;
  let starts = 0;
  options.ready = async () => ++probes > 1;
  options.start = (file, args, config) => {
    starts++;
    assert.deepEqual(args, ['expo-cli', 'start', '--lan', '--port', '8081']);
    assert.equal(config.env, options.env);
    return metro;
  };
  const run = options.run;
  options.run = (file, args) => {
    if (args[1] === 'emulator-5556' && args.includes('com.tripmate.app/.MainActivity'))
      setImmediate(() => { metro.exitCode = 0; metro.emit('exit', 0); });
    return run(file, args);
  };
  await runAllEmulators(options);
  assert.equal(starts, 1);
  assert.equal(calls.filter(call => call.args.includes('install')).length, 2);
});

test('Metro startup failure stops installation and cleans up only its own child', async () => {
  const { calls, options } = fixture();
  const metro = new EventEmitter();
  metro.exitCode = null;
  let killed = false;
  metro.kill = () => { killed = true; };
  options.ready = async () => false;
  options.delay = async () => metro.emit('error', new Error('Metro startup failed'));
  options.start = () => metro;
  await assert.rejects(runAllEmulators(options), /Metro startup failed/);
  assert.equal(killed, true);
  assert.ok(!calls.some(call => call.args.includes('install')));
});
