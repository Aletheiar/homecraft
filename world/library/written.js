// 我的原创 / Written — 文章索引。
//
// 两种登记方式，新增文章只改这个文件（外加放一个文件），不碰三维建筑代码：
//
//   1. Markdown（推荐）：把 `标题.md` 放进 articles/，正文开头写 front matter，
//      然后在这里加一行 { id, file: 'xxx.md' }。标题、日期、分类、标签、摘要
//      都从 front matter 读：
//
//        ---
//        title: 文章标题
//        date: 2026-11-06
//        category: 技术笔记
//        tags: [Three.js, 渲染]
//        summary: 一句话摘要
//        ---
//        正文…
//
//   2. 已有独立页面：{ id, page: 'articles/xxx.html', title, date, category,
//      tags, summary }，在图书室的阅读层里用 iframe 打开。
//
// category 建议保持在少数几个里，目录会按它自动分组。

export const WRITTEN = [
  {
    id: 'first-visit',
    page: 'articles/first-visit.html',
    sample: true,
    title: '把个人网站，变成一座可以走进去的建筑',
    date: '2026-11-03',
    category: '空间手记',
    tags: ['三维网站', '入口'],
    summary: '从庭院走进大厅，再从展台走进文字：这个站点为什么先给出一栋建筑。',
  },
  {
    id: 'design-notes',
    page: 'articles/design-notes.html',
    sample: true,
    title: '玻璃、留白与五个开放的角落',
    date: '2026-11-03',
    category: '设计记录',
    tags: ['布局', '玻璃'],
    summary: '中央为什么空着，内容又为什么被推到五个方向的角落里。',
  },
  {
    id: 'quiet-corner',
    page: 'articles/quiet-corner.html',
    sample: true,
    title: '在透明的屋顶下，留一点空白',
    date: '2026-11-03',
    category: '生活随笔',
    tags: ['日常'],
    summary: '一段留着等被替换的示例文字。',
  },
  {
    id: 'reading-room',
    file: 'reading-room.md',
    // 标题/分类/日期以 Markdown 的 front matter 为准；这里只是给三维墙面和
    // 加载失败时的兜底，让目录在文件缺失时也读得出来。
    title: '图书室的两种读法',
    date: '2026-11-06',
    category: '空间手记',
    tags: ['图书室', 'Markdown'],
  },
];

const BASE = new URL('../../articles/', import.meta.url);
const SITE = new URL('../../', import.meta.url);
let cache = null;

const normalise = (entry, extra = {}) => ({
  id: entry.id,
  title: entry.title || '无标题',
  date: entry.date || '',
  category: entry.category || '未分类',
  tags: Array.isArray(entry.tags) ? entry.tags : [],
  summary: entry.summary || '',
  sample: Boolean(entry.sample),
  ...extra,
});

async function loadEntry(entry) {
  if (entry.page) {
    return normalise(entry, { kind: 'page', href: new URL(entry.page, SITE).href });
  }
  const { parseFrontMatter, renderMarkdown, readingMinutes } = await import('./markdown.js');
  try {
    const response = await fetch(new URL(entry.file, BASE));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data, body } = parseFrontMatter(await response.text());
    return normalise({ ...data, id: entry.id, sample: entry.sample ?? data.sample }, {
      kind: 'markdown',
      html: renderMarkdown(body, { baseURL: new URL(entry.file, BASE).href }),
      sourceURL: new URL(entry.file, BASE).href,
      minutes: readingMinutes(body),
      tags: Array.isArray(data.tags) ? data.tags : entry.tags,
    });
  } catch (error) {
    return normalise({ ...entry, summary: `这篇 Markdown 没有加载成功（${error.message}）。` }, {
      kind: 'markdown',
      error: true,
      html: `<p>无法读取 <code>articles/${entry.file}</code>：${error.message}</p>`,
    });
  }
}

// Every entry loads once per page view; reopening the catalog is instant.
export function loadWritten({ refresh = false } = {}) {
  if (refresh) cache = null;
  cache ||= Promise.all(WRITTEN.map(loadEntry)).then(posts =>
    posts.sort((a, b) => String(b.date).localeCompare(String(a.date))));
  return cache;
}
