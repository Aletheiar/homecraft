// 随笔图书室：两区布局 + 二维阅读层的桌面/移动端检查。
// 运行前先启动预览：node tools/check-library.mjs http://127.0.0.1:3506/
import { finishOpening, launchBrowser } from './browser.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/library';
mkdirSync(out, { recursive: true });

const browser = await launchBrowser();
const errors = [], results = [];
async function check(name, fn) {
  try { results.push({ name, passed: true, detail: await fn() }); console.log(`PASS: ${name}`); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.log(`FAIL: ${name}: ${e.message}`); }
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 950 } });
desktop.on('pageerror', e => errors.push(e.message));

async function ready(page) {
  await page.waitForFunction(() => window.__homeStartupError || window.__home?.world.roomReady, null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__homeStartupError || null), null);
  await finishOpening(page);
  await page.evaluate(() => __home.extras.update(1));
}
// 相机对准某一处，等几帧再截图。
async function look(page, from, at) {
  await page.evaluate(([from, at]) => {
    __home.player.cancel(); __home.rig.skipIntro(); __home.rig.setFirstPerson(false);
    __home.rig.showcase(from, at);
    for (let i = 0; i < 90; i++) __home.rig.update(1 / 60, __home.player);
  }, [from, at]);
  await page.waitForTimeout(150);
}

