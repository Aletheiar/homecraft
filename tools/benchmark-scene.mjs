// Fixed-condition Chrome benchmark. Results are local evidence, not phone results.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launchBrowser, finishOpening } from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const label = process.argv[3] || 'before';
const frames = Number(process.env.BENCH_FRAMES || 240);
const root = 'tools/.check/performance', out = join(root, label);
mkdirSync(out, { recursive: true });
const views = [
  { id: 'exterior', camera: [-83, 53, 88], at: [0, 5, 0], player: [-28, 0] },
  { id: 'armillary', camera: [-5, 3.6, 5], at: [0, 1.6, 0], player: [-9, 0] },
  { id: 'workstation', camera: [7.6, 3.4, -6.5], at: [12.7, 1.5, -12.7], player: [8, -8] },
  { id: 'ori', camera: [9.4, 2.3, 8.7], at: [13, 1.58, 12.5], player: [10.95, 10.45] },
  { id: 'library', space: 'library', camera: [0, 3.1, 7.6], at: [0, 1.5, -3], player: [0, 5] },
  { id: 'mobile', mobile: true, camera: [-114, 76, 27], at: [0, 5, 0], player: [-28, 0] },
];
const browser = await launchBrowser({ args: ['--force-high-performance-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const report = { label, date: new Date().toISOString(), browser: browser.version(), frames, views: [], isolation: [] };
try {
  for (const view of views) {
    const viewport = view.mobile ? { width: 390, height: 844 } : { width: 1440, height: 950 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: view.mobile ? 2 : 1, isMobile: !!view.mobile, hasTouch: !!view.mobile, reducedMotion: 'no-preference' });
    const origin = new URL(base).origin;
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const nativeRAF = requestAnimationFrame.bind(window);
      window.__bench = { nativeRAF, enabled: false, paused: false, cpu: [], intervals: [], last: null };
      window.requestAnimationFrame = callback => nativeRAF(now => {
        const b = __bench;
        if (callback.name !== 'loop') { callback(now); return; }
        b.callback = callback;
        if (b.paused) return;
        const start = performance.now();
        callback(now);
        if (b.enabled) {
          b.cpu.push(performance.now() - start);
          if (b.last !== null) b.intervals.push(now - b.last);
          b.last = now;
        }
      });
    });
    const url = new URL(base); url.searchParams.set('view', '3d'); if (view.space) url.searchParams.set('space', view.space);
    const start = performance.now();
    await page.goto(url.href, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__homeStartupError || document.body.classList.contains('text-blog') || (window.__home?.world && (!__home.world.pyramid || __home.world.pyramid.sceneryReady || __home.world.pyramid.error)), null, { timeout: 90000 });
    const failure = await page.evaluate(() => window.__homeStartupError || window.__home?.world.pyramid?.error || (!window.__home && 'Unexpected text fallback'));
    if (failure) throw new Error(JSON.stringify(failure));
    if (!view.space) await page.waitForFunction(() => __home.world.ori?.state?.ready || __home.stage.scene.getObjectByName('ori-vincentskc'), null, { timeout: 10000 }).catch(() => {});
    const readyMs = performance.now() - start;
    await finishOpening(page);
    await page.locator('#loading').waitFor({ state: 'detached' });
    const setup = await page.evaluate(async ({ view }) => {
      const h = __home, r = h.stage.renderer, gl = r.getContext(), b = __bench;
      h.setTimeMode('morning'); h.setWeatherMode('clear'); h.stage.settle();
      h.rig.skipIntro(); h.player.teleport(...view.player); h.rig.setFirstPerson(true); h.rig.showcase(view.camera, view.at);
      // Freeze resolution changes, including the adaptive governor, in this benchmark only.
      h.stage.setPixelRatio(view.mobile ? 1.25 : 1); h.stage.setPixelRatio = () => {};
      const debug = gl.getExtension('WEBGL_debug_renderer_info'), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      b.gpu = []; b.pending = []; b.draws = []; b.counter = 0;
      const render = h.stage.render;
      h.stage.render = () => {
        if (!b.enabled) { render(); return; }
        if (ext) {
          if (gl.getParameter(ext.GPU_DISJOINT_EXT)) { for (const q of b.pending) gl.deleteQuery(q); b.pending.length = 0; b.gpu.length = 0; }
          while (b.pending.length && gl.getQueryParameter(b.pending[0], gl.QUERY_RESULT_AVAILABLE)) {
            const q = b.pending.shift(); b.gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q);
          }
        }
        let q;
        if (ext && b.counter++ % 4 === 0) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
        render();
        if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); b.pending.push(q); }
        b.draws.push({ calls: r.info.render.calls, triangles: r.info.render.triangles });
      };
      b.start = () => { b.cpu = []; b.intervals = []; b.gpu = []; b.draws = []; b.last = null; b.enabled = true; };
      b.result = () => {
        b.enabled = false;
        const describe = values => {
          if (!values.length) return null;
          const sorted = [...values].sort((a, z) => a - z), mean = values.reduce((a, z) => a + z, 0) / values.length;
          return { samples: values.length, mean, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1], min: sorted[0], max: sorted.at(-1) };
        };
        return { rafMs: describe(b.intervals), cpuMs: describe(b.cpu), gpuMs: describe(b.gpu), calls: describe(b.draws.map(x => x.calls)), triangles: describe(b.draws.map(x => x.triangles)), stats: h.stats() };
      };
      return { gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), gpuTimer: !!ext, viewport: [innerWidth, innerHeight], dpr: r.getPixelRatio(), shadowSize: h.stage.sun.shadow.mapSize.toArray(), camera: h.stage.camera.position.toArray(), quality: h.stage.quality };
    }, { view });
    await page.waitForTimeout(1500);
    const rounds = [];
    for (let round = 0; round < 2; round++) {
      await page.evaluate(() => __bench.start());
      await page.waitForFunction(n => __bench.cpu.length >= n, frames, { timeout: 90000, polling: 100 });
      rounds.push(await page.evaluate(() => __bench.result()));
    }
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname, decoded: r.decodedBodySize, encoded: r.encodedBodySize, transfer: r.transferSize, ms: r.duration }));
      const nav = performance.getEntriesByType('navigation')[0];
      const media = entries.filter(r => /\.(mp3|ogg|wav|mp4)$/i.test(r.name));
      return { entries, decodedBytes: entries.reduce((n, r) => n + r.decoded, nav.decodedBodySize), encodedBytes: entries.reduce((n, r) => n + r.encoded, nav.encodedBodySize), transferBytes: entries.reduce((n, r) => n + r.transfer, nav.transferSize), sceneDecodedBytes: entries.filter(r => !media.includes(r)).reduce((n, r) => n + r.decoded, nav.decodedBodySize), mediaDecodedBytes: media.reduce((n, r) => n + r.decoded, 0), navigation: { domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd } };
    });
    // Pause the application only for deterministic comparison screenshots.
    await page.evaluate(() => { __bench.paused = true; }); await page.waitForTimeout(80);
    const poseFile = join(root, 'before', `${view.id}-pose.json`);
    const pose = existsSync(poseFile) ? JSON.parse(readFileSync(poseFile, 'utf8')) : null;
    const screenshotPose = await page.evaluate(pose => {
      const h = __home, seen = {}, captured = [];
      h.stage.scene.traverse(o => {
        if (!o.name) return;
        const key = `${o.name}#${seen[o.name] = (seen[o.name] || 0) + 1}`, saved = pose?.find(x => x.key === key);
        if (saved) { o.position.fromArray(saved.p); o.quaternion.fromArray(saved.q); o.scale.fromArray(saved.s); }
        const uniforms = o.material?.uniforms, values = {};
        for (const [k, u] of Object.entries(uniforms || {})) {
          if (saved?.u && k in saved.u) { if (typeof u.value === 'number') u.value = saved.u[k]; else u.value.fromArray?.(saved.u[k]); }
          if (typeof u.value === 'number') values[k] = u.value;
          else if (u.value?.isVector2 || u.value?.isVector3 || u.value?.isColor) values[k] = u.value.toArray();
        }
        captured.push({ key, p: o.position.toArray(), q: o.quaternion.toArray(), s: o.scale.toArray(), u: values });
      });
      h.stage.render(); return captured;
    }, pose);
    if (!pose) writeFileSync(join(out, `${view.id}-pose.json`), JSON.stringify(screenshotPose));
    await page.screenshot({ path: join(out, `${view.id}.png`) });
    const renderBatchMs = await page.evaluate(() => {
      const h = __home, gl = h.stage.renderer.getContext(), samples = [];
      // Supplement capped RAF and asynchronous GPU timers with synchronized
      // repeated draws of the unchanged camera. This is render throughput,
      // not interactive FPS or a replacement for the main-loop measurements.
      for (let i = 0; i < 20; i++) h.stage.render(); gl.finish();
      for (let round = 0; round < 7; round++) {
        const start = performance.now();
        for (let i = 0; i < 60; i++) h.stage.render();
        gl.finish(); samples.push((performance.now() - start) / 60);
      }
      return samples;
    });
    const pairedCulling = await page.evaluate(async () => {
      const h = __home, group = h.stage.scene.getObjectByName('NewHeaven-original-surroundings');
      if (!group) return null;
      const lod = group.getObjectByName('original-facade-1-batches');
      if (!lod) return null;
      const regions = lod.levels[0].object, whole = lod.levels[1].object;
      lod.autoUpdate = false;
      const gl = h.stage.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const mode = partitioned => { whole.visible = !partitioned; regions.visible = partitioned; };
      for (const partitioned of [false, true]) { mode(partitioned); for (let i = 0; i < 30; i++) h.stage.render(); gl.finish(); }
      const result = { whole: [], partitioned: [] };
      for (let round = 0; round < 8; round++) for (const partitioned of round % 2 ? [true, false] : [false, true]) {
        mode(partitioned); gl.finish();
        const query = ext && gl.createQuery(); if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        const start = performance.now(); for (let i = 0; i < 60; i++) h.stage.render();
        if (query) gl.endQuery(ext.TIME_ELAPSED_EXT);
        gl.finish(); const ms = (performance.now() - start) / 60;
        let gpuMs = null;
        if (query) {
          const deadline = performance.now() + 3000;
          while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE) && performance.now() < deadline) await new Promise(__bench.nativeRAF);
          if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(ext.GPU_DISJOINT_EXT)) gpuMs = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 / 60;
          gl.deleteQuery(query);
        }
        result[partitioned ? 'partitioned' : 'whole'].push({ ms, gpuMs, calls: h.stage.renderer.info.render.calls, triangles: h.stage.renderer.info.render.triangles });
      }
      lod.autoUpdate = true; lod.update(h.stage.camera);
      return result;
    });
    const inventory = await page.evaluate(() => {
      const result = []; __home.stage.scene.traverse(o => { if (o.isMesh) result.push({ name: o.name, parent: o.parent?.name, triangles: (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3, material: o.material.name, side: o.material.side, transparent: o.material.transparent, singlePass: o.material.forceSinglePass }); }); return result;
    });
    report.views.push({ ...view, viewport, setup, readyMs, rounds, renderBatchMs, pairedCulling, resources, errors, inventory });
    console.log(JSON.stringify({ view: view.id, gpu: setup.gpu, readyMs: Math.round(readyMs), rounds: rounds.map(r => ({ fps: 1000 / r.rafMs.mean, p95: r.rafMs.p95, cpu: r.cpuMs.mean, gpu: r.gpuMs?.mean, calls: r.calls.median, triangles: r.triangles.median })), batchMs: renderBatchMs, bytes: resources.sceneDecodedBytes, errors }));
    if (view.id === 'exterior' && label === 'before') {
      // Restart the app loop, isolate one family at a time; never mutate source.
      await page.evaluate(() => { __bench.paused = false; __bench.nativeRAF(__bench.callback); });
      for (const target of ['scenery', 'courtyard', 'glass']) {
        await page.evaluate(target => {
          const scene = __home.stage.scene;
          __bench.hidden = [];
          scene.traverse(o => {
            if ((target === 'scenery' && o.name === 'NewHeaven-original-surroundings') || (target === 'courtyard' && o.name === 'NewHeaven-courtyard') || (target === 'glass' && o.isMesh && o.name.includes('glass'))) { __bench.hidden.push([o, o.visible]); o.visible = false; }
          });
        }, target);
        await page.waitForTimeout(500); await page.evaluate(() => __bench.start());
        await page.waitForFunction(n => __bench.cpu.length >= n, frames, { timeout: 90000, polling: 100 });
        const result = await page.evaluate(() => __bench.result()); report.isolation.push({ target, result });
        await page.evaluate(() => { for (const [o, visible] of __bench.hidden) o.visible = visible; });
        console.log(JSON.stringify({ isolation: target, calls: result.calls.median, triangles: result.triangles.median, cpu: result.cpuMs.mean, gpu: result.gpuMs?.mean }));
      }
    }
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
    await context.close();
  }
} finally { await browser.close(); }
