// Local hosting fixture: verify built native modules and negotiated gzip bytes.
// This does not test the deployed host's compression or cache configuration.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { launchBrowser } from './browser.mjs';
const root = resolve('dist'), out = 'tools/.check/performance/build-loading.json';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.md': 'text/markdown; charset=utf-8' };
async function host(compressed) {
  const server = createServer((req, res) => {
    let file;
    try { file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
    catch { res.writeHead(400).end(); return; }
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
    const gzip = compressed && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && existsSync(file + '.gz');
    const source = gzip ? file + '.gz' : file;
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': statSync(source).size, 'Cache-Control': 'no-cache', 'Vary': 'Accept-Encoding', ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) });
    createReadStream(source).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
const raw = await host(false), gzip = await host(true), browser = await launchBrowser(), results = [];
try {
  for (let round = 0; round < 3; round++) for (const [mode, fixture] of round % 2 ? [['gzip', gzip], ['raw', raw]] : [['raw', raw], ['gzip', gzip]]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } }), page = await context.newPage(), errors = [], headers = {};
    const origin = new URL(fixture.url).origin;
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', async response => { if (response.url().endsWith('.glb')) headers[new URL(response.url()).pathname] = await response.allHeaders(); });
    const start = performance.now(); await page.goto(fixture.url + '?view=3d');
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady && __home.world.ori?.state.ready, null, { timeout: 60000 });
    const readyMs = performance.now() - start;
    const resources = await page.evaluate(() => {
      const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].filter(r => !/\.(mp3|ogg|wav|mp4)(\?|$)/i.test(r.name));
      return { encodedBytes: entries.reduce((n,r) => n+r.encodedBodySize,0), decodedBytes: entries.reduce((n,r) => n+r.decodedBodySize,0), models: entries.filter(r => r.name.endsWith('.glb')).map(r => ({ path: new URL(r.name).pathname, encoded: r.encodedBodySize, decoded: r.decodedBodySize })) };
    });
    assert.equal(resources.models.length, 3); assert.deepEqual(errors, []);
    for (const model of resources.models) {
      const path = 'dist' + model.path;
      assert.equal(model.decoded, statSync(path).size);
      assert.equal(model.encoded, statSync(path + (mode === 'gzip' ? '.gz' : '')).size);
      assert.equal(headers[model.path]['content-type'], 'model/gltf-binary');
      if (mode === 'gzip') { assert.equal(headers[model.path]['content-encoding'], 'gzip'); assert.equal(headers[model.path].vary, 'Accept-Encoding'); }
    }
    results.push({ round, mode, readyMs, ...resources }); await context.close();
  }
  writeFileSync(out, JSON.stringify({ fixture: 'Local dist/ with fresh browser contexts; external requests blocked; audio excluded; gzip negotiation is not deployment validation.', results }, null, 2));
  console.log(JSON.stringify(results.map(({ round, mode, readyMs, encodedBytes, decodedBytes }) => ({ round, mode, readyMs, encodedBytes, decodedBytes }))));
} finally { await browser.close(); await Promise.all([new Promise(r => raw.server.close(r)), new Promise(r => gzip.server.close(r))]); }
