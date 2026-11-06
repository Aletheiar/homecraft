import { finishOpening, launchBrowser, activateSceneControl } from './browser.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:8765/';
const output = resolve('tools/.check/pyramid');
mkdirSync(output, { recursive: true });
const browser = await launchBrowser();
const report = { views: [], failures: [] };
for (const view of [{ name: 'desktop', viewport: { width: 1440, height: 950 } }, { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
  const context = await browser.newContext(view);
  const page = await context.newPage();
  // This suite checks the courtyard. External comments have their own checks.
  await page.route('https://giscus.app/client.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__home?.world.pyramid.sceneryReady || window.__home?.world.pyramid.error || window.__homeStartupError, null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__home?.world.pyramid.error || window.__homeStartupError || null), null);
  await finishOpening(page);
  await page.waitForTimeout(1500);
  const result = { name: view.name, checks: [], errors };
  async function check(name, action) {
    try { const detail = await action(); result.checks.push({ name, passed: true, detail }); }
    catch (error) { result.checks.push({ name, passed: false, error: error.message }); report.failures.push(`${view.name}: ${name}: ${error.message}`); }
  }
  await check('spawn is on dry walkable ground', async () => {
    assert.equal(await page.evaluate(() => __home.nav.canStand(__home.player.pos.x, __home.player.pos.z)), true);
  });
  await check('all navigation controls remain visible after the introduction', async () => {
    assert.equal(await page.locator('#hotbar').isVisible(), true);
    assert.equal(await page.evaluate(() => __home.rig.introActive), false);
  });
  await page.screenshot({ path: `${output}/${view.name}-courtyard.png` });
  await check('original west entrance admits a complete walking route', async () => {
    const traversal = await page.evaluate(() => {
      const h = __home, empty = { x: 0, z: 0, run: false };
      h.player.teleport(-29, 0);
      const started = h.player.goTo(-9, 0);
      for (let i = 0; i < 1200 && h.player.travelling; i++) h.player.update(1 / 60, empty, 0);
      return { started, x: h.player.pos.x, z: h.player.pos.z, mode: h.player.mode };
    });
    assert.equal(traversal.started, true);
    assert.ok(Math.hypot(traversal.x + 9, traversal.z) < .3, JSON.stringify(traversal));
    assert.equal(traversal.mode, 'ground');
    return traversal;
  });
  await activateSceneControl(page, '#enter-button');
  await page.waitForFunction(() => {
    const h = __home, c = h.stage.camera.position;
    return h.rig.firstPerson && Math.hypot(c.x - h.player.pos.x, c.z - h.player.pos.z) < .1 && c.y < h.player.y + 2;
  }, null, { timeout: 30000 });
  await page.screenshot({ path: `${output}/${view.name}-interior.png` });
  for (const id of ['miku', 'plaza', 'observatory']) {
    await check(`physical station ${id} ignores F and remains readable by pointer navigation`, async () => {
      await page.evaluate(async id => {
        const { STATIONS } = await import('/world/layout.js');
        const station = STATIONS.find(s => s.id === id);
        __home.player.teleport(...station.at); __home.rig.skipIntro(); __home.rig.recenter(__home.player);
      }, id);
      await page.keyboard.press('f');
      assert.equal(await page.locator('#panel').evaluate(el => el.open), false);
      assert.equal(await page.locator('#prompt').isVisible(), false);
      await page.evaluate(id => __home.go(id), id);
      assert.equal(await page.locator('#panel').getAttribute('data-station'), id);
      assert.equal(await page.locator('#panel').evaluate(el => el.open), true);
      const background = await page.locator('#panel').evaluate(el => getComputedStyle(el).backgroundColor);
      assert.notEqual(background, 'rgba(0, 0, 0, 0)');
    });
    await page.locator('#panel .close').click().catch(() => {});
  }
  for (const id of ['welcome', 'blog']) {
    await check(`Dock card ${id} remains readable`, async () => {
      await page.locator(`#hotbar [data-station="${id}"]`).click();
      assert.equal(await page.locator('#panel').getAttribute('data-station'), id);
      assert.equal(await page.locator('#panel').evaluate(el => el.open), true);
      if (id === 'blog') await page.screenshot({ path: `${output}/${view.name}-articles.png` });
      await page.locator('#panel .close').click();
    });
  }
  for (const id of ['writing', 'friends', 'about']) {
    await check(`spatial approach ${id} remains available independently of content navigation`, async () => {
      await page.evaluate(id => __home.go(id), id);
      assert.equal(await page.locator('#panel').evaluate(el => el.open), false);
      assert.equal(new URL(page.url()).pathname, '/');
      assert.ok(await page.evaluate(async id => {
        const s = (await import('/world/layout.js')).STATIONS.find(s => s.id === id);
        return Math.hypot(__home.player.pos.x - s.at[0], __home.player.pos.z - s.at[1]) < .15;
      }, id));
    });
  }
  await check('walking and flying cannot leave the courtyard or cross its ceiling', async () => {
    const positions = await page.evaluate(() => {
      const h = __home;
      h.player.teleport(38.5, 38.5); h.extras.update();
      for (let i = 0; i < 400; i++) { h.player.update(1 / 60, { x: 1, z: 1, run: true }, 0); h.extras.update(); }
      const walking = { x: h.player.pos.x, z: h.player.pos.z };
      h.player.startFlying();
      for (let i = 0; i < 600; i++) { h.player.update(1 / 60, { x: 1, z: 1, run: true, up: true }, 0); h.extras.update(); }
      return { walking, flying: { x: h.player.pos.x, z: h.player.pos.z, y: h.player.y } };
    });
    for (const p of [positions.walking, positions.flying]) { assert.ok(Math.abs(p.x) < 39.2); assert.ok(Math.abs(p.z) < 39.2); }
    assert.ok(positions.flying.y > 30 && positions.flying.y < 36.2, JSON.stringify(positions));
    return positions;
  });
  await check('outside clicks are not valid walking destinations', async () => {
    assert.equal(await page.evaluate(() => { __home.player.teleport(-9, 0); return __home.player.goTo(70, 70); }), false);
  });
  await check('ending flight above the roof lands on the glass roof', async () => {
    const position = await page.evaluate(() => {
      const h = __home;
      h.player.teleport(38.5, 38.5); h.extras.update(); h.player.startFlying();
      for (let i = 0; i < 260; i++) { h.player.update(1 / 60, { x: 0, z: 0, up: true }, 0); h.extras.update(); }
      // This is a reachable aerial position above the roof.
      h.player.pos.x = .5; h.player.pos.z = .5;
      h.player.stopFlying();
      for (let i = 0; i < 300; i++) { h.player.update(1 / 60, { x: 0, z: 0 }, 0); h.extras.update(); }
      return { x: h.player.pos.x, z: h.player.pos.z, y: h.player.y, island: h.player.island };
    });
    assert.ok(position.y > 23.5, JSON.stringify(position));
    assert.ok(Math.max(Math.abs(position.x), Math.abs(position.z)) < 2, JSON.stringify(position));
    return position;
  });
  await check('a visitor walks off the plinth and back down the glass', async () => {
    const down = await page.evaluate(() => {
      const h = __home;
      h.player.teleport(38.5, 38.5); h.extras.update(); h.player.startFlying();
      for (let i = 0; i < 260; i++) { h.player.update(1 / 60, { x: 0, z: 0, up: true }, 0); h.extras.update(); }
      // Fly over the apex and settle onto the andesite plinth, as a visitor does.
      h.player.pos.x = .2; h.player.pos.z = .2;
      h.player.stopFlying();
      for (let i = 0; i < 60; i++) { h.player.update(1 / 60, { x: 0, z: 0, down: true }, 0); h.extras.update(); }
      const top = h.player.y;
      // Walk south: off the plinth, then down the slope.
      let off = top;
      for (let i = 0; i < 45; i++) { h.player.update(1 / 60, { x: 0, z: -1, run: true }, 0); h.extras.update(); off = Math.min(off, h.player.y); }
      const mid = { y: h.player.y, island: h.player.island, mode: h.player.mode };
      // Stop on the lower slope: continuing past the apron now correctly
      // enters the pool, which check-shore verifies as a separate behavior.
      for (let i = 0; i < 240 && h.player.y >= 5; i++) { h.player.update(1 / 60, { x: 0, z: -1, run: true }, 0); h.extras.update(); }
      return { top, off, mid, y: h.player.y, z: h.player.pos.z, island: h.player.island, mode: h.player.mode };
    });
    assert.ok(down.top > 24, JSON.stringify(down));
    // A ledge taller than a step must not hold the visitor: stepping off drops them.
    assert.ok(down.off < down.top - 0.9, JSON.stringify(down));
    assert.equal(down.mid.island, 'pyramid', JSON.stringify(down));
    assert.ok(down.mid.y < 24, JSON.stringify(down));
    // And the descent carries them on down the slope, not just to its lip.
    assert.equal(down.island, 'pyramid', JSON.stringify(down));
    assert.ok(down.y < 6, JSON.stringify(down));
    return down;
  });
  await check('a visitor walks up the glass to the crown', async () => {
    const climb = await page.evaluate(() => {
      const h = __home;
      // The paving just past the apron step ring; walking north climbs the base.
      const started = h.player.teleport(0, 19.15); h.extras.update();
      let best = h.player.y;
      for (let i = 0; i < 1500; i++) { h.player.update(1 / 60, { x: 0, z: -1, run: true }, 0); h.extras.update(); best = Math.max(best, h.player.y); }
      return { started, best, island: h.player.island, mode: h.player.mode, x: h.player.pos.x, z: h.player.pos.z };
    });
    // The slope carries the visitor to the crown, where the andesite capstone
    // stops them: it is one step too tall to walk, so it is flown or jumped onto.
    assert.equal(climb.started, true, JSON.stringify(climb));
    assert.ok(climb.best > 22, JSON.stringify(climb));
    assert.equal(climb.island, 'pyramid', JSON.stringify(climb));
    return climb;
  });
  await check('rain and snow stop on the roof instead of falling into the hall', async () => {
    const shelter = await page.evaluate(() => {
      const s = __home.weatherFx.shelter;
      return { hall: s.topAt(-9, 0), centre: s.topAt(0, 0), door: s.topAt(-17, 0), outside: s.topAt(30, 0) };
    });
    assert.ok(shelter.hall > 5, JSON.stringify(shelter));
    assert.ok(shelter.centre > 20, JSON.stringify(shelter));
    assert.ok(shelter.door < 1, JSON.stringify(shelter));
    assert.ok(shelter.outside < 1, JSON.stringify(shelter));
    return shelter;
  });
  await check('snow does not fall inside the hall', async () => {
    await page.evaluate(() => { __home.player.teleport(-9, 0); __home.setWeatherMode('snow'); });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${output}/${view.name}-snow-hall.png` });
    await page.evaluate(() => __home.setWeatherMode('clear'));
  });
  await check('sample article pages load and remain readable', async () => {
    for (const path of ['first-visit', 'design-notes', 'quiet-corner']) {
      const article = await context.newPage();
      const response = await article.goto(new URL(`articles/${path}.html`, url).href);
      assert.equal(response.status(), 200);
      assert.equal(await article.locator('h1').count(), 1);
      assert.ok(await article.locator('aside').textContent());
      assert.equal(await article.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (path === 'first-visit') await article.screenshot({ path: `${output}/${view.name}-reading.png` });
      await article.close();
    }
  });
  result.stats = await page.evaluate(() => __home.stats());
  if (errors.length) report.failures.push(`${view.name}: browser errors: ${errors.join('; ')}`);
  report.views.push(result);
  await context.close();
}
await browser.close();
writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
