import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = new URL('./.check/', import.meta.url);

test('Friends lists every entry from list.js and treats names as text', async () => {
  await mkdir(shots, { recursive: true });
  const server = createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const path = resolve(root, `.${pathname}`);
      if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) throw new Error('Invalid path');
      const content = await readFile(path);
      response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}/friends/`);
    const listed = await page.evaluate(async () => {
      const { FRIEND_LINKS } = await import('/friends/list.js');
      const cards = [...document.querySelectorAll('[data-friend-links] a')];
      return {
        title: document.title,
        heading: document.querySelector('h1').textContent,
        count: cards.length,
        rendered: cards.map(card => card.getAttribute('href')),
        expected: FRIEND_LINKS.map(link => link.url),
        countLabel: document.querySelector('[data-friend-count]').textContent,
        opensNewTab: cards.every(card => card.target === '_blank' && card.rel.includes('noopener')),
        returnHref: document.querySelector('[data-return-hub]').getAttribute('href'),
        wide: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(listed.heading, '其他人的博客');
    assert.equal(listed.count, listed.expected.length);
    assert.deepEqual(listed.rendered, listed.expected);
    assert.ok(listed.countLabel.includes(String(listed.count)), listed.countLabel);
    assert.equal(listed.opensNewTab, true);
    assert.equal(listed.returnHref, '/?space=hub&return=1');
    assert.equal(listed.wide, false);
    await page.screenshot({ path: fileURLToPath(new URL('links-mobile.png', shots)), fullPage: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: fileURLToPath(new URL('links-desktop.png', shots)), fullPage: true });

    // An entry is data, not markup: a hostile name or note must stay literal.
    await page.evaluate(async () => {
      const { renderLinks } = await import('/friends/friends.js');
      renderLinks([{ name: '<img src=x onerror="window.injected=1">', url: 'https://example.com/', note: '<b>x</b>' }]);
    });
    assert.equal(await page.locator('.friend-name').first().textContent(), '<img src=x onerror="window.injected=1">');
    assert.equal(await page.locator('.friend-card img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
