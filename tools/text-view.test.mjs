import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseView, viewURL } from '../world/view-mode.js';
import { renderMarkdown } from '../world/library/markdown.js';

test('phones prefer reading in either orientation and desktop retains 3D', () => {
  for (const [width, height] of [[390, 844], [568, 320], [320, 568]]) {
    assert.equal(chooseView('', { touch: true, width, height }), 'text');
  }
  assert.equal(chooseView('', { touch: false, width: 390, height: 844 }), '3d');
  assert.equal(chooseView('', { touch: true, width: 768, height: 1024 }), '3d');
});

test('explicit view choices override device defaults and previous choices', () => {
  assert.equal(chooseView('?plain=1', { preferred: '3d' }), 'text');
  assert.equal(chooseView('?view=3d', { touch: true, width: 390, preferred: 'text' }), '3d');
  assert.equal(chooseView('', { preferred: 'text' }), 'text');
  assert.equal(chooseView('', { touch: true, width: 390, preferred: '3d' }), '3d');
});

test('switch links preserve room queries without carrying contradictory modes', () => {
  const url = viewURL('https://example.test/?space=library&plain=1#/written/post', '3d');
  assert.equal(url.href, 'https://example.test/?space=library&view=3d');
  assert.equal(viewURL('https://example.test/?view=3d', 'text').href, 'https://example.test/?plain=1');
});

test('article-relative Markdown links and images use the article location', () => {
  const html = renderMarkdown('[read](first-visit.html) ![photo](images/photo.webp)', { baseURL: 'https://example.test/articles/note.md' });
  assert.match(html, /href="https:\/\/example.test\/articles\/first-visit.html"/);
  assert.match(html, /src="https:\/\/example.test\/articles\/images\/photo.webp"/);
  assert.doesNotMatch(renderMarkdown('[unsafe](javascript:alert%281%29)'), /href="javascript:/i);
  assert.doesNotMatch(renderMarkdown('<script>alert(1)</script>'), /<script>/i);
});
