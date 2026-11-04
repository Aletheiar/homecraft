// Start tools/serve.py first, or pass its URL. These are the standalone site's
// checks; the retired template's listing/mailbox fixtures are not required.
import { readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const base = process.argv[2] || readFileSync('tools/.serve-url', 'utf8').trim();
let ready = false;
for (let i = 0; i < 40; i++) {
  try { ready = (await fetch(base, { signal: AbortSignal.timeout(2000) })).ok; } catch {}
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!ready) throw new Error(`Preview unavailable at ${base}; run python tools/serve.py first.`);

function run(args) {
  console.log(`Running: node ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${args[0]} failed (${signal || code})`)));
  });
}
await run(['tools/check-site.mjs']);
await run(['--test', ...readdirSync('tools').filter(name => name.endsWith('.test.mjs')).sort().map(name => `tools/${name}`)]);
for (const name of ['check', 'check-pyramid', 'check-spaces', 'check-swimming', 'check-followup', 'check-camera', 'check-opening', 'check-history', 'check-shore', 'check-entry-descent', 'check-music', 'check-music-autoplay', 'check-guestbook', 'check-decor', 'check-forecourt']) {
  await run([`tools/${name}.mjs`, base]);
}
console.log('All standalone site checks passed. Rendering warnings remain informational.');
