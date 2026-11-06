import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/interface';
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const report = [];
const views = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'small-phone', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
  { name: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
];
try {
  for (const view of views) {
    const context = await browser.newContext(view);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = async () => {
      await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady || window.__home?.world.roomReady, null, { timeout: 60000 });
      await finishOpening(page);
      await page.locator('#loading').waitFor({ state: 'detached' });
      await page.evaluate(() => { for (let i = 0; i < 90; i++) { __home.rig.update(1 / 60, __home.player); __home.extras.update(1 / 60); } });
    };
    await page.goto(base); await ready();

    // Auxiliary controls must not cover the initial scene.
    assert.equal(await page.locator('#minimap').isVisible(), false, 'the map starts inside collapsed exploration tools');
    assert.equal(await page.locator('#corner').isVisible(), false, 'environment and camera switches start collapsed');
    assert.equal(await page.locator('.explore-hint').isVisible(), false, 'instructions do not permanently cover the scene');
    await page.screenshot({ path: `${out}/${view.name}-overview.png` });
    const layout = await page.evaluate(() => {
      const selectors = ['.pyramid-brand', '.site-utilities', '#hotbar', '.pyramid-actions'];
      const boxes = selectors.map(selector => {
        const element = document.querySelector(selector), r = element.getBoundingClientRect();
        return { selector, x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      }).filter(r => r.width && r.height);
      return { width: innerWidth, height: innerHeight, boxes, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(layout.overflow, false);
    for (const r of layout.boxes) {
      assert.ok(r.x >= 0 && r.right <= layout.width + 1 && r.y >= 0 && r.bottom <= layout.height + 1, `${r.selector} fits the viewport`);
      for (const other of layout.boxes.filter(b => b !== r)) {
        assert.ok(r.right <= other.x || other.right <= r.x || r.bottom <= other.y || other.bottom <= r.y, `${r.selector} does not overlap ${other.selector}`);
      }
    }

    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#bigmap').isVisible(), false, 'Tab navigates page controls instead of opening the map');
    await page.locator('#hotbar [data-station="welcome"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#panel').evaluate(p => p.open), true, 'Enter activates the focused navigation button');
    await page.locator('#panel .close').click();
    await page.locator('#hotbar').waitFor({ state: 'visible' });
    await page.locator('#hotbar [data-station="welcome"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#panel').evaluate(p => p.open), true, 'Space activates the focused navigation button');
    await page.locator('#panel .close').click();

    await page.locator('#scene-tools > summary').click();
    assert.equal(await page.locator('#minimap').isVisible(), true, 'the map remains available on demand');
    const before = await page.evaluate(() => __home.player.pos.toArray());
    await page.keyboard.down('w'); await page.waitForTimeout(200); await page.keyboard.up('w');
    assert.deepEqual(await page.evaluate(() => __home.player.pos.toArray()), before, 'typing shortcuts in tools must not move the visitor');
    await page.locator('#moodButton').click();
    await page.locator('#weatherMenu [data-time="night"]').click();
    const contrast = await page.locator('#weatherMenu .now').evaluate(element => {
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255)
        .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const a = luminance(getComputedStyle(element).color);
      const b = luminance(getComputedStyle(document.querySelector('#scene-tools-content')).backgroundColor);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    assert.ok(contrast >= 4.5, 'weather text remains readable against the drawer at night');
    await page.locator('#weatherMenu [data-time="morning"]').click();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${out}/${view.name}-tools.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#minimap').isVisible(), false);

    await page.locator('#enter-button').click(); await page.waitForTimeout(200);
    await page.waitForFunction(() => {
      const { camera } = __home.stage;
      return Math.hypot(camera.position.x - __home.player.pos.x, camera.position.z - __home.player.pos.z) < .1
        && camera.getWorldDirection(camera.position.clone()).x > .98;
    });
    assert.equal(await page.locator('#enter-button').isVisible(), false, 'the enter action steps aside once inside');
    await page.screenshot({ path: `${out}/${view.name}-hall.png` });
    const readingAt = await page.evaluate(() => __home.player.pos.toArray());
    for (const id of ['blog', 'works', 'writing']) {
      await page.locator(`#hotbar [data-station="${id}"]`).click();
      await page.waitForFunction(id => document.querySelector('#panel').open && document.querySelector('#panel').dataset.station === id, id);
      assert.deepEqual(await page.evaluate(() => __home.player.pos.toArray()), readingAt, 'reading navigation does not move the visitor');
      await page.locator('#panel .body > p').first().click();
      assert.equal(await page.locator('#panel').evaluate(p => p.open), true, 'reading text does not dismiss its card');
      if (id === 'blog') await page.screenshot({ path: `${out}/${view.name}-reading.png` });
      await page.locator('#panel .close').click();
    }
    for (const [id, path] of [['about', '/about/'], ['friends', '/friends/']]) {
      await page.locator(`#hotbar [data-station="${id}"]`).click();
      await page.waitForURL(url => url.pathname === path, { timeout: 5000 });
      assert.equal(await page.locator('main').isVisible(), true, `${id} opens its content immediately`);
      await page.locator('[data-return-hub]').click(); await ready();
      const returned = await page.evaluate(() => __home.player.pos.toArray());
      assert.ok(Math.hypot(returned[0] - readingAt[0], returned[2] - readingAt[2]) < .2, 'direct navigation preserves the hall return position');
    }
    await page.locator('#hotbar [data-station="writing"]').click();
    await page.locator('#panel a[href="/?space=library"]').click();
    await page.waitForURL(url => url.searchParams.get('space') === 'library');
    await ready();
    await page.locator('#hotbar [data-station="back"]').click(); await ready();
    const fromLibrary = await page.evaluate(() => __home.player.pos.toArray());
    assert.ok(Math.hypot(fromLibrary[0] - readingAt[0], fromLibrary[2] - readingAt[2]) < .2, 'in-card links preserve the same hall return position');
    await page.locator('.reading-link').click();
    await page.waitForFunction(() => document.body.classList.contains('plain'));
    assert.equal(await page.locator('#world canvas').count(), 0, 'text navigation does not initialize WebGL');
    assert.deepEqual(errors, []);
    report.push({ name: view.name, layout, errors });
    await context.close();
    console.log(`${view.name}: collapsed tools, input blocking, direct navigation, return position and reading passed.`);
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
