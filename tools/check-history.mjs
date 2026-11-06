import { launchBrowser, activateSceneControl } from './browser.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const base = process.argv[2] || readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim();
const out = 'tools/.check/followup'; mkdirSync(out, { recursive: true });
const results = [];
for (const cached of [false, true]) {
  const browser = await launchBrowser(cached ? { ignoreDefaultArgs: ['--disable-back-forward-cache'] } : {});
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => { window.__historyToken = Math.random(); addEventListener('pageshow', e => { window.__historyPersisted = e.persisted; }); });
    await page.goto(base);
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady);
    await activateSceneControl(page, '#enter-button');
    await page.evaluate(async () => {
      const { HUB_PORTALS } = await import('/world/space-config.js'), gate = HUB_PORTALS.find(g => g.id === 'about');
      const h = __home; h.player.teleport(gate.x + Math.sin(gate.yaw) * 2, gate.z + Math.cos(gate.yaw) * 2); h.rig.recenter(h.player);
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
    const state = await page.evaluate(async () => {
      const { HUB_PORTALS } = await import('/world/space-config.js'), gate = HUB_PORTALS.find(g => g.id === 'about');
      return { x: __home.player.pos.x - gate.x, z: __home.player.pos.z - gate.z, cached: window.__historyPersisted, token: window.__historyToken, charging: document.querySelector('#portal-ripple')?.classList.contains('charging') || false };
    });
    assert.equal(state.cached, cached, JSON.stringify(state));
    assert.equal(state.token === token, cached);
    assert.ok(state.x <= -1.4 && state.x > -3.2 && Math.abs(state.z) < .15, JSON.stringify(state));
    assert.equal(state.charging, false);
    await cross(); await page.waitForURL('**/about/');
    await page.locator('[data-return-hub]').click();
    await page.waitForURL('**?space=hub&return=1');
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady);
    // Back can also revive About after its own Return button latched. It must
    // clear the overlay and allow the same Return button to work again.
    await page.goBack({ waitUntil: 'commit' });
    await page.waitForURL('**/about/', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.__historyPersisted !== 'undefined');
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
