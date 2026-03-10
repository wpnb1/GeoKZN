const path = require('path');
const { spawn } = require('child_process');

// Expo CLI writes state into EXPO_HOME (defaults to user profile ~/.expo).
// On some Windows setups (non-ASCII usernames / restricted profiles) this can fail.
// Keep it inside the project by default so `npm run start|lint|web|ios|android` works reliably.
process.env.EXPO_HOME = process.env.EXPO_HOME || path.join(__dirname, '..', '.expo');

// Avoid writing telemetry settings into user profile as well.
process.env.EXPO_NO_TELEMETRY = process.env.EXPO_NO_TELEMETRY || '1';

const expoCli = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'bin',
  'cli',
);

const args = process.argv.slice(2);
const child = spawn(process.execPath, [expoCli, ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number') process.exit(code);
  process.exit(signal ? 1 : 0);
});

