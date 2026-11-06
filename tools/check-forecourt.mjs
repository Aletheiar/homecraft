// Check the real ground overlay, navigation, rendering cost and saved views.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening, activateSceneControl } from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/forecourt'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser(), report = [];
try {
  for (const viewport of [{ width: 1440, height: 950 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport }), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.__home?.world.pyramid.sceneryReady, null, { timeout: 60000 });
    await finishOpening(page);
    await activateSceneControl(page, '#return-button');
    const details = await page.evaluate(async () => {
      const h = __home, mesh = h.stage.scene.getObjectByName('e8-forecourt');
      if (!mesh) return null;
      const { poolContains } = await import('@engine/world/pool-regions.js');
      const { POOL } = await import('/world/layout.js');
      const { bounds: b } = mesh.userData.e8;
      let wet = 0;
      for (let x = b.x0; x <= b.x1; x += .2) for (let z = b.z0; z <= b.z1; z += .2) wet += +poolContains(POOL, x, z);
      const walk = (x, z, dx, dz, frames) => {
        h.player.teleport(x, z); h.player.cancel();
        for (let i = 0; i < frames; i++) { h.player.update(1 / 60, { x: dx, z: dz, run: false }, 0); h.extras.update(1 / 60); }
        return { x: h.player.pos.x, z: h.player.pos.z, y: h.player.y, mode: h.player.mode };
      };
      const across = walk(-23, -15, 0, 1, 540);
      const towardDoor = walk(-32, 0, 1, 0, 180);
      const triangles = mesh.geometry.index.count / 3;
      const scene = h.stage.scene;
      h.stage.renderer.render(scene, h.stage.camera);
      const withFloor = h.stage.renderer.info.render;
      const before = { calls: withFloor.calls, triangles: withFloor.triangles };
      mesh.visible = false; h.stage.renderer.render(scene, h.stage.camera);
      const after = { calls: h.stage.renderer.info.render.calls, triangles: h.stage.renderer.info.render.triangles };
      mesh.visible = true;
      h.stage.renderer.render(scene, h.stage.camera);
      return { data: mesh.userData.e8, triangles, height: mesh.position.y, texture: [mesh.material.map.image.width, mesh.material.map.image.height], wet, across, towardDoor, renderDelta: { calls: before.calls - after.calls, triangles: before.triangles - after.triangles }, stats: h.stats() };
    });
    assert.ok(details, 'The approved E8 floor is present in the actual scene');
    console.log(JSON.stringify({ viewport, details }));
    assert.equal(details.data.roots, 240); assert.equal(details.data.fullEdges, 6720); assert.equal(details.data.drawnEdges, 2460);
    assert.equal(details.triangles, 2); assert.equal(details.wet, 0);
    assert.ok(details.height > .025 && details.height < .05, 'The overlay clears the imported paving without becoming a step');
    assert.ok(details.across.z > 16 && Math.abs(details.across.y) < .05, 'The full length remains walkable');
    assert.ok(details.towardDoor.x > -22 && Math.abs(details.towardDoor.y) < .05, 'The center route toward the entrance remains walkable');
    assert.ok(details.renderDelta.calls <= 1 && details.renderDelta.triangles <= 2, 'Dense E8 lines do not become thousands of meshes');
    const view = async (position, look, file) => {
      await page.evaluate(({ position, look }) => {
        __home.player.teleport(-32, 0); __home.rig.showcase(position, look);
        for (let i = 0; i < 100; i++) __home.rig.update(1 / 60, __home.player);
      }, { position, look });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/${viewport.width}-${file}.png` });
    };
    await page.evaluate(() => __home.setTimeMode('morning'));
    await view([-53, 36, 27], [-23, 1, 0], 'overview');
    await view([-27.25, 48, .51], [-27.25, 0, .5], 'top');
    await view([-36, 2.3, 5], [-23, .4, 0], 'walking');
    await page.evaluate(() => __home.setTimeMode('night'));
    await view([-45, 20, 20], [-25, 0, 0], 'night');
    assert.deepEqual(errors, []);
    report.push({ viewport, details, errors });
    await context.close();
  }
} finally { await browser.close(); writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2)); }
console.log('E8 floor, kiosk clearances, dry footprint, walking routes and desktop/mobile views passed.');