try {
  await desktop.goto(`${base}?space=library`);
  await ready(desktop);
  await desktop.evaluate(() => { __home.setWeatherMode?.('clear'); __home.setTimeMode?.('day'); });
  await look(desktop, [0, 3.1, 7.6], [0, 1.5, -3]);
  await desktop.screenshot({ path: `${out}/desktop-aisle.png` });
  await look(desktop, [-3.2, 2.4, 3.4], [-8.6, 1.5, -7.6]);
  await desktop.screenshot({ path: `${out}/desktop-collected.png` });
  await look(desktop, [3.2, 2.4, 3.4], [8.4, 1.5, -7.6]);
  await desktop.screenshot({ path: `${out}/desktop-written.png` });
  await look(desktop, [-2.4, 1.9, 1.2], [-9.8, 2.2, -6.4]);
  await desktop.screenshot({ path: `${out}/desktop-collected-cabinet.png` });
  await look(desktop, [2.4, 1.9, 1.2], [9.8, 2.2, -6.4]);
  await desktop.screenshot({ path: `${out}/desktop-written-desk.png` });
  await look(desktop, [9.5, 4.7, 8.6], [0, 1.4, -3]);
  await desktop.screenshot({ path: `${out}/desktop-overview.png` });

  await check('both halves of the room expose a catalog hotspot', async () => {
    const ids = await desktop.evaluate(async () => {
      const { STATIONS } = await import('/world/rooms/layout.js');
      return STATIONS.map(s => s.id);
    });
    assert.deepEqual(ids, ['collected', 'written']);
    return ids;
  });

  // 走近展牌点一下：这是访客最自然的入口，必须真的能开。
  await check('clicking the zone sign in the room opens that catalog', async () => {
    const pt = await desktop.evaluate(id => {
      const [x, y, z] = __home.hotspot(id);
      __home.player.cancel(); __home.rig.skipIntro(); __home.rig.setFirstPerson(false);
      __home.player.teleport(x * .55, z + 6.5);
      __home.rig.showcase([x * .55, 2, z + 6.5], [x, y, z]);
      for (let i = 0; i < 90; i++) __home.rig.update(1 / 60, __home.player);
      return __home.project(x, y, z);
    }, 'written');
    await desktop.waitForTimeout(150);
    await desktop.mouse.click(pt.x, pt.y);
    await desktop.waitForSelector('#panel[open] .lib .lib-card', { timeout: 5000 });
    assert.equal(await desktop.locator('#panelTitle').textContent(), '我的原创');
    await desktop.keyboard.press('Escape');
    await desktop.waitForFunction(() => !document.querySelector('#panel')?.open);
    return 'sign click';
  });

  // Dock 上的两个按钮同样要落到目录，而不是只跑到位置。
  await check('dock buttons open both catalogs', async () => {
    for (const [id, title] of [['collected', '我的收藏'], ['written', '我的原创']]) {
      await desktop.click(`#hotbar [data-station="${id}"]`);
      await desktop.waitForSelector('#panel[open] .lib .lib-card', { timeout: 5000 });
      assert.equal(await desktop.locator('#panelTitle').textContent(), title);
      await desktop.keyboard.press('Escape');
      await desktop.waitForFunction(() => !document.querySelector('#panel')?.open);
    }
    return 'collected + written';
  });

  await check('collected catalog renders cards, comments and original links', async () => {
    await desktop.evaluate(() => { __home.player.teleport(-4, -1.2); __home.openPage('collected'); });
    await desktop.waitForSelector('#panel .lib .lib-card');
    assert.equal(await desktop.locator('#panel').getAttribute('data-render'), 'library');
    assert.equal(await desktop.locator('#panelTitle').textContent(), '我的收藏');
    const chips = await desktop.locator('#panel .lib-chips button').allTextContents();
    assert.ok(chips.length >= 5, chips.join('|'));
    const card = await desktop.evaluate(() => {
      const first = document.querySelector('#panel .lib .lib-card');
      return {
        title: first.querySelector('.lib-title').textContent,
        hasLink: !!first.querySelector('a.lib-link'),
        link: first.querySelector('a.lib-link')?.getAttribute('href'),
        target: first.querySelector('a.lib-link')?.getAttribute('target'),
        comment: first.querySelector('.lib-quote')?.textContent || '',
      };
    });
    assert.equal(card.hasLink, true);
    assert.match(card.link, /^https:\/\//);
    assert.equal(card.target, '_blank');
    assert.match(card.comment, /评论/);
    await desktop.waitForTimeout(450);
    await desktop.screenshot({ path: `${out}/desktop-catalog-collected.png` });
    return card;
  });

  await check('search and type filter narrow the collected list', async () => {
    const before = await desktop.locator('#panel .lib .lib-card').count();
    await desktop.locator('#panel .lib-chips button[data-chip="book"]').click();
    const filtered = await desktop.locator('#panel .lib .lib-card').count();
    assert.ok(filtered < before && filtered >= 1, `${filtered}/${before}`);
    await desktop.locator('#panel .lib-chips button[data-chip="all"]').click();
    await desktop.locator('#panel .lib input[type="search"]').fill('homecraft');
    const searched = await desktop.locator('#panel .lib .lib-card').count();
    assert.equal(searched, 1);
    await desktop.locator('#panel .lib input[type="search"]').fill('');
    assert.equal(await desktop.locator('#panel .lib .lib-card').count(), before);
    return { before, filtered, searched };
  });

  await check('written catalog reads a Markdown article in place, then returns', async () => {
    await desktop.locator('#panel .lib [role="tab"][data-view="written"]').click();
    await desktop.waitForSelector('#panel .lib [data-post="reading-room"]');
    assert.equal(await desktop.locator('#panelTitle').textContent(), '我的原创');
    assert.equal(await desktop.locator('#panel .lib .lib-card').count(), 4);
    await desktop.locator('#panel .lib [data-post="reading-room"] .lib-read').click();
    assert.equal(await desktop.locator('#panel .lib-list').isVisible(), false);
    assert.equal(await desktop.locator("#panel .lib-prose h2").count(), 3);
    assert.equal(await desktop.locator('#panel .lib-prose pre code').count(), 1);
    await desktop.waitForTimeout(450);
    await desktop.screenshot({ path: `${out}/desktop-reader-markdown.png` });
    await desktop.locator('#panel .lib .lib-back').click();
    assert.equal(await desktop.locator('#panel .lib-list').isVisible(), true);
    return true;
  });

  await check('written catalog opens a legacy article page without leaving the room', async () => {
    await desktop.locator('#panel .lib [data-post="first-visit"] .lib-read').click();
    const frame = desktop.locator('#panel .lib-frame');
    await frame.waitFor();
    assert.equal(new URL(await frame.getAttribute('src')).pathname, '/articles/first-visit.html');
    assert.match(await frame.contentFrame().locator('main h1').innerText(), /把个人网站/);
    await desktop.locator('#panel .lib .lib-back').click();
    await desktop.locator('#panel .close').click();
    assert.equal(await desktop.locator('#panel').evaluate(e => e.open), false);
    return true;
  });

  await check('catalog closes with Escape and leave the room usable', async () => {
    await desktop.evaluate(() => { __home.player.teleport(-4, -1.2); __home.openPage('collected'); });
    await desktop.waitForSelector('#panel .lib');
    await desktop.keyboard.press('Escape');
    assert.equal(await desktop.locator('#panel').evaluate(e => e.open), false);
    const standing = await desktop.evaluate(() => __home.nav.canStand(__home.player.pos.x, __home.player.pos.z));
    assert.equal(standing, true);
    return true;
  });

  await check('draw calls and triangles stay inside the budget', async () => {
    await desktop.evaluate(() => { __home.rig.setFirstPerson(false); __home.rig.showcase([0, 4.2, 8], [0, 1.4, -4]); for (let i = 0; i < 60; i++) __home.rig.update(1 / 60, __home.player); });
    const stats = await desktop.evaluate(() => __home.stats());
    assert.ok(stats.calls <= 60, `draw calls ${stats.calls}`);
    assert.ok(stats.triangles <= 200000, `triangles ${stats.triangles}`);
    return stats;
  });

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  phone.on('pageerror', e => errors.push(e.message));
  await phone.goto(`${base}?space=library`);
  await ready(phone);
  await phone.evaluate(() => { __home.setWeatherMode?.('clear'); __home.setTimeMode?.('day'); });
  await look(phone, [0, 3.4, 7.4], [0, 1.5, -3]);
  await phone.screenshot({ path: `${out}/phone-aisle.png` });

  await check('catalogs work on a phone without horizontal overflow', async () => {
    await phone.evaluate(() => { __home.player.teleport(-4, -1.2); __home.openPage('collected'); });
    await phone.waitForSelector('#panel .lib .lib-card');
    const overflow = await phone.evaluate(() => {
      const lib = document.querySelector('#panel .lib');
      const panel = document.querySelector('#panel');
      return {
        lib: lib.scrollWidth - lib.clientWidth,
        panel: panel.getBoundingClientRect().width,
        viewport: window.innerWidth,
      };
    });
    assert.ok(overflow.lib <= 1, JSON.stringify(overflow));
    assert.ok(overflow.panel <= overflow.viewport, JSON.stringify(overflow));
    await phone.waitForTimeout(450);
    await phone.screenshot({ path: `${out}/phone-catalog-collected.png` });
    await phone.locator('#panel .lib [role="tab"][data-view="written"]').click();
    await phone.waitForSelector('#panel .lib [data-post="reading-room"]');
    await phone.waitForTimeout(450);
    await phone.screenshot({ path: `${out}/phone-catalog-written.png` });
    await phone.locator('#panel .lib [data-post="reading-room"] .lib-read').click();
    assert.equal(await phone.locator('#panel .lib-prose').count(), 1);
    await phone.waitForTimeout(450);
    await phone.screenshot({ path: `${out}/phone-reader-markdown.png` });
    return overflow;
  });
} finally {
  writeFileSync(`${out}/library-report.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
assert.equal(errors.length, 0, errors.join('\n'));
assert.ok(results.every(r => r.passed), 'Library verification failed');
