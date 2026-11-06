// Regression: walking along the pyramid apron must not trap the visitor
// between an outside ground source and the polygon pool's shore.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launchBrowser, activateSceneControl } from './browser.mjs';

const base = process.argv[2] || readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim();
const out = 'tools/.check/shore';
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const report = { views: [], failures: [] };
try {
  for (const view of [
    { name: 'desktop', viewport: { width: 1280, height: 800 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext(view), page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.__homeStartupError || window.__home?.world.pyramid?.sceneryReady, null, { timeout: 60000 });
    assert.equal(await page.evaluate(() => window.__homeStartupError || null), null);
    await activateSceneControl(page, '#return-button');
    const checks = await page.evaluate(() => {
      const h = __home, result = [];
      const tick = (input, frames) => {
        for (let i = 0; i < frames; i++) { h.player.update(1 / 60, input, 0); h.extras.update(1 / 60); }
      };
      const position = () => ({ x: h.player.pos.x, z: h.player.pos.z, y: h.player.y, mode: h.player.mode, island: h.player.island });
      for (const [side, x, z, alongX, alongZ, waterX, waterZ] of [
        ['south-east', 16, 18.3, -1, 0, 0, 1],
        ['south-west', -16, 18.3, 1, 0, 0, 1],
        ['north-east', 16, -18.3, -1, 0, 0, -1],
        ['north-west', -16, -18.3, 1, 0, 0, -1],
        ['east-south', 18.3, 16, 0, -1, 1, 0],
        ['east-north', 18.3, -16, 0, 1, 1, 0],
      ]) {
        h.player.teleport(x, z); h.extras.update();
        // Reach the raised apron by walking, rather than teleporting onto
        // the ordinary navigation grid directly beside the water.
        tick({ x: alongX, z: alongZ }, 65);
        const before = position();
        tick({ x: waterX, z: waterZ }, 180);
        const after = position();
        result.push({ side, before, after, passed: before.island === 'pyramid' && after.mode === 'swim' && after.island === null });
      }
      // A fall above the same shoreline must remain a fall, rather than
      // starting a short deck dive several metres above the water.
      h.player.teleport(38.5, 38.5); h.extras.update(); h.player.startFlying();
      tick({ x: 0, z: 0, up: true }, 100);
      h.player.pos.x = 0; h.player.pos.z = 18.4;
      h.player.stopFlying();
      const before = position();
      tick({ x: 0, z: 1 }, 1);
      const after = position();
      result.push({ side: 'high-fall', before, after,
        passed: before.island === 'pyramid' && before.y > 2 && after.mode === 'air' });
      return result;
    });
    // Exercise the actual input handler too: the manual route above should
    // hand off to swimming when the visitor holds the southward key.
    await page.evaluate(() => {
      const h = __home;
      h.player.teleport(16, 18.3); h.extras.update();
      for (let i = 0; i < 65; i++) { h.player.update(1 / 60, { x: -1, z: 0 }, 0); h.extras.update(1 / 60); }
      h.rig.recenter(h.player); h.rig.set(0, .4, 6);
    });
    await page.keyboard.down('s');
    try { await page.waitForFunction(() => __home.player.swimming, null, { timeout: 5000 }); }
    finally { await page.keyboard.up('s'); }
    checks.push({ side: 'native-keyboard', passed: true });
    await page.evaluate(() => { __home.rig.recenter(__home.player); __home.rig.set(.1, .5, 6); });
    await page.waitForFunction(() => __home.player.swimming && __home.player.y < -.5);
    await page.screenshot({ path: `${out}/${view.name}-in-water.png` });
    report.views.push({ name: view.name, checks, errors });
    for (const check of checks) if (!check.passed) report.failures.push(`${view.name}: ${check.side}: ${JSON.stringify(check)}`);
    report.failures.push(...errors.map(error => `${view.name}: ${error}`));
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
assert.equal(report.failures.length, 0, report.failures.join('\n'));
