import { launchBrowser, finishOpening } from './browser.mjs';
import assert from 'node:assert/strict';

const url = process.argv[2] || 'http://127.0.0.1:8765/';
const browser = await launchBrowser();
const failures = [];
try {
  async function openPage() {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForFunction(() => window.__home?.rig && window.__home?.world.pyramid.sceneryReady, null, { timeout: 60000 });
    // The world handle exists during shader warmup. Clicks must reach the
    // actual canvas after the loading veil has left, including on software GPU.
    await page.locator('#loading').waitFor({ state: 'detached', timeout: 60000 });
    return { context, page };
  }
  const player = page => page.evaluate(() => window.__home.player.pos.toArray().map(v => +v.toFixed(2)));
  const camera = page => page.evaluate(() => {
    const h = window.__home, c = h.stage.camera.position, p = h.player.pos;
    return { position: c.toArray().map(v => +v.toFixed(1)), distance: +c.distanceTo(p).toFixed(1) };
  });
  const settle = page => page.evaluate(() => {
    const h = window.__home;
    for (let i = 0; i < 300; i++) { h.rig.update(1 / 60, h.player); h.extras.update(1 / 60); }
  });

  let activeContext;
  try {
    // A first click while the opening shot is still running hands control over
    // immediately; the deferred pyramid overview must not fly back to the intro.
    const { context, page } = await openPage();
    activeContext = context;
    await page.waitForFunction(() => window.__home.rig.introActive, null, { timeout: 15000 });
    const before = await player(page);
    await page.mouse.click(640, 400);
    await page.waitForFunction(() => window.__home.rig.introSkipped);
    await settle(page);
    assert.equal(await page.evaluate(() => window.__home.rig.introActive), false, 'the opening shot ended');
    assert.equal(await page.evaluate(() => window.__home.rig.showcaseActive), false, 'no overview takes over after the click');
    const view = await camera(page);
    assert.ok(view.position[1] < 12 && view.distance < 20, `the camera stays with the player, not at the intro: ${JSON.stringify(view)}`);
    assert.deepEqual(await player(page), before, 'a cut-short opening click does not move the player');
    console.log('PASS a click during the opening hands control over without an overview');
    await context.close();
  } catch (error) {
    failures.push(`skip: ${error.message}`);
    console.log(`FAIL skip: ${error.message}`);
  } finally {
    await activeContext?.close(); activeContext = null;
  }

  try {
    // An untouched opening still hands over to the island overview, and a
    // click dismisses it rather than leaving the overview running.
    const { context, page } = await openPage();
    activeContext = context;
    await finishOpening(page);
    await page.waitForFunction(() => window.__home.rig.showcaseActive, null, { timeout: 10000 });
    await page.mouse.click(640, 400);
    assert.equal(await page.evaluate(() => window.__home.rig.showcaseActive), false, 'the click dismisses the overview');
    await settle(page);
    assert.equal(await page.evaluate(() => window.__home.rig.showcaseActive), false, 'the overview stays dismissed');
    console.log('PASS the untouched overview still plays and a click dismisses it');
    await context.close();
  } catch (error) {
    failures.push(`overview: ${error.message}`);
    console.log(`FAIL overview: ${error.message}`);
  } finally {
    await activeContext?.close(); activeContext = null;
  }
} finally {
  await browser.close();
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('Opening handoff passes: the first click takes control, the deferred overview never steals it back.');
