// Pixel and resource invariants for equivalent facade batching / flat portals.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';
const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/performance'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser(), results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } }), requests = [];
  page.on('request', r => { if (r.url().includes('.glb')) requests.push(new URL(r.url()).pathname); });
  await page.goto(base);
  await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady && __home.world.ori?.state.ready, null, { timeout: 60000 });
  await finishOpening(page);
  const gpu = await page.evaluate(() => { const gl = __home.stage.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  const views = [
    ['exterior', [-83,53,88], [0,5,0]], ['armillary', [-5,3.6,5], [0,1.6,0]],
    ['workstation', [7.6,3.4,-6.5], [12.7,1.5,-12.7]], ['ori', [9.4,2.3,8.7], [13,1.58,12.5]],
    ['portal-front', [6,2.4,0], [13,2.4,0]], ['portal-back', [16,2.4,0], [13,2.4,0]],
  ];
  for (const [name, camera, at] of views) {
    await page.evaluate(({ camera, at }) => { __home.setTimeMode('morning'); __home.setWeatherMode('clear'); __home.stage.settle(); __home.rig.setFirstPerson(true); __home.rig.showcase(camera, at); }, { camera, at });
    await page.waitForTimeout(1300);
    const result = await page.evaluate(() => {
      const h = __home, renderer = h.stage.renderer, gl = renderer.getContext();
      const realNow = performance.now, frozenNow = performance.now();
      performance.now = () => frozenNow;
      const lod = h.stage.scene.getObjectByName('original-facade-1-batches'), near = lod.levels[0].object, far = lod.levels[1].object;
      const read = (scene = null) => { scene ? renderer.render(scene, h.stage.camera) : h.stage.render(); const p = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p); return p; };
      const diff = (a,b) => {
        let changed = 0, pixels = 0, lastPixel = -1, max = 0;
        const examples = [];
        for (let i=0;i<a.length;i++) {
          const d = Math.abs(a[i]-b[i]);
          if (d) {
            changed++; const pixel = Math.floor(i/4);
            if (pixel !== lastPixel) { pixels++; lastPixel = pixel; }
            if (examples.length < 12) examples.push({ pixel, channel: i%4, a:a[i], b:b[i] });
          }
          max = Math.max(max,d);
        }
        return { changedChannels: changed, changedPixels: pixels, maxChannelDelta: max, examples };
      };
      lod.autoUpdate = false; near.visible = false; far.visible = true;
      h.stage.render(); h.stage.render();
      const whole = read(), repeat = diff(whole, read()); far.visible = false; near.visible = true;
      h.stage.render(); h.stage.render();
      const split = read(), culling = diff(whole, split);
      const veils = h.world.veils;
      const isolated = h.stage.scene.clone(false); isolated.fog = null; isolated.environment = null;
      for (const veil of veils) {
        const copy = veil.clone(false); copy.matrixAutoUpdate = false; copy.matrix.copy(veil.matrixWorld); isolated.add(copy);
      }
      isolated.updateMatrixWorld(true);
      for (const v of veils) v.material.forceSinglePass = false;
      const doubleScene = read(), double = read(isolated);
      for (const v of veils) v.material.forceSinglePass = true;
      const single = read(isolated), portals = diff(double, single), portalScene = diff(doubleScene, read());
      // Warm both geometry sets, then repeatedly switch them. GPU resource
      // counts must reach a plateau; this is not a process-memory leak proof.
      const memory = () => ({ ...renderer.info.memory });
      const before = memory();
      for (let i=0;i<60;i++) { far.visible = i%2 === 0; near.visible = !far.visible; h.stage.render(); }
      const after = memory(); lod.autoUpdate = true; lod.update(h.stage.camera);
      performance.now = realNow;
      return { repeat, culling, portals, portalScene, before, after };
    });
    results.push({ name, ...result });
    console.log(JSON.stringify({ name, ...result }));
  }
  for (const path of new Set(requests)) assert.equal(requests.filter(p => p === path).length, 1, `${path}: duplicate model request`);
  // SwiftShader's unchanged-scene repeats showed up to seven levels at a few
  // high-contrast background pixels. Retain a tight area bound and record the
  // backend-specific bound; isolated flat portal surfaces must still be exact.
  const tolerance = { cullingMaxPixels: 8, cullingMaxChannelDelta: /SwiftShader/i.test(gpu) ? 8 : 1, portalMaxPixels: 0 };
  const suffix = process.env.HOMECRAFT_SOFTWARE_GPU === '1' ? '-software' : '';
  writeFileSync(`${out}/visual-resource-invariants${suffix}.json`, JSON.stringify({ gpu, tolerance, results, requests }, null, 2));
  for (const result of results) {
    // Permit only isolated output variation out of 1.37 million pixels.
    // The unchanged-scene repeat is checked against the same bound as A/B.
    for (const key of ['repeat', 'culling', 'portalScene']) assert.ok(result[key].changedPixels <= tolerance.cullingMaxPixels && result[key].maxChannelDelta <= tolerance.cullingMaxChannelDelta, `${result.name}: ${key} exceeded pixel rounding tolerance`);
    assert.equal(result.portals.changedChannels, 0, `${result.name}: portal pass changed pixels`);
    assert.deepEqual(result.after, result.before, `${result.name}: GPU resource counts grew`);
  }
  console.log('Facade pixels stay within isolated 8-bit rounding tolerance; portal pixels match; GPU resources plateau; each model requested once.');
} finally { await browser.close(); }
