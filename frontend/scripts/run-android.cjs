const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const toolchainsDir = path.join(projectRoot, '.expo', 'toolchains');
const localJdks = fs.existsSync(toolchainsDir)
  ? fs.readdirSync(toolchainsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(toolchainsDir, entry.name))
  : [];
const candidates = process.env.ANDROID_JAVA_HOME
  ? [process.env.ANDROID_JAVA_HOME]
  : [
      ...localJdks,
      process.platform === 'win32' && 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot',
      process.env.JAVA_HOME,
    ].filter(Boolean);
const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
const javaHome = candidates.find((candidate) => {
  const binDir = path.join(candidate, 'bin');
  const javac = process.platform === 'win32' ? 'javac.exe' : 'javac';
  if (!fs.existsSync(path.join(binDir, javac))) return false;
  const result = spawnSync(path.join(binDir, javaExecutable), ['-version'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10000,
  });
  return result.status === 0 && /version "17(?:\.|"|\+)/.test(result.stderr + result.stdout);
});

if (!javaHome) {
  console.error('JDK 17 not found. Extract a JDK 17 into .expo/toolchains, or set ANDROID_JAVA_HOME to its installation directory.');
  process.exit(1);
}

// Only Expo and its child processes receive this environment.
const env = { ...process.env, JAVA_HOME: javaHome };
const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'PATH';
env[pathKey] = path.join(javaHome, 'bin') + path.delimiter + (env[pathKey] || '');
console.log(`Android JAVA_HOME: ${javaHome}`);

const expoPackage = require.resolve('expo/package.json');
const expoBin = require(expoPackage).bin.expo;
const result = spawnSync(process.execPath, [
  path.resolve(path.dirname(expoPackage), expoBin),
  'run:android',
  ...process.argv.slice(2),
], { cwd: projectRoot, env, stdio: 'inherit' });

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
