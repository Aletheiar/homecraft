import { launchBrowser } from './browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.argv[2] || 'http://127.0.0.1:8765/');
await page.waitForFunction(() => window.__home?.world.pyramid.sceneryReady || window.__home?.world.pyramid.error || window.__homeStartupError, null, { timeout: 60000 });
assert.equal(await page.evaluate(() => window.__home?.world.pyramid.error || window.__homeStartupError || null), null);
await page.locator('#return-button').click();
const result = await page.evaluate(async () => {
  const h = __home, { POOL, SPAWN } = await import('/world/layout.js');
  const { poolContains, poolRegion, poolShores } = await import('/engine/world/pool-regions.js');
  const empty = { x: 0, z: 0, run: false }, results = [];
  function step(input = empty) { h.player.update(1 / 60, input, 0); h.extras.update(); }
  for (let index = 0; index < POOL.polygons.length; index++) {
    const polygon = POOL.polygons[index];
    const x = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
    const z = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
    h.player.teleport(SPAWN.x, SPAWN.z); h.extras.update();
    const entered = h.navigate(x, z, POOL.water);
    for (let i = 0; i < 5000; i++) {
      step();
      if (h.player.swimming && !h.player.travelling && Math.hypot(h.player.pos.x - x, h.player.pos.z - z) < .3) break;
    }
    const swimming = h.player.swimming, region = poolRegion(POOL, h.player.pos.x, h.player.pos.z);
    for (let i = 0; i < 260; i++) step({ x: 0, z: 0, down: true });
    const depth = h.player.y;
    const leaving = h.player.leavePool(SPAWN.x, SPAWN.z);
    for (let i = 0; i < 5000 && h.player.swimming; i++) step();
    const record = { index, entered, swimming, region, depth, leaving, exited: h.player.mode === 'ground', dry: !poolContains(POOL, h.player.pos.x, h.player.pos.z), walkable: h.nav.canStand(h.player.pos.x, h.player.pos.z), position: [h.player.pos.x, h.player.pos.z] };
    const shores = poolShores(POOL, x, z);
    const shore = shores.find(s => h.nav.canStand(s.x + s.ox * 1.3, s.z + s.oz * 1.3));
    if (shore) {
      h.player.teleport(shore.x + shore.ox * 1.3, shore.z + shore.oz * 1.3); h.extras.update();
      for (let i = 0; i < 150 && !h.player.swimming; i++) step({ x: -shore.ox, z: -shore.oz });
      record.walkedIntoWater = h.player.swimming;
    }
    results.push(record);
  }
  return results;
});
const output = 'tools/.check/pyramid'; mkdirSync(output, { recursive: true });
writeFileSync(`${output}/swimming-report.json`, JSON.stringify({ result, errors }, null, 2));
console.log(JSON.stringify({ result, errors }, null, 2));
await page.evaluate(() => {
  const h = __home;
  for (let i = 0; i < 270; i++) { h.player.update(1 / 60, { x: 0, z: 0, down: true }, 0); h.extras.update(); }
  h.rig.recenter(h.player); h.rig.setFirstPerson(true, 0); h.rig.update(1 / 60, h.player);
});
await page.waitForTimeout(250);
await page.screenshot({ path: `${output}/underwater.png` });
await browser.close();
assert.equal(errors.length, 0);
for (const r of result) {
  assert.ok(r.entered && r.swimming && r.region === r.index, `pool ${r.index}: ${JSON.stringify(r)}`);
  assert.ok(r.depth < -1.5, `pool ${r.index} cannot dive`);
  assert.ok(r.leaving && r.exited && r.dry && r.walkable, `pool ${r.index} cannot climb out`);
  assert.equal(r.walkedIntoWater, true, `pool ${r.index} cannot be entered by walking`);
}
