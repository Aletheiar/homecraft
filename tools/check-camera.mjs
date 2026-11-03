import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:8765/';
const output = resolve('tools/.check/camera');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { views: [], failures: [] };
try {
  for (const view of [
    { name: 'desktop', viewport: { width: 1440, height: 950 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext(view);
    const page = await context.newPage();
    const errors = [], result = { name: view.name, checks: [], errors };
    report.views.push(result);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const touch = view.hasTouch ? await context.newCDPSession(page) : null;
    async function drag(up) {
      const x = Math.round(view.viewport.width * .62);
      const a = Math.round(view.viewport.height * (up ? .62 : .25));
      const b = Math.round(view.viewport.height * (up ? .25 : .62));
      if (touch) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: a }] });
        for (let i = 1; i <= 12; i++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(a + (b - a) * i / 12) }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x, a); await page.mouse.down();
        await page.mouse.move(x, b, { steps: 12 }); await page.mouse.up();
      }
    }
    async function prepare(x = -29, z = 0, yaw = -Math.PI / 2, pitch = .035, distance = 8) {
      await page.evaluate(({ x, z, yaw, pitch, distance }) => {
        const h = __home;
        h.player.teleport(x, z); h.rig.skipIntro(); h.rig.setFirstPerson(false);
        for (let i = 0; i < 180; i++) h.rig.update(1 / 60, h.player);
        h.rig.recenter(h.player); h.rig.set(yaw, pitch, distance); h.rig.update(1 / 60, h.player);
      }, { x, z, yaw, pitch, distance });
    }
    async function snapshot() {
      return page.evaluate(() => {
        const h = __home, c = h.stage.camera, direction = c.getWorldDirection(c.position.clone());
        return { camera: c.position.toArray(), elevation: Math.asin(direction.y), upright: c.position.clone().set(0, 1, 0).applyQuaternion(c.quaternion).y, distance: h.rig.distance, firstPerson: h.rig.firstPerson };
      });
    }
    async function check(name, action) {
      try {
        const detail = await action(); result.checks.push({ name, passed: true, detail });
        console.log(`${view.name}: PASS ${name}`);
      } catch (error) {
        result.checks.push({ name, passed: false, error: error.message });
        report.failures.push(`${view.name}: ${name}: ${error.message}`);
        console.log(`${view.name}: FAIL ${name}: ${error.message}`);
      }
    }
    try {
      await page.goto(url);
      await page.waitForFunction(() => window.__home?.world.pyramid.sceneryReady || window.__home?.world.pyramid.error || window.__homeStartupError, null, { timeout: 60000 });
      assert.equal(await page.evaluate(() => window.__home?.world.pyramid.error || window.__homeStartupError || null), null);
      await page.locator('#return-button').click();
      await check('native upward drag looks up without entering the ground', async () => {
        await prepare(); await drag(true);
        await page.waitForFunction(() => {
          const c = __home.stage.camera;
          return c.getWorldDirection(c.position.clone()).y > .4;
        }, null, { timeout: 15000 });
        const s = await snapshot();
        assert.ok(s.elevation > .4 && s.elevation <= .81, JSON.stringify(s));
        assert.ok(s.camera[1] >= .2 && s.upright > .1, JSON.stringify(s));
        await page.screenshot({ path: `${output}/${view.name}-look-up.png` });
        return s;
      });
      await check('repeated native drags stop before either vertical pole', async () => {
        await drag(true); await drag(true);
        const up = await snapshot();
        assert.ok(up.elevation > .4 && up.elevation <= .81 && up.upright > .1, JSON.stringify(up));
        await drag(false); await drag(false); await drag(false);
        await page.waitForFunction(() => {
          const c = __home.stage.camera;
          return c.getWorldDirection(c.position.clone()).y < -.9;
        }, null, { timeout: 15000 });
        const down = await snapshot();
        assert.ok(down.elevation >= -1.39 && down.upright > .1, JSON.stringify(down));
        return { up, down };
      });
      await check('walking while looking up keeps the camera above the courtyard', async () => {
        await prepare(-29, 0, -Math.PI / 2, -.8);
        await page.keyboard.down('w');
        try {
          await page.waitForFunction(() => __home.player.pos.x > -28.7, null, { timeout: 15000 });
          const s = await snapshot();
          assert.ok(s.camera[1] >= .2 && s.upright > .1, JSON.stringify(s));
          return s;
        } finally { await page.keyboard.up('w'); }
      });
      await check('ground, near plane and lawn stay clear across angles, zooms and courtyard edges', async () => {
        const sweep = await page.evaluate(async () => {
          const h = __home, c = h.stage.camera, { POOL } = await import('/world/layout.js');
          const { poolContains } = await import('/engine/world/pool-regions.js');
          const failures = []; let samples = 0, lawnSamples = 0;
          const points = [[-29, 0], [-38, 0], [38, 0], [0, -38], [0, 38]];
          for (const [x, z] of points) {
            if (!h.nav.canStand(x, z) || poolContains(POOL, x, z)) continue;
            h.player.teleport(x, z); h.rig.recenter(h.player);
            for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
              for (const pitch of [-.035, -.08, -.4, -.8, 1.38]) for (const distance of [3.2, 34]) {
                h.rig.set(yaw, pitch, distance);
                for (let i = 0; i < 120; i++) h.rig.update(1 / 60, h.player);
                c.updateMatrixWorld(true); samples++;
                const points = [c.position.clone()];
                for (const sx of [-1, 1]) for (const sy of [-1, 1]) points.push(c.position.clone().set(sx, sy, -1).unproject(c));
                for (const p of points) {
                  const type = h.world.grid.type(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
                  const lawn = Math.abs(p.x) >= 44.2 || Math.abs(p.z) >= 44.2;
                  if (lawn) lawnSamples++;
                  if (type?.kind === 'opaque' || lawn && p.y <= -.39) failures.push({ x, z, yaw, pitch, distance, point: p.toArray(), type: type?.name, lawn });
                }
              }
            }
          }
          return { samples, lawnSamples, failures };
        });
        assert.ok(sweep.samples >= 160, JSON.stringify(sweep));
        assert.ok(sweep.lawnSamples > 0);
        assert.deepEqual(sweep.failures, []);
        await prepare(-38, 0, -Math.PI / 2, -.08, 34);
        await page.screenshot({ path: `${output}/${view.name}-lawn-edge.png` });
        return sweep;
      });
      await check('V toggles perspective and wheel zoom returns from first person', async () => {
        await prepare();
        await page.keyboard.press('v');
        assert.equal((await snapshot()).firstPerson, true);
        await drag(true);
        await page.waitForFunction(() => {
          const c = __home.stage.camera;
          return c.getWorldDirection(c.position.clone()).y > .4;
        }, null, { timeout: 15000 });
        const first = await snapshot();
        await page.keyboard.press('v');
        assert.equal((await snapshot()).firstPerson, false);
        await page.keyboard.press('v');
        await page.mouse.move(view.viewport.width * .6, view.viewport.height * .5);
        await page.mouse.wheel(0, 400);
        await page.waitForFunction(() => !__home.rig.firstPerson, null, { timeout: 15000 });
        return { first, third: await snapshot() };
      });
      await check('swimming retains the pool-floor clearance when looking up', async () => {
        const pools = await page.evaluate(async () => {
          const h = __home, { POOL, SPAWN } = await import('/world/layout.js');
          const { poolRegion } = await import('/engine/world/pool-regions.js');
          const results = [];
          for (const [index, polygon] of POOL.polygons.entries()) {
            const x = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
            const z = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
            h.player.teleport(SPAWN.x, SPAWN.z); h.extras.update();
            const entered = h.navigate(x, z, POOL.water);
            for (let i = 0; i < 5000; i++) {
              h.player.update(1 / 60, { x: 0, z: 0 }, 0); h.extras.update();
              if (h.player.swimming && !h.player.travelling && poolRegion(POOL, h.player.pos.x, h.player.pos.z) === index) break;
            }
            for (let i = 0; i < 360; i++) { h.player.update(1 / 60, { x: 0, z: 0, down: true }, 0); h.extras.update(); }
            h.rig.setFirstPerson(false); h.rig.recenter(h.player); h.rig.set(.2, -.8, 34);
            for (let i = 0; i < 120; i++) h.rig.update(1 / 60, h.player);
            results.push({ entered, swimming: h.player.swimming, cameraY: h.stage.camera.position.y, minimumY: POOL.bed + .15 });
          }
          return results;
        });
        for (const p of pools) assert.ok(p.entered && p.swimming && p.cameraY >= p.minimumY - 1e-6, JSON.stringify(p));
        await prepare();
        return pools;
      });
      result.stats = await page.evaluate(() => __home.stats());
    } catch (error) { report.failures.push(`${view.name}: ${error.stack}`); }
    finally {
      if (errors.length) report.failures.push(`${view.name}: browser errors: ${errors.join('; ')}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ views: report.views.map(v => ({ name: v.name, checks: v.checks.length, errors: v.errors, stats: v.stats })), failures: report.failures }, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
