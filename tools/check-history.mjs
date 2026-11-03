import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const base = process.argv[2] || readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim();
const out = 'tools/.check/followup'; mkdirSync(out, { recursive: true });
const results = [];
for (const cached of [false, true]) {
  const browser = await chromium.launch({ channel: 'chrome', ...(cached ? { ignoreDefaultArgs: ['--disable-back-forward-cache'] } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => { window.__historyToken = Math.random(); addEventListener('pageshow', e => { window.__historyPersisted = e.persisted; }); });
    await page.goto(base);
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady);
    await page.locator('#enter-button').click();
    await page.evaluate(() => {
      const h = __home; h.player.teleport(-7, 7); h.rig.recenter(h.player);
      for (let i = 0; i < 100; i++) { h.rig.update(1 / 60, h.player); h.extras.update(1 / 60); }
    });
    const token = await page.evaluate(() => window.__historyToken);
    const cross = () => page.evaluate(() => {
      const h = __home; h.extras.update(1);
      for (let i = 0; i < 65; i++) { h.player.update(1 / 60, { x: 1, z: 0, run: false }, 0); h.extras.update(1 / 60); }
    });
    await cross(); await page.waitForURL('**/about/');
    await page.goBack({ waitUntil: 'commit' });
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady);
    const state = await page.evaluate(() => ({ x: __home.player.pos.x, z: __home.player.pos.z, cached: window.__historyPersisted, token: window.__historyToken, charging: document.querySelector('#portal-ripple')?.classList.contains('charging') || false }));
    assert.equal(state.cached, cached, JSON.stringify(state));
    assert.equal(state.token === token, cached);
    assert.ok(state.x <= -6.45 && state.x > -8 && Math.abs(state.z - 7) < .15, JSON.stringify(state));
    assert.equal(state.charging, false);
    await cross(); await page.waitForURL('**/about/');
    await page.locator('[data-return-hub]').click();
    await page.waitForURL('**?space=hub&return=1');
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady);
    // Back can also revive About after its own Return button latched. It must
    // clear the overlay and allow the same Return button to work again.
    await page.goBack({ waitUntil: 'commit' });
    await page.waitForURL('**/about/', { waitUntil: 'commit' });
    assert.equal(await page.evaluate(() => window.__historyPersisted), cached);
    assert.equal(await page.locator('#portal-ripple.charging').count(), 0);
    await page.locator('[data-return-hub]').click();
    await page.waitForURL('**?space=hub&return=1');
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady);
    results.push({ cached, passed: true, restored: state });
  } finally { await browser.close(); }
}
writeFileSync(`${out}/history-report.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
