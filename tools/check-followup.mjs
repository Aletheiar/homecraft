import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim();
const out = 'tools/.check/followup'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { checks: [], errors: [] };
async function check(name, action) {
  try { report.checks.push({ name, passed: true, detail: await action() }); console.log(`PASS: ${name}`); }
  catch (e) { report.checks.push({ name, passed: false, error: e.message }); console.log(`FAIL: ${name}: ${e.message}`); }
}
async function ready(page) {
  await page.waitForFunction(() => window.__homeStartupError || window.__home?.world.pyramid?.sceneryReady, null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__homeStartupError || null), null);
  await page.waitForFunction(() => !__home.rig.introActive);
}
async function stand(page, id = 'about', fp = true) {
  await page.locator('#enter-button').click();
  await page.evaluate(async ({ id, fp }) => {
    const { STATIONS } = await import('/world/layout.js'), s = STATIONS.find(s => s.id === id), h = __home;
    h.player.teleport(...s.at, s); h.rig.recenter(h.player); h.rig.setFirstPerson(fp, Math.PI / 2);
    for (let i = 0; i < 100; i++) { h.rig.update(1 / 60, h.player); h.extras.update(1 / 60); }
  }, { id, fp });
}
async function view(page, position, look, file) {
  await page.evaluate(({ position, look }) => { const h = __home; h.rig.showcase(position, look); for (let i = 0; i < 100; i++) h.rig.update(1 / 60, h.player); }, { position, look });
  await page.screenshot({ path: `${out}/${file}.png` });
}
async function cross(page) {
  return page.evaluate(() => {
    const h = __home;
    for (let i = 0; i < 65; i++) { h.player.update(1 / 60, { x: 1, z: 0, run: false }, 0); h.extras.update(1 / 60); }
    return document.querySelector('#portal-ripple')?.classList.contains('charging') || false;
  });
}
async function profile(page) {
  await page.waitForURL('**/about/');
  await page.locator('[data-profile-name]').waitFor();
  assert.equal(await page.locator('h1').textContent(), 'Aletheia');
  assert.equal(await page.locator('[data-profile-bio]').isVisible(), false);
  assert.equal(await page.locator('[data-platform="github"] a').getAttribute('href'), 'https://github.com/Aletheiar');
  assert.equal(await page.locator('[data-platform="zhihu"] a').getAttribute('href'), 'https://www.zhihu.com/people/69-57-39-60');
  assert.match(await page.locator('[data-platform="zhihu"]').textContent(), /今夕何夕/);
  assert.match(await page.locator('[data-platform="shuiyuan"] a').getAttribute('href'), /shuiyuan\.sjtu\.edu\.cn\/u\//);
  assert.equal(await page.locator('canvas').count(), 0, 'the reading page must not load a second 3D scene');
}
async function back(page) {
  await Promise.all([page.waitForURL('**?space=hub&return=1'), page.locator('[data-return-hub]').click()]);
  await ready(page);
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(base); await ready(page); await stand(page);
  await check('four matching west-facing portals are aligned and all old kiosk furniture is gone', async () => {
    const state = await page.evaluate(async () => {
      const h = __home, { HUB_PORTALS } = await import('/world/space-config.js');
      const free = [[-8.75, -11.25], [-10.375, -9.6875], [-7.125, -9.6875], [-6, 2.4]].every(([x, z]) => h.nav.canStand(x, z));
      let clear = true; for (let x = -13; x < -2; x += .25) if (!h.nav.canStand(x, 0)) clear = false;
      return { positions: HUB_PORTALS.map(g => [g.x, g.z]), sizes: h.world.veils.map(v => [v.geometry.parameters.width, v.geometry.parameters.height]), oldSign: !!h.stage.scene.getObjectByName('hall-sign-about'), free, clear };
    });
    assert.deepEqual(state.positions, [[-5, -7], [9, -7], [9, 7], [-5, 7]]);
    assert.equal(state.oldSign, false); assert.ok(state.free && state.clear);
    assert.equal(state.sizes.length, 4); state.sizes.forEach(s => assert.deepEqual(s, [2.34, 3.34])); return state;
  });
  await view(page, [-13, 5.5, 13], [1, 2, 0], 'four-portal-hall');
  await view(page, [-14, 3.7, -5], [-5, 1.4, -9], 'library-clear');
  await check('F and the native directory stay inactive; crossing About charges and restores a checkpoint', async () => {
    await stand(page);
    await page.keyboard.press('Control+f'); assert.equal(new URL(page.url()).pathname, '/'); await page.keyboard.press('Escape');
    const departure = await page.evaluate(() => ({ x: __home.player.pos.x, z: __home.player.pos.z, yaw: __home.rig.yaw, fp: __home.rig.firstPerson }));
    await page.keyboard.press('f');
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.locator('#panel').evaluate(e => e.open), false);
    assert.equal(await page.locator('#prompt').isVisible(), false);
    assert.equal(await page.locator('#portalButton').count(), 0);
    await page.evaluate(() => __home.openPortal());
    assert.equal(await page.locator('#panel').evaluate(e => e.open), false);
    const charging = await cross(page);
    assert.equal(charging, true); await profile(page);
    await page.screenshot({ path: `${out}/about-desktop.png` }); await back(page);
    const arrival = await page.evaluate(() => ({ x: __home.player.pos.x, z: __home.player.pos.z, yaw: __home.rig.yaw, fp: __home.rig.firstPerson }));
    assert.ok(arrival.x <= -6.45 && arrival.x > -8 && Math.abs(arrival.z - 7) < .2);
    assert.equal(arrival.fp, departure.fp); assert.ok(Math.abs(Math.atan2(Math.sin(arrival.yaw - departure.yaw), Math.cos(arrival.yaw - departure.yaw))) < .02);
    await page.reload(); await ready(page); assert.deepEqual(await page.evaluate(() => [__home.player.pos.x, __home.player.pos.z]), [-29, 0]); return arrival;
  });
  await check('the About Dock button only approaches its door, then walking enters', async () => {
    await page.locator('#hotbar [data-station="about"]').click();
    assert.equal(await page.locator('#panel').evaluate(e => e.open), false);
    assert.equal(new URL(page.url()).pathname, '/');
    await view(page, [-9, 2.1, 7], [-5, 2.05, 7], 'about-portal-near');
    await cross(page); await profile(page); await back(page);
    assert.ok(await page.evaluate(() => __home.player.pos.x <= -6.45 && Math.abs(__home.player.pos.z - 7) < .15));
  });
  await check('walking into About restores a safe point in front of that door', async () => {
    await stand(page);
    await page.evaluate(() => { const h = __home; for (let i = 0; i < 60; i++) { h.player.update(1 / 60, { x: 1, z: 0, run: false }, 0); h.extras.update(1 / 60); } }).catch(e => { if (!/context.*destroyed|navigation/i.test(e.message)) throw e; });
    await profile(page); await back(page);
    const p = await page.evaluate(() => ({ x: __home.player.pos.x, z: __home.player.pos.z }));
    assert.ok(p.x <= -6.45 && p.x > -8 && Math.abs(p.z - 7) < .2, JSON.stringify(p)); return p;
  });
  await check('the game-room statue remains a single batch outside the courtyard', async () => {
    const s = await page.evaluate(() => ({ ...__home.world.statues, meshes: __home.world.groups.statues.children.length, outside: __home.player.goTo(-62.6, -19.2) }));
    assert.equal(s.meshes, 1); assert.equal(s.outside, false); assert.deepEqual(s.facing, [1, 0, 0]);
    assert.ok(s.bounds.max[0] < -39.5 && s.triangleCount < 10000); return s;
  });
  await view(page, [-43, 12, -11], [-62.6, 7, -19.2], 'isaac-angel-courtyard');
  await view(page, [-88, 45, 62], [-18, 4, 0], 'courtyard-monuments');
  await check('Welcome and Articles still open from the Dock without obsolete physical targets', async () => {
    await stand(page);
    for (const id of ['welcome', 'blog']) {
      const previous = await page.evaluate(() => [__home.player.pos.x, __home.player.pos.z]);
      await page.locator(`#hotbar [data-station="${id}"]`).click(); assert.equal(await page.locator('#panel').evaluate(e => e.open), true);
      assert.deepEqual(await page.evaluate(() => [__home.player.pos.x, __home.player.pos.z]), previous);
      await page.locator('#panel .close').click();
    }
  });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.on('pageerror', e => report.errors.push(e.message));
  await check('mobile About entry, accounts and reduced-motion return work by touch', async () => {
    await mobile.goto(base); await ready(mobile); await mobile.locator('#hotbar [data-station="about"]').tap();
    assert.equal(await mobile.locator('#panel').evaluate(e => e.open), false);
    await mobile.evaluate(() => { for (let i = 0; i < 100; i++) { __home.rig.update(1 / 60, __home.player); __home.extras.update(1 / 60); } });
    await cross(mobile); await profile(mobile);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await mobile.locator('#portal-ripple').count(), 0); await mobile.screenshot({ path: `${out}/about-mobile.png` });
    await back(mobile); assert.ok(await mobile.evaluate(() => __home.player.pos.x <= -6.45 && Math.abs(__home.player.pos.z - 7) < .15));
  });
} finally {
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close();
}
assert.equal(report.errors.length, 0); assert.ok(report.checks.every(c => c.passed), 'Follow-up verification failed');
