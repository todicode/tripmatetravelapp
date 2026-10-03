const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

function connectedEmulators(output) {
  return [...new Set(output.split(/\r?\n/).flatMap(line => {
    const match = line.trim().match(/^(emulator-\d+)\s+device(?:\s|$)/);
    return match ? [match[1]] : [];
  }))];
}

function resolveAdb(projectRoot, env) {
  const executable = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const sdkRoots = [env.ANDROID_HOME, env.ANDROID_SDK_ROOT];
  const properties = path.join(projectRoot, 'android', 'local.properties');
  if (fs.existsSync(properties)) {
    const sdk = fs.readFileSync(properties, 'utf8').match(/^sdk\.dir=(.+)$/m)?.[1].trim();
    if (sdk) sdkRoots.push(sdk.replace(/\\([\\: ])/g, '$1'));
  }
  const candidate = sdkRoots.filter(Boolean).map(root => path.join(root, 'platform-tools', executable))
    .find(file => fs.existsSync(file));
  return candidate || executable;
}

async function metroReady() {
  try {
    const result = await fetch('http://127.0.0.1:8081/status', { signal: AbortSignal.timeout(1000) });
    return result.ok && (await result.text()).trim() === 'packager-status:running';
  } catch { return false; }
}

async function runAllEmulators({ projectRoot, env, expoCli, run = spawnSync, start = spawn,
  exists = fs.existsSync, ready = metroReady, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const adb = resolveAdb(projectRoot, env);
  const command = (file, args, options = {}) => {
    const result = run(file, args, { cwd: projectRoot, env, windowsHide: true, encoding: 'utf8', ...options });
    if (result.error || result.status !== 0) throw new Error(
      `${file} ${args.join(' ')} failed: ${result.error?.message || result.stderr || result.stdout || result.status}`);
    return result.stdout || '';
  };
  const devices = connectedEmulators(command(adb, ['devices']));
  if (!devices.length) throw new Error('No connected Android emulators. Start an emulator in Android Studio, then run npm run android:all again.');
  for (const serial of devices) {
    if (command(adb, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']).trim() !== '1')
      throw new Error(`${serial} is still booting. Wait for its home screen, then run the command again.`);
  }
  console.log(`Found ${devices.length} emulator(s): ${devices.join(', ')}`);
  // Include every connected emulator's ABI in the single APK, including mixed ARM/x86 setups.
  const architectures = [...new Set(devices.map(serial => command(adb,
    ['-s', serial, 'shell', 'getprop', 'ro.product.cpu.abi']).trim()))];
  if (architectures.some(abi => !['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'].includes(abi)))
    throw new Error(`Unsupported emulator ABI: ${architectures.join(', ')}`);
  console.log('Building one debug APK for all connected emulators...');
  const gradleArgs = ['assembleDebug', `-PreactNativeArchitectures=${architectures.join(',')}`];
  if (process.platform === 'win32') {
    command(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'gradlew.bat', ...gradleArgs],
      { cwd: path.join(projectRoot, 'android'), stdio: 'inherit' });
  } else command('./gradlew', gradleArgs, { cwd: path.join(projectRoot, 'android'), stdio: 'inherit' });
  const apk = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!exists(apk)) throw new Error(`Build completed without the expected APK: ${apk}`);

  let metro;
  let metroError;
  try {
    if (await ready()) console.log('Using the Metro server already running on port 8081.');
    else {
      console.log('Starting shared Metro server on port 8081...');
      metro = start(process.execPath, [expoCli, 'start', '--lan', '--port', '8081'],
        { cwd: projectRoot, env, stdio: 'inherit', windowsHide: true });
      metro.on('error', error => { metroError = error; });
      metro.on('exit', code => { if (code !== 0) metroError = new Error(`Metro exited (${code}).`); });
      let available = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        if (metroError) throw metroError;
        if (await ready()) { available = true; break; }
        await delay(1000);
      }
      if (!available) throw new Error('Metro did not start on port 8081. Check whether another process is using that port.');
    }
    const failures = [];
    for (const serial of devices) {
      try {
        console.log(`Installing and opening TripMate on ${serial}...`);
        command(adb, ['-s', serial, 'install', '-r', apk], { stdio: 'inherit' });
        command(adb, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
        command(adb, ['-s', serial, 'shell', 'am', 'start', '-W', '-n', 'com.tripmate.app/.MainActivity']);
      } catch (error) { failures.push(serial); console.error(error.message); }
    }
    if (failures.length) throw new Error(`Installation or launch failed on: ${failures.join(', ')}`);
    console.log(`TripMate opened on all ${devices.length} emulator(s). Keep Metro running while testing.`);
    if (metro) {
      // Inherited console Ctrl+C stops both this wrapper and the Metro child.
      await new Promise(resolve => metro.once('exit', resolve));
      if (metroError) throw metroError;
    }
  } catch (error) { if (metro && metro.exitCode === null) metro.kill(); throw error; }
}

module.exports = { connectedEmulators, runAllEmulators };
