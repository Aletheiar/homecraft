import { COLLECTED, COLLECTED_TYPES } from './library/collected.js';
import { loadWritten } from './library/written.js';
import { PROFILE } from '../about/profile.js';
import { FRIEND_LINKS } from '../friends/list.js';
import { viewURL, VIEW_PREFERENCE_KEY } from './view-mode.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const sections = { home: '首页', written: '原创', collected: '收藏', projects: '项目', about: '关于', friends: '友链' };
const filters = { written: { query: '', category: 'all' }, collected: { query: '', category: 'all' } };
const articles = new Map();
let root, content, posts = null, articleError = false, renderVersion = 0;
const routeURL = (section, id) => `#/${section}${id ? `/${encodeURIComponent(id)}` : ''}`;
const safeURL = value => {
  try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url : null; }
  catch { return null; }
};
const badge = item => item.sample ? '<span class="text-badge" data-post-sample>示例</span>' : '';
const date = value => esc(String(value || '').replace(/-/g, '.'));

function route() {
  const raw = location.hash.replace(/^#\/?/, '').split('/');
  const aliases = { blog: 'written', writing: 'written', works: 'projects', welcome: 'home' };
  const section = aliases[raw[0]] || raw[0] || (new URLSearchParams(location.search).get('space') === 'library' ? 'written' : 'home');
  let id = null;
  try { id = raw[1] ? decodeURIComponent(raw[1]) : null; } catch {}
  return { section: sections[section] ? section : 'home', id };
}

function postCard(post) {
  return `<article class="text-post-card">
    <div class="text-card-meta"><span>${esc(post.category)}</span>${badge(post)}<time>${date(post.date)}</time></div>
    <h3><a href="${routeURL('written', post.id)}" data-read-post="${esc(post.id)}">${esc(post.title)}</a></h3>
    <p>${esc(post.error ? '这篇文章暂时无法读取，请稍后再试。' : post.summary)}</p>
    <div class="text-tags">${(post.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
    <a class="text-read-link" href="${routeURL('written', post.id)}">阅读文章 <span aria-hidden="true">↗</span></a>
  </article>`;
}

function collectionCard(item) {
  const url = safeURL(item.url || '');
  return `<article class="text-collection-card">
    <div class="text-card-meta"><span>${esc(COLLECTED_TYPES[item.type] || '其他推荐')}</span>${badge(item)}</div>
    <h3>${esc(item.title)}</h3><p class="text-byline">${esc(item.author || '来源待补充')}</p>
    <p>${esc(item.summary)}</p>
    ${(item.comment || '').trim() ? `<blockquote>${esc(item.comment)}</blockquote>` : ''}
    <div class="text-tags">${(item.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
    ${item.url && url ? `<a class="text-read-link" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">查看原文 ↗</a>` : '<span class="text-pending">链接待添加</span>'}
  </article>`;
}

function heading(kicker, title, description = '') {
  return `<header class="text-section-heading"><p class="text-eyebrow">${kicker}</p><h1 tabindex="-1">${title}</h1>${description ? `<p>${description}</p>` : ''}</header>`;
}

function home() {
  const ready = posts || [];
  const real = ready.filter(post => !post.sample && !post.error);
  const empty = posts
    ? `<div class="text-empty" data-empty-articles><h2>${articleError ? '目录暂时无法读取' : '正式文章还在准备中'}</h2><p>${articleError ? '请稍后刷新重试，也可以先浏览其他栏目。' : '文章会在整理好后发布。你可以先看看收藏，或从导航继续浏览。'}</p><a class="text-button is-secondary" href="${routeURL('collected')}">浏览收藏</a></div>`
    : '<p class="text-loading" role="status">正在整理目录…</p>';
  return `${heading('ALETHEIA / NOTES & COLLECTIONS', '文字、收藏与一些记录', '在这里阅读文章，翻一翻收藏。也可以走进三维庭院，慢慢探索这个空间。')}
    <div class="text-home-links"><a class="text-button" href="${routeURL('written')}">浏览原创 <span>↗</span></a><a class="text-button is-secondary" href="${routeURL('collected')}">看看收藏</a></div>
    <div class="text-section-line"><h2>${real.length ? '最近的文字' : '文章预览'}</h2><a href="${routeURL('written')}">查看全部 →</a></div>
    <div class="text-post-list">${ready.length ? (real.length ? real : ready).slice(0, 3).map(postCard).join('') : empty}</div>
    <aside class="text-home-note"><span aria-hidden="true">△</span><div><h2>玻璃之下，还有一座庭院</h2><p>想散步时，可以从右上角进入 3D。文字版随时可以回来。</p></div></aside>`;
}

function catalog(section) {
  const state = filters[section], written = section === 'written';
  return `${heading(written ? 'WRITTEN / NOTES' : 'COLLECTED / LIBRARY', written ? '我的原创' : '我的收藏', written ? '随笔、技术笔记和开发记录。点击标题阅读全文。目前收录的都是示例文章。' : '这里放收藏的文章、书籍、开源项目和论文。点击链接可查看原文。')}
    <div class="text-catalog-tools"><label class="text-search"><span>搜索${written ? '文章' : '收藏'}</span><input type="search" data-text-search value="${esc(state.query)}" placeholder="${written ? '标题、摘要、分类或标签' : '标题、作者、分类或标签'}" autocomplete="off"><button type="button" data-clear-search>清空</button></label>
    <div class="text-filters" role="group" aria-label="分类筛选"></div></div>
    <p class="text-results-count" role="status" aria-live="polite"></p><div class="text-catalog-list"></div>`;
}

function updateCatalog(section) {
  const state = filters[section], written = section === 'written';
  const all = written ? posts || [] : COLLECTED;
  const group = item => written ? item.category : item.type;
  const categories = [...new Set(all.map(group))];
  if (!categories.includes(state.category)) state.category = 'all';
  content.querySelector('.text-filters').innerHTML = [['all', '全部'], ...categories.map(category => [category, written ? category : COLLECTED_TYPES[category] || category])]
    .map(([id, name]) => `<button type="button" data-filter="${esc(id)}" aria-pressed="${state.category === id}">${esc(name)}</button>`).join('');
  const query = state.query.trim().toLowerCase();
  const visible = all.filter(item => (state.category === 'all' || group(item) === state.category)
    && [item.title, item.author, item.summary, item.category, COLLECTED_TYPES[item.type], ...(item.tags || [])].join(' ').toLowerCase().includes(query));
  content.querySelector('.text-results-count').textContent = written && !posts ? '正在读取文章目录…' : `${visible.length} 条内容`;
  const unpublished = all.length === 0 && (!written || posts !== null);
  content.querySelector('.text-catalog-list').innerHTML = visible.length
    ? visible.map(written ? postCard : collectionCard).join('')
    : `<div class="text-empty" data-empty-results><h2>${written && !posts ? '正在读取目录' : unpublished ? '内容还在准备中' : '暂时没有匹配的内容'}</h2><p>${articleError && written ? '目录暂时无法读取，请刷新页面重试。' : unpublished ? '这个栏目会在整理好后补充。你可以从上方导航继续浏览。' : '可以换一个分类，或清空搜索后再看看。'}</p>${unpublished ? '' : '<button class="text-button is-secondary" type="button" data-clear-search>清空筛选</button>'}</div>`;
}

function sanitizeArticle(html, post) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const article = doc.querySelector('main') || doc.body;
  if (post.kind === 'page') article.querySelectorAll('header, footer, nav').forEach(node => node.remove());
  article.querySelectorAll('script, style, iframe, object, embed, form, base, link, meta').forEach(node => node.remove());
  for (const element of article.querySelectorAll('*')) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || ['srcdoc', 'style', 'srcset', 'formaction'].includes(attribute.name)) element.removeAttribute(attribute.name);
    }
  }
  const baseURL = post.sourceURL || post.href || location.href;
  for (const image of article.querySelectorAll('img')) {
    let url;
    try { url = safeURL(new URL(image.getAttribute('src') || '', baseURL).href); } catch {}
    if (!url) image.remove(); else { image.src = url.href; image.loading = 'lazy'; }
  }
  for (const link of article.querySelectorAll('a')) {
    const raw = link.getAttribute('href') || '';
    if (raw.startsWith('#')) { link.dataset.essayAnchor = raw.slice(1); link.href = '#'; continue; }
    let url;
    try { url = new URL(raw, baseURL); } catch { link.removeAttribute('href'); continue; }
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) { link.removeAttribute('href'); continue; }
    const target = (posts || []).find(item => [item.href, item.sourceURL].includes(url.href));
    if (target) link.href = routeURL('written', target.id);
    else if (url.origin === location.origin && ['/about/', '/friends/'].includes(url.pathname)) link.href = routeURL(url.pathname === '/about/' ? 'about' : 'friends');
    else if (url.origin === location.origin && ['library', 'studio'].includes(url.searchParams.get('space'))) {
      link.href = viewURL(url.href, '3d').href; link.removeAttribute('target');
      link.textContent = url.searchParams.get('space') === 'studio' ? '进入 3D 工作室 ↗' : '进入 3D 图书室 ↗';
    }
    else { link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  }
  return article.innerHTML;
}

async function articleHTML(post) {
  if (post.kind === 'markdown') return sanitizeArticle(post.html || '', post);
  if (!articles.has(post.id)) articles.set(post.id, fetch(post.href).then(async response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return sanitizeArticle(await response.text(), post);
  }).catch(error => { articles.delete(post.id); throw error; }));
  return articles.get(post.id);
}

async function readPost(id, version) {
  const post = posts?.find(item => item.id === id);
  if (!posts) { content.innerHTML = heading('WRITTEN', '正在读取文章…'); return; }
  if (!post) {
    content.innerHTML = `${heading('WRITTEN', '未找到这篇文章。')}<div class="text-empty" data-post-unavailable><p>暂时没有找到这篇文章，可以先回目录看看。</p><a class="text-button" data-return-catalog href="${routeURL('written')}">返回原创目录</a></div>`;
    return;
  }
  content.innerHTML = `<a class="text-back" data-return-catalog href="${routeURL('written')}">← 返回原创目录</a>${heading(`${esc(post.category)} / ${date(post.date)}`, esc(post.title))}
    <div class="text-article-meta">${badge(post)}${post.minutes ? `<span>约 ${post.minutes} 分钟</span>` : ''}</div>
    <div class="text-article-body"><p role="status">正在读取正文…</p></div>`;
  document.title = `${post.title} · 玻璃金字塔`;
  try {
    if (post.error) throw new Error('Article unavailable');
    const html = await articleHTML(post);
    if (version !== renderVersion) return;
    const body = content.querySelector('.text-article-body');
    body.innerHTML = `<article class="text-prose">${html}</article>`;
    const headings = [...body.querySelectorAll('h2, h3')];
    headings.forEach((element, i) => { element.id ||= `essay-${post.id}-${i + 1}`; });
    if (headings.length > 1) body.insertAdjacentHTML('afterbegin', `<details class="text-toc"><summary>文章目录</summary><nav aria-label="文章目录">${headings.map(element => `<button type="button" data-essay-anchor="${esc(element.id)}">${esc(element.textContent)}</button>`).join('')}</nav></details>`);
  } catch {
    if (version !== renderVersion) return;
    content.querySelector('.text-article-body').innerHTML = '<div class="text-empty" data-post-unavailable><h2>正文暂时无法读取</h2><p>内容可能还在准备中。你可以稍后再试，或返回目录继续浏览。</p><button class="text-button is-secondary" data-retry-post type="button">重新读取</button></div>';
  }
}

function profile() {
  return `${heading('ABOUT', esc(PROFILE.displayName), PROFILE.bio ? esc(PROFILE.bio) : '这里是我的社交账号。')}<div class="text-account-list">${PROFILE.accounts.map(account => {
    const url = account.href && safeURL(account.href);
    return `<a class="text-account" ${url ? `href="${esc(url.href)}" target="_blank" rel="noopener noreferrer"` : 'aria-disabled="true"'}><span><strong>${esc(account.platform)}</strong><small>${esc(account.name)}</small></span><span aria-hidden="true">${url ? '↗' : '待添加'}</span></a>`;
  }).join('')}</div>`;
}

function friends() {
  return `${heading('FRIENDS', '其他人的博客', '点击站点名称，在新标签页打开。示例条目会单独标明。')}<div class="text-friends">${FRIEND_LINKS.map(friend => {
    const url = safeURL(friend.url);
    return `<article class="text-friend-card"><div class="text-card-meta">${badge(friend)}</div><h2>${url ? `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(friend.name)} ↗</a>` : esc(friend.name)}</h2><p>${esc(friend.note)}</p></article>`;
  }).join('') || '<p class="text-empty">友链还在整理中。</p>'}</div>`;
}

function projects() {
  const source = document.querySelector('#pages [data-station="works"]');
  const html = source ? sanitizeArticle(source.innerHTML, { kind: 'markdown' }) : '<p>项目内容待补充。</p>';
  return `${heading('PROJECTS', '项目与研究', '目前收录的项目是这个网站本身。')}<div class="text-project-content text-prose">${html}</div>`;
}

function render({ focus = true } = {}) {
  const { section, id } = route(), version = ++renderVersion;
  root.querySelectorAll('[data-text-nav]').forEach(link => {
    if (link.dataset.textNav === section) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.title = `${sections[section]} · 玻璃金字塔`;
  if (section === 'written' && id) void readPost(id, version);
  else {
    content.innerHTML = section === 'home' ? home() : section === 'about' ? profile() : section === 'friends' ? friends() : section === 'projects' ? projects() : catalog(section);
    if (section === 'written' || section === 'collected') updateCatalog(section);
  }
  if (focus) { window.scrollTo(0, 0); content.querySelector('h1')?.focus({ preventScroll: true }); }
}

export async function mountTextBlog({ error } = {}) {
  if (document.querySelector('#text-blog')) return;
  document.body.classList.add('plain', 'text-blog');
  document.querySelector('#loading')?.remove();
  document.querySelector('#portal-ripple')?.remove();
  document.documentElement.classList.remove('arriving');
  try { sessionStorage.setItem(VIEW_PREFERENCE_KEY, 'text'); } catch {}
  root = document.createElement('div'); root.id = 'text-blog';
  root.innerHTML = `<a class="text-skip" href="#text-content">跳到正文</a>
    <header class="text-site-header"><div class="text-header-inner"><a class="text-brand" href="${routeURL('home')}"><span aria-hidden="true">△</span><span>玻璃金字塔<small>${esc(PROFILE.displayName)} · 文字版</small></span></a>
      <a class="text-scene-link" data-enter-3d href="${esc(viewURL(location.href, '3d').href)}">进入 3D <span aria-hidden="true">↗</span></a></div>
      <nav class="text-nav" aria-label="博客栏目">${Object.entries(sections).map(([id, title]) => `<a data-text-nav="${id}" href="${routeURL(id)}">${title}</a>`).join('')}</nav></header>
    ${error ? '<p class="text-fallback-note" role="status">三维庭院暂时无法打开，文章和收藏仍可以在这里阅读。</p>' : ''}
    <main id="text-content" tabindex="-1"></main>
    <footer class="text-site-footer"><span>玻璃金字塔 · ${esc(PROFILE.displayName)}</span><a href="${routeURL('about')}">关于这个空间 →</a></footer>`;
  document.body.append(root); content = root.querySelector('#text-content');
  root.addEventListener('input', event => {
    if (!event.target.matches('[data-text-search]')) return;
    const { section } = route(); filters[section].query = event.target.value; updateCatalog(section);
  });
  root.addEventListener('click', event => {
    if (event.target.closest('.text-skip')) {
      event.preventDefault(); content.focus(); content.scrollIntoView({ block: 'start' }); return;
    }
    const filter = event.target.closest('[data-filter]'), clear = event.target.closest('[data-clear-search]');
    const { section } = route();
    if (filter || clear) {
      filters[section].category = filter?.dataset.filter || 'all';
      if (clear) { filters[section].query = ''; content.querySelector('[data-text-search]').value = ''; }
      updateCatalog(section);
    }
    const anchor = event.target.closest('[data-essay-anchor]');
    if (anchor) { event.preventDefault(); document.getElementById(anchor.dataset.essayAnchor)?.scrollIntoView({ behavior: 'auto', block: 'start' }); }
    if (event.target.closest('[data-retry-post]')) {
      const post = posts?.find(item => item.id === route().id);
      if (post?.error) void loadWritten({ refresh: true }).then(value => { posts = value; refreshWritten(); });
      else render({ focus: false });
    }
  });
  window.addEventListener('hashchange', () => render());
  render({ focus: false });
  const refreshWritten = () => {
    if (['home', 'written'].includes(route().section)) render({ focus: false });
  };
  void loadWritten().then(value => { posts = value; refreshWritten(); }).catch(() => { posts = []; articleError = true; refreshWritten(); });
}
