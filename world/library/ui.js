// 图书室的 2D 阅读层。
//
// 三维房间只负责「走近 → 点击」，长文章、分类、标签和搜索都在这一层完成。
// 入口是 engine/main.js 的 data-render 钩子：<article class="page"
// data-station="collected" data-render="library"> 打开时调用 mountLibrary()。

import { COLLECTED, COLLECTED_TYPES } from './collected.js';
import { loadWritten } from './written.js';

const VIEWS = {
  collected: {
    title: '我的收藏',
    lead: '这里放收藏的文章、书籍、开源项目和论文。点击链接可查看原文。',
  },
  written: {
    title: '我的原创',
    lead: '我的文章和笔记，点击标题阅读全文。目前收录的都是示例文章。',
  },
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const KIND_CLASS = {
  book: 'book', article: 'article', repo: 'repo', paper: 'paper', other: 'other',
};

const pad = value => String(value || '').replace(/-/g, '.');

let memory = 'collected';

function chipsFor(view, posts) {
  if (view === 'collected') {
    const used = Object.keys(COLLECTED_TYPES)
      .map(type => ({ id: type, label: COLLECTED_TYPES[type], count: COLLECTED.filter(item => item.type === type).length }))
      .filter(entry => entry.count > 0);
    return [{ id: 'all', label: '全部', count: COLLECTED.length }, ...used];
  }
  const groups = new Map();
  for (const post of posts) groups.set(post.category, (groups.get(post.category) || 0) + 1);
  return [{ id: 'all', label: '全部', count: posts.length },
    ...[...groups].map(([id, count]) => ({ id, label: id, count }))];
}

function collectedCard(item) {
  const safeUrl = /^https?:\/\//i.test(item.url || '') ? item.url : '';
  const comment = (item.comment || '').trim();
  return `<li class="lib-card" data-kind="${esc(KIND_CLASS[item.type] || 'other')}">
    <p class="lib-card-top">
      <span class="lib-kind">${esc(COLLECTED_TYPES[item.type] || '其他推荐')}</span>
      ${item.sample ? '<span class="lib-flag">示例</span>' : ''}
      ${item.added ? `<span class="lib-date">${esc(pad(item.added))}</span>` : ''}
    </p>
    <h3 class="lib-title">${esc(item.title)}</h3>
    <p class="lib-by">${esc(item.author || '来源未填')}</p>
    <p class="lib-text">${esc(item.summary)}</p>
    ${item.tags?.length ? `<ul class="lib-tags">${item.tags.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>` : ''}
    ${comment
      ? `<p class="lib-quote">${esc(comment)}</p>`
      : '<p class="lib-quote is-empty">我的评论：还没写。</p>'}
    <p class="lib-actions">${safeUrl
      ? `<a class="lib-link" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">打开原始链接 ↗</a>`
      : '<span class="lib-link is-off">暂无原始链接</span>'}</p>
  </li>`;
}

function writtenCard(post) {
  return `<li class="lib-card lib-post" data-kind="post" data-post="${esc(post.id)}">
    <p class="lib-card-top">
      <span class="lib-kind">${esc(post.category)}</span>
      ${post.sample ? '<span class="lib-flag">示例</span>' : ''}
      <span class="lib-date">${esc(pad(post.date))}</span>
    </p>
    <h3 class="lib-title">${esc(post.title)}</h3>
    <p class="lib-by">${post.minutes ? `约 ${post.minutes} 分钟` : '独立页面'}</p>
    <p class="lib-text">${esc(post.summary)}</p>
    ${post.tags?.length ? `<ul class="lib-tags">${post.tags.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>` : ''}
    <p class="lib-actions"><button class="lib-read" type="button" data-post="${esc(post.id)}">阅读全文 →</button></p>
  </li>`;
}

function matches(entry, query) {
  if (!query) return true;
  const haystack = [entry.title, entry.author, entry.summary, entry.category, ...(entry.tags || [])]
    .join(' ').toLowerCase();
  return haystack.includes(query);
}

export function mountLibrary(body, { view } = {}) {
  const start = VIEWS[view] ? view : memory;
  const state = { view: start, query: '', filter: 'all', posts: null, open: null };

  body.innerHTML = `<div class="lib" data-view="${esc(state.view)}">
    <div class="lib-top">
      <div class="lib-tabs" role="tablist" aria-label="图书室分区">
        ${Object.entries(VIEWS).map(([id, meta]) => `<button type="button" role="tab" data-view="${id}"
          aria-selected="${id === state.view}">${esc(meta.title)}<small>${id === 'collected' ? 'Collected' : 'Written'}</small></button>`).join('')}
      </div>
      <label class="lib-search">
        <span class="lib-search-label">搜索</span>
        <input type="search" placeholder="标题、作者、标签或分类" autocomplete="off" enterkeyhint="search">
      </label>
    </div>
    <p class="lib-lead">${esc(VIEWS[state.view].lead)}</p>
    <div class="lib-chips" role="group" aria-label="分类筛选"></div>
    <div class="lib-viewport">
      <ul class="lib-list"></ul>
      <div class="lib-reader" hidden></div>
    </div>
    <p class="lib-foot"><span class="lib-count"></span><span class="lib-hint">按 Esc 关闭，回到三维图书室</span></p>
  </div>`;

  const root = body.querySelector('.lib');
  const list = root.querySelector('.lib-list');
  const reader = root.querySelector('.lib-reader');
  const viewport = root.querySelector('.lib-viewport');
  const chipRow = root.querySelector('.lib-chips');
  const count = root.querySelector('.lib-count');
  const search = root.querySelector('input[type="search"]');
  const panelTitle = globalThis.document.querySelector('#panelTitle');

  const setTitle = () => {
    memory = state.view;
    root.dataset.view = state.view;
    root.querySelector('.lib-lead').textContent = VIEWS[state.view].lead;
    for (const tab of root.querySelectorAll('[role="tab"]')) {
      tab.setAttribute('aria-selected', String(tab.dataset.view === state.view));
    }
    if (panelTitle) panelTitle.textContent = VIEWS[state.view].title;
  };

  const entries = () => (state.view === 'collected' ? COLLECTED : state.posts || []);

  const visible = () => {
    const query = state.query.trim().toLowerCase();
    return entries().filter(entry => {
      const group = state.view === 'collected' ? entry.type : entry.category;
      return (state.filter === 'all' || group === state.filter) && matches(entry, query);
    });
  };

  function renderChips() {
    const chips = chipsFor(state.view, state.posts || []);
    if (!chips.some(chip => chip.id === state.filter)) state.filter = 'all';
    chipRow.innerHTML = chips.map(chip => `<button type="button" data-chip="${esc(chip.id)}"
      aria-pressed="${chip.id === state.filter}">${esc(chip.label)}<span>${chip.count}</span></button>`).join('');
  }

  function renderList() {
    const items = visible();
    count.textContent = `${VIEWS[state.view].title} · ${items.length} / ${entries().length} 条`;
    if (!items.length) {
      list.innerHTML = `<li class="lib-empty">没有匹配的内容。换个分类，或清空搜索。</li>`;
      return;
    }
    list.innerHTML = items.map(item => (state.view === 'collected' ? collectedCard(item) : writtenCard(item))).join('');
  }

  function closeReader() {
    state.open = null;
    delete root.dataset.open;
    reader.hidden = true;
    reader.innerHTML = '';
    list.hidden = false;
    viewport.scrollTop = 0;
  }

  function openReader(post) {
    state.open = post.id;
    root.dataset.open = '1';
    const meta = [pad(post.date), post.category, post.minutes ? `约 ${post.minutes} 分钟` : '', ...(post.tags || [])]
      .filter(Boolean).map(esc).join(' · ');
    reader.innerHTML = `<div class="lib-reader-bar">
        <button class="lib-back" type="button">← 返回目录</button>
        <span class="lib-reader-kind">${esc(post.category)}</span>
      </div>
      <h3 class="lib-reader-title">${esc(post.title)}</h3>
      <p class="lib-reader-meta">${meta}</p>
      ${post.kind === 'page'
        ? `<iframe class="lib-frame" src="${esc(post.href)}" title="${esc(post.title)}" loading="lazy"></iframe>`
        : `<article class="lib-prose">${post.html || ''}</article>`}`;
    reader.hidden = false;
    list.hidden = true;
    viewport.scrollTop = 0;
    reader.querySelector('.lib-back')?.focus({ preventScroll: true });
  }

  function switchView(view) {
    if (state.view === view) return;
    state.view = view;
    state.filter = 'all';
    state.query = '';
    search.value = '';
    closeReader();
    setTitle();
    renderChips();
    renderList();
    viewport.scrollTop = 0;
    if (view === 'written') loadWritten().then(posts => {
      if (state.view !== 'written') return;
      state.posts = posts;
      renderChips();
      renderList();
    });
  }

  root.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) { switchView(tab.dataset.view); return; }
    const chip = event.target.closest('[data-chip]');
    if (chip) {
      state.filter = chip.dataset.chip;
      renderChips();
      renderList();
      viewport.scrollTop = 0;
      return;
    }
    if (event.target.closest('.lib-back')) { closeReader(); renderList(); return; }
    const opener = event.target.closest('[data-post]');
    if (opener && state.posts) {
      const post = state.posts.find(item => item.id === opener.dataset.post);
      if (post) openReader(post);
    }
  });

  search.addEventListener('input', () => {
    state.query = search.value;
    renderList();
    viewport.scrollTop = 0;
  });

  setTitle();
  renderChips();
  renderList();
  if (state.view === 'written') {
    loadWritten().then(posts => {
      if (state.view !== 'written') return;
      state.posts = posts;
      renderChips();
      renderList();
    });
  }
}
