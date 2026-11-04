// The service fixture only isolates the network; assertions cover our public
// integration contract, visible error handling and ordinary station picking.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';
const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/guestbook'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser(), report = [];
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport }), page = await context.newPage(), errors = [];
    const scripts = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://giscus.app/**', route => {
      if (new URL(route.request().url()).pathname === '/client.js') scripts.push(route.request().url());
      return route.abort();
    });
    await page.goto(base);
    await page.waitForFunction(() => window.__home?.world.pyramid?.sceneryReady, null, { timeout: 60000 });
    await finishOpening(page); await page.locator('#return-button').click();
    assert.equal(scripts.length, 0, 'The guestbook service is lazy-loaded');
    await page.evaluate(async () => {
      const { STATIONS } = await import('/world/layout.js');
      const station = STATIONS.find(s => s.id === 'observatory');
      __home.player.teleport(...station.at, station);
      __home.rig.showcase([-22, 4, 14], [-28, 1, 9]);
      for (let i = 0; i < 90; i++) __home.rig.update(1 / 60, __home.player);
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/${viewport.width}-kiosk.png` });
    const sign = await page.evaluate(() => __home.project(-26.5, 1.4, 9));
    await page.mouse.click(sign.x, sign.y);
    await page.waitForFunction(() => document.querySelector('#panel').open && document.querySelector('#panel').dataset.station === 'observatory');
    const embedded = page.frameLocator('#panel .body > iframe');
    await embedded.locator('[data-guestbook-status][data-state="error"]').waitFor();
    const config = await embedded.locator('script[data-repo]').evaluate(script => ({
      src: script.src, repo: script.dataset.repo, repoId: script.dataset.repoId,
      category: script.dataset.category, categoryId: script.dataset.categoryId,
      mapping: script.dataset.mapping, term: script.dataset.term, lang: script.dataset.lang,
    }));
    assert.equal(config.src, 'https://giscus.app/client.js');
    assert.equal(config.repo, 'Aletheiar/homecraft');
    assert.ok(config.repoId && config.categoryId, 'The real public repo and category IDs are configured');
    assert.equal(config.mapping, 'specific', 'Local/online pages share one guestbook');
    assert.equal(config.term, '庭院留言簿'); assert.equal(config.lang, 'zh-CN');
    assert.match(await embedded.locator('[data-guestbook-github]').getAttribute('href'), /^https:\/\/github\.com\/Aletheiar\/homecraft\/discussions/);
    assert.equal(await embedded.locator('[data-guestbook-retry]').isVisible(), true);
    assert.match(await embedded.locator('body').innerText(), /GitHub/);
    assert.equal(await embedded.locator('body').evaluate(body => body.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${out}/${viewport.width}-card.png` });
    // giscus uses target=_top for OAuth. A real user click in this trusted
    // same-origin embed must be allowed to leave the three-dimensional card.
    await embedded.locator('body').evaluate((body, href) => {
      const link = document.createElement('a'); link.href = href; link.target = '_top';
      link.textContent = 'Authentication return fixture'; body.append(link);
    }, new URL('guestbook/?from=direct', base).href);
    await embedded.getByRole('link', { name: 'Authentication return fixture' }).click({ noWaitAfter: true });
    await page.waitForURL('**/guestbook/?from=direct', { timeout: 4000 });
    await page.locator('[data-guestbook-status][data-state="error"]').waitFor();
    assert.equal(await page.locator('script[data-repo]').getAttribute('data-term'), '庭院留言簿');
    assert.equal(await page.locator('[data-guestbook-back]').isVisible(), true);
    await page.locator('[data-guestbook-retry]').click();
    await page.locator('[data-guestbook-status][data-state="error"]').waitFor();
    assert.equal(scripts.length, 3, 'Retry performs one clean widget load');
    // A remote page does not receive the trusted local page's OAuth permission.
    await page.route('https://untrusted-embed.example/**', route => route.fulfill({ contentType: 'text/html', body: `<a target="_top" href="${new URL('?escaped=1', base).href}">Leave the site</a>` }));
    await page.evaluate(async () => {
      const { mountEmbed } = await import('/engine/ui/embed.js');
      const body = document.createElement('div'); body.id = 'remote-policy'; document.body.append(body);
      mountEmbed(body, new URL('https://untrusted-embed.example/frame'), 'Untrusted remote page');
    });
    await page.frameLocator('#remote-policy iframe').getByRole('link', { name: 'Leave the site' }).click({ noWaitAfter: true });
    const escaped = await page.waitForURL(url => url.searchParams.has('escaped'), { timeout: 800 }).then(() => true, () => false);
    assert.equal(escaped, false, 'Remote embeds cannot replace the top-level page');
    assert.deepEqual(errors, []);
    report.push({ viewport, config, errors, scripts: scripts.length });
    await context.close();
  }
} finally { await browser.close(); writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2)); }
console.log('Guestbook station picking, shared mapping, offline fallback, retry and desktop/mobile layout passed.');
