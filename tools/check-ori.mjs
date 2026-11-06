import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/ori'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser(), report = [];
try {
  for (const { mobile, viewport, name } of [
    { mobile: false, viewport: { width: 1440, height: 1000 }, name: 'desktop' },
    { mobile: true, viewport: { width: 390, height: 844 }, name: 'touch' },
    { mobile: true, viewport: { width: 568, height: 320 }, name: 'touch-landscape' },
  ]) {
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(), errors = [], modelRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (request.url().includes('ori-vincentskc.glb')) modelRequests.push(request.url()); });
    await page.goto(base);
    await page.waitForFunction(() => window.__home?.world.pyramid.sceneryReady && (__home.world.ori.state.ready || __home.world.ori.state.error), null, { timeout: 60000 });
    await finishOpening(page); await page.locator('#loading').waitFor({ state: 'detached' });
    const details = await page.evaluate(async () => {
      const h = __home, T = await import('three'), e = h.world.ori;
      const { STATIONS } = await import('/world/layout.js');
      e.mesh.updateWorldMatrix(true, true);
      const v = new T.Vector3(), bounds = new T.Box3();
      let triangles = 0, draws = 0, lights = 0, violations = 0;
      e.mesh.traverse(o => {
        if (o.isLight) lights++;
        if (o.isPoints) draws++;
        if (!o.isMesh) return;
        draws++; triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
        const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); bounds.expandByPoint(v);
          const roof = 24.8 * (1 - Math.max(Math.abs(v.x), Math.abs(v.z)) / 18.2) - .6;
          if (v.y >= roof) violations++;
        }
      });
      const routes = STATIONS.filter(s => ['ori','writing','friends','about','workbench'].includes(s.id)).map(s => ({ id: s.id, path: !!h.nav.findPath({ x: -12, z: 0 }, { x: s.at[0], z: s.at[1] }) }));
      const walkAround = [[11.3,12.5],[14.7,12.5],[13,10.8],[13,14.2]].map(([x,z]) => h.nav.canStand(x,z));
      const centerBlocked = !h.nav.canStand(13,12.5);
      const oldLoungeReleased = h.nav.canStand(14.45,10.9) && h.nav.canStand(12.6,14.4) && h.nav.canStand(15.3,13.4);
      const conflicts = h.world.obstacles.filter(o => !e.obstacles.includes(o) && o.x0 < bounds.max.x && o.x1 > bounds.min.x && o.z0 < bounds.max.z && o.z1 > bounds.min.z);
      const modelBounds = new T.Box3().setFromObject(e.subject);
      const modelSize = modelBounds.getSize(new T.Vector3()).toArray();
      await e.load();
      return { error: e.state.error, triangles, draws, lights, violations, size: bounds.getSize(new T.Vector3()).toArray(), modelSize, routes, walkAround, centerBlocked, oldLoungeReleased, conflicts };
    });
    assert.equal(details.error, null);
    assert.equal(details.violations, 0, 'all imported model and support vertices fit below the glass');
    assert.ok(details.size[1] >= 2.2 && details.size[1] <= 3.2);
    assert.ok(details.modelSize[1] > 1.5 && details.modelSize[1] < 1.9, 'the imported glTF root is normalised correctly');
    assert.ok(details.triangles < 14000);
    assert.ok(details.draws <= 7); assert.equal(details.lights, 0);
    assert.ok(details.routes.every(r => r.path), 'all original portal/workstation routes and the Ori approach remain connected');
    assert.ok(details.walkAround.every(Boolean), 'both sides and the back of the display stay walkable');
    assert.ok(details.centerBlocked, 'visitors cannot walk through the physical support');
    assert.ok(details.oldLoungeReleased, 'removed furniture leaves no stale colliders');
    assert.deepEqual(details.conflicts, []);
    assert.equal(modelRequests.length, 1, 'repeated loading must reuse the same model request');

    const view = async (cam, look, stand = [10.95, 10.45]) => {
      await page.evaluate(({ cam, look, stand }) => {
        const h = __home; h.rig.skipIntro(); h.player.teleport(...stand);
        h.rig.setFirstPerson(true); h.rig.showcase(cam, look);
        for (let i = 0; i < 120; i++) h.rig.update(1 / 60, h.player);
      }, { cam, look, stand });
      await page.waitForTimeout(150);
    };
    const cam = mobile ? [8.0, 2.5, 7.7] : [9.4, 2.3, 8.7];
    await view(cam, [13, 1.58, 12.5]);
    await page.locator('#ori-exhibit-prompt').waitFor({ state: 'visible' });
    await page.screenshot({ path: `${out}/${name}-exhibit.png` });
    const tap = async point => mobile ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
    await page.locator('#ori-exhibit-prompt').click();
    const panel = page.locator('#panel');
    await page.waitForFunction(() => document.querySelector('#panel').open && document.querySelector('#panel').dataset.station === 'ori');
    assert.match(await panel.innerText(), /奥日与萤火意志/);
    assert.match(await panel.innerText(), /游戏艺术收藏/);
    assert.match(await panel.innerText(), /vincentskc/);
    assert.match(await panel.innerText(), /CC BY 4.0/);
    await panel.evaluate(async p => { await Promise.all(p.getAnimations().map(a => a.finished)); });
    const rect = await panel.boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= viewport.width, 'the card fits the viewport horizontally');
    assert.ok(rect.y >= 0 && rect.y + rect.height <= viewport.height, 'the card fits the viewport vertically');
    if (viewport.height < 400) {
      await panel.locator('.body').evaluate(body => { body.scrollTop = body.scrollHeight; });
      const credit = await panel.locator('.ori-credit').boundingBox();
      assert.ok(credit.y >= 0 && credit.y + credit.height <= viewport.height, 'the attribution can be scrolled fully into view');
    }
    await page.screenshot({ path: `${out}/${name}-card.png` });
    await panel.locator('header .close').click();
    await page.waitForFunction(() => !document.querySelector('#panel').open);

    // Actual canvas pointer/touch selection, not a debug openPage call.
    await view(cam, [13, 1.58, 12.5]);
    const target = await page.evaluate(async () => {
      const T = await import('three'), p = new T.Vector3(13, 2.05, 12.5).project(__home.stage.camera);
      return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
    });
    await tap(target);
    await page.waitForFunction(() => document.querySelector('#panel').open && document.querySelector('#panel').dataset.station === 'ori', null, { timeout: 4000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#panel').open);
    await page.locator('#ori-exhibit-prompt').click();
    await panel.locator('.ori-category').click();
    assert.equal(await panel.evaluate(p => p.open), true, 'touching card text keeps it open');
    // Clicking the empty backdrop closes through the existing panel handler.
    await page.mouse.click(5, 5);
    await page.waitForFunction(() => !document.querySelector('#panel').open);

    // Repeated openings must not add models, prompts, or dialogs.
    for (let i = 0; i < 3; i++) {
      await page.locator('#ori-exhibit-prompt').click(); await panel.locator('header .close').click();
    }
    assert.equal(await page.locator('#ori-exhibit-prompt').count(), 1);
    assert.equal(modelRequests.length, 1);
    await page.evaluate(() => __home.player.teleport(0, 0));
    await page.locator('#ori-exhibit-prompt').waitFor({ state: 'hidden' });
    await view([-5, 5, -6], [10, 1.3, 10], [0, 0]);
    await page.screenshot({ path: `${out}/${name}-hall.png` });
    const stats = await page.evaluate(() => __home.stats());

    // Reduced motion is live: particles stop even when the exhibit is on screen.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await view(cam, [13, 1.58, 12.5]);
    const before = await page.evaluate(() => Array.from(__home.world.ori.mesh.getObjectByName('ori-spirit-motes').geometry.attributes.position.array));
    await page.waitForTimeout(250);
    assert.deepEqual(await page.evaluate(() => Array.from(__home.world.ori.mesh.getObjectByName('ori-spirit-motes').geometry.attributes.position.array)), before);
    assert.deepEqual(errors, []);
    report.push({ mobile, viewport, details, stats, errors }); await context.close();
  }
} finally {
  await browser.close(); writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
console.log('Ori model, glass clearance, hall routes, desktop/touch picking, card lifecycle and reduced motion passed.');
