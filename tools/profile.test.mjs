import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));

test('About renders supplied identities and their exact social destinations', async () => {
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
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/about/`);
    assert.equal(await page.locator('h1').textContent(), 'Aletheia');
    assert.equal(await page.locator('[data-profile-bio]').isVisible(), false);
    assert.equal(await page.getByRole('link', { name: /GitHub/ }).getAttribute('href'), 'https://github.com/Aletheiar');
    assert.equal(await page.getByRole('link', { name: /水源/ }).getAttribute('href'), 'https://shuiyuan.sjtu.edu.cn/u/%E7%94%A8%E6%88%B7%E5%90%8D%E8%BF%9D%E8%A7%84106372/summary');
    assert.equal(await page.locator('[data-platform="zhihu"]').textContent().then(text => text.includes('今夕何夕')), true);
    assert.equal(await page.locator('[data-platform="zhihu"] a').getAttribute('href'), 'https://www.zhihu.com/people/69-57-39-60');
    assert.equal(await page.getByRole('link', { name: '返回大厅' }).first().getAttribute('href'), '/?space=hub&return=1');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    await page.evaluate(async () => {
      const { renderProfile } = await import('/about/about.js');
      renderProfile({ displayName: '<img src=x onerror="window.injected=1">', bio: '', accounts: [] });
    });
    assert.equal(await page.locator('h1').textContent(), '<img src=x onerror="window.injected=1">');
    assert.equal(await page.locator('h1 img').count(), 0);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
