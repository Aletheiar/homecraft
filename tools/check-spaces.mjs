import { launchBrowser } from './browser.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/pyramid'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
async function ready(hub = false) {
  await page.waitForFunction(hub => window.__homeStartupError || (hub ? window.__home?.world.pyramid?.sceneryReady : window.__home?.world.roomReady), hub, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__homeStartupError || null), null);
  await page.waitForFunction(() => !__home.rig.introActive);
  await page.evaluate(() => __home.extras.update(1));
}
async function check(name, fn) {
  try { results.push({ name, passed: true, detail: await fn() }); console.log(`PASS: ${name}`); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.log(`FAIL: ${name}: ${e.message}`); }
}
try {
  await page.goto(base); await ready(true); await page.locator('#return-button').click();
  await check('a continuous dry perimeter road is walkable around all four corners', async () => {
    // The pool coping stands at |x|,|z| ≈ 38.16 and the fence blocks from 38.92,
    // so the dry road's standable centre line runs at 38.3–38.7. Walk its middle.
    const RING = 38.5;
    const route = await page.evaluate(async RING => {
      const h = __home, { POOL } = await import('/world/layout.js');
      const { poolContains } = await import('/engine/world/pool-regions.js');
      const empty = { x: 0, z: 0, run: false }, legs = [];
      h.player.teleport(-RING, -RING);
      for (const [x, z] of [[RING, -RING], [RING, RING], [-RING, RING], [-RING, -RING]]) {
        const started = h.player.goTo(x, z); let wet = false;
        for (let i = 0; i < 7000 && h.player.travelling; i++) {
          h.player.update(1 / 60, empty, 0); h.extras.update(1 / 60);
          if (poolContains(POOL, h.player.pos.x, h.player.pos.z)) wet = true;
        }
        legs.push({ started, wet, distance: Math.hypot(x - h.player.pos.x, z - h.player.pos.z), mode: h.player.mode });
      }
      // Every centreline point must be dry and valid, independent of routing.
      let invalid = 0;
      for (let p = -RING; p <= RING; p += .2) for (const [x, z] of [[p, -RING], [p, RING], [-RING, p], [RING, p]]) if (poolContains(POOL, x, z) || !h.nav.canStand(x, z)) invalid++;
      return { legs, invalid };
    }, RING);
    assert.equal(route.invalid, 0, JSON.stringify(route));
    for (const leg of route.legs) assert.ok(leg.started && !leg.wet && leg.distance < .3 && leg.mode === 'ground', JSON.stringify(route));
    return route;
  });
  await page.evaluate(() => { __home.rig.skipIntro(); __home.rig.showcase([75, 63, 55], [12, 0, 5]); for (let i = 0; i < 90; i++) __home.rig.update(1 / 60, __home.player); });
  await page.screenshot({ path: `${out}/inset-fence-road.png` });
  // The card only stays open while the visitor is at the station, so each check
  // walks up to its stand first — exactly what a visitor has to do.
  const atStation = id => page.evaluate(async id => {
    const { STATIONS } = await import('/world/layout.js');
    const s = STATIONS.find(s => s.id === id);
    __home.player.teleport(...s.at, s); __home.rig.recenter(__home.player);
    __home.openPage(id);
    await new Promise(r => setTimeout(r, 350));
  }, id);
  await check('crystal control changes the actual animation state', async () => {
    await atStation('plaza');
    const prior = await page.evaluate(() => __home.world.foyer.rotating);
    await page.locator('#panel [data-foyer-action="crystal"]').click();
    assert.equal(await page.evaluate(() => __home.world.foyer.rotating), !prior);
    const rotation = await page.evaluate(() => __home.world.foyer.crystal.rotation.y);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => __home.world.foyer.crystal.rotation.y), rotation);
    await page.locator('#panel .close').click();
  });
  await check('observatory changes the engine time of day', async () => {
    await atStation('observatory');
    await page.locator('#panel [data-time="night"]').click();
    assert.equal(await page.evaluate(() => __home.getTimeMode()), 'night');
    await page.locator('#panel .close').click();
    await page.evaluate(() => __home.setTimeMode('morning'));
  });
  await check('suspended generated illustration loads', async () => {
    await page.waitForFunction(() => __home.world.gallery.ready || __home.world.gallery.error);
    assert.equal(await page.evaluate(() => __home.world.gallery.error), null);
    assert.equal((await page.request.get(`${base}assets/gallery/miku-glass.webp`)).status(), 200);
  });
  await check('portal veils actually flow in the rendered scene', async () => {
    const motion = await page.evaluate(() => {
      const veil = __home.stage.scene.getObjectByName('portal-writing');
      const before = veil.material.map.offset.y;
      __home.extras.update(.5);
      return { before, after: veil.material.map.offset.y, tracked: __home.world.veils?.length || 0 };
    });
    assert.equal(motion.tracked, 4, JSON.stringify(motion));
    assert.ok(Math.abs(motion.after - motion.before) > .01, JSON.stringify(motion));
    return motion;
  });
  await page.locator('#enter-button').click();
  await page.evaluate(() => { __home.rig.setFirstPerson(false); __home.rig.showcase([-12, 4.8, 9], [2, 5, -2]); for (let i = 0; i < 90; i++) __home.rig.update(1 / 60, __home.player); });
  await page.screenshot({ path: `${out}/portal-hall.png` });
  await page.locator('#return-button').click();
  await page.evaluate(() => { __home.rig.showcase([-42, 12, 22], [-24, 1, 0]); for (let i = 0; i < 90; i++) __home.rig.update(1 / 60, __home.player); });
  await page.screenshot({ path: `${out}/interactive-foyer.png` });
  for (const [id, space] of [['writing', 'library'], ['works', 'studio']]) {
    await check(`${id} portal enters ${space} by crossing, and the enclosed room works`, async () => {
      await page.locator('#enter-button').click();
      await page.evaluate(async id => {
        const { HUB_PORTALS } = await import('/world/space-config.js'); const g = HUB_PORTALS.find(g => g.id === id);
        __home.player.teleport(g.x + Math.sin(g.yaw) * 2, g.z + Math.cos(g.yaw) * 2); __home.rig.recenter(__home.player);
      }, id);
      await page.waitForFunction(() => !__home.rig.introActive);
      const departure = await page.evaluate(() => ({ x: __home.player.pos.x, z: __home.player.pos.z, yaw: __home.rig.yaw, firstPerson: __home.rig.firstPerson }));
      await page.keyboard.press('f');
      assert.equal(await page.locator('#panel').evaluate(e => e.open), false);
      await page.evaluate(async id => {
        const { HUB_PORTALS } = await import('/world/space-config.js'), gate = HUB_PORTALS.find(g => g.id === id), h = __home;
        for (let i = 0; i < 65; i++) { h.player.update(1 / 60, { x: -Math.sin(gate.yaw), z: -Math.cos(gate.yaw), run: false }, 0); h.extras.update(1 / 60); }
      }, id);
      await page.waitForURL(`**?space=${space}`); await ready();
      assert.equal(await page.evaluate(() => __home.world.space), space);
      const roomVeil = await page.evaluate(() => {
        const veil = __home.stage.scene.getObjectByName('portal-return-hub');
        const before = veil.material.map.offset.y;
        __home.extras.update(.5);
        return Math.abs(veil.material.map.offset.y - before);
      });
      assert.ok(roomVeil > .01, 'the return portal must animate too');
      const checks = await page.evaluate(() => {
        const h = __home;
        return { start: h.nav.canStand(h.player.pos.x, h.player.pos.z), outside: h.player.goTo(30, 0), roof: h.world.roomContains(0, 0, 5), sealed: !h.world.roomContains(12, 0, 0) };
      });
      assert.deepEqual(checks, { start: true, outside: false, roof: false, sealed: true });
      if (space === 'library') {
        await page.evaluate(async () => {
          const { STATIONS } = await import('/world/rooms/layout.js');
          __home.player.teleport(...STATIONS.find(s => s.id === 'blog').at); __home.rig.recenter(__home.player);
        });
        await page.locator('#hotbar [data-station="blog"]').click(); await page.waitForTimeout(250);
        assert.equal(await page.locator('#panel').getAttribute('data-station'), 'blog');
        assert.equal(await page.locator('#panel').evaluate(e => e.open), true);
        await page.locator('#panel .close').click();
      }
      await page.locator('#overview-button').click(); await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${space}.png` });
      // The room's return door carries the checkpoint flag, so match loosely.
      await Promise.all([page.waitForURL('**?space=hub**'), page.locator('#return-button').click()]); await ready(true);
      const arrival = await page.evaluate(() => ({ x: __home.player.pos.x, z: __home.player.pos.z, yaw: __home.rig.yaw, firstPerson: __home.rig.firstPerson }));
      const gate = await page.evaluate(id => __home.world.portals.find(g => g.id === id), id);
      const dx = arrival.x - gate.x, dz = arrival.z - gate.z;
      const normal = dx * Math.sin(gate.yaw) + dz * Math.cos(gate.yaw);
      const tangent = dx * Math.cos(gate.yaw) - dz * Math.sin(gate.yaw);
      assert.ok(normal >= 1.45 && normal < 1.7 && Math.abs(tangent) < .15, JSON.stringify({ departure, arrival, normal, tangent }));
      assert.equal(arrival.firstPerson, departure.firstPerson);
      assert.ok(Math.abs(Math.atan2(Math.sin(arrival.yaw - departure.yaw), Math.cos(arrival.yaw - departure.yaw))) < .02);
      return checks;
    });
    // Recover the hub if a failed gate check left us in another space.
    if (new URL(page.url()).searchParams.get('space') !== 'hub') { await page.goto(`${base}?space=hub`); await ready(true); }
  }
  await check('walking through the portal opening routes into the library', async () => {
    await page.locator('#enter-button').click();
    await page.evaluate(() => { __home.player.teleport(-7, -7); __home.rig.recenter(__home.player); });
    await page.waitForTimeout(800);
    const nav = page.waitForURL(url => new URL(url).searchParams.get('space') === 'library', { timeout: 10000 });
    await page.evaluate(() => {
      const h = __home;
      // The writing door faces west: walk east from its front into the opening.
      for (let i = 0; i < 50; i++) { h.player.update(1 / 60, { x: 1, z: 0, run: false }, 0); h.extras.update(1 / 60); }
    }).catch(e => { if (!/context.*destroyed|navigation/i.test(e.message)) throw e; });
    await nav; await ready();
  });
  await check('walking through the back of a portal opening also routes into the library', async () => {
    await page.goto(`${base}?space=hub`); await ready(true);
    await page.locator('#enter-button').click();
    await page.evaluate(async () => {
      const { HUB_PORTALS } = await import('/world/space-config.js');
      const gate = HUB_PORTALS.find(g => g.id === 'writing');
      __home.player.teleport(gate.x - Math.sin(gate.yaw) * 2, gate.z - Math.cos(gate.yaw) * 2);
      __home.rig.recenter(__home.player);
    });
    await page.waitForTimeout(800);
    const nav = page.waitForURL(url => new URL(url).searchParams.get('space') === 'library', { timeout: 10000 });
    await page.evaluate(() => {
      const h = __home;
      // Approach the same opening from behind: walk west through it.
      for (let i = 0; i < 50; i++) { h.player.update(1 / 60, { x: -1, z: 0, run: false }, 0); h.extras.update(1 / 60); }
    }).catch(e => { if (!/context.*destroyed|navigation/i.test(e.message)) throw e; });
    await nav; await ready();
  });
  await check('the friends door opens the static link directory', async () => {
    await page.goto(`${base}?space=hub`); await ready(true);
    await page.locator('#enter-button').click();
    await page.evaluate(async () => {
      const { HUB_PORTALS } = await import('/world/space-config.js');
      const gate = HUB_PORTALS.find(g => g.id === 'friends');
      __home.player.teleport(gate.x + Math.sin(gate.yaw) * 2, gate.z + Math.cos(gate.yaw) * 2);
      __home.rig.recenter(__home.player);
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const h = __home;
      // The friends door faces west like the writing door: walk east into it.
      for (let i = 0; i < 65; i++) { h.player.update(1 / 60, { x: 1, z: 0, run: false }, 0); h.extras.update(1 / 60); }
    }).catch(e => { if (!/context.*destroyed|navigation/i.test(e.message)) throw e; });
    await page.waitForURL('**/friends/', { timeout: 10000 });
    const listed = await page.evaluate(async () => {
      const { FRIEND_LINKS } = await import('/friends/list.js');
      const anchors = [...document.querySelectorAll('[data-friend-links] a')];
      return {
        count: anchors.length,
        rendered: anchors.map(a => a.href),
        expected: FRIEND_LINKS.map(link => link.url),
        countLabel: document.querySelector('[data-friend-count]').textContent,
      };
    });
    assert.equal(listed.count, listed.expected.length);
    assert.deepEqual(listed.rendered, listed.expected);
    assert.ok(listed.countLabel.includes(String(listed.count)), listed.countLabel);
  });
} finally {
  writeFileSync(`${out}/spaces-report.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2)); await browser.close();
}
assert.equal(errors.length, 0);
assert.ok(results.every(r => r.passed), 'Space verification failed');
