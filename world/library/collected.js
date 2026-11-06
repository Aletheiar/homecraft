// 我的收藏 / Collected — 外部发现、读过、愿意推荐的内容。
//
// 一条收藏就是下面数组里的一个对象。新增收藏只改这个文件，不需要碰三维建筑代码：
//
//   {
//     id:      'unique-slug',              // 必填，唯一
//     title:   '标题',                      // 必填
//     author:  '作者或来源',                // 必填
//     type:    'book' | 'article' | 'repo' | 'paper' | 'other',
//     tags:    ['标签', '标签'],
//     summary: '一句话简介：这篇讲了什么。',
//     url:     'https://…',                // 原始链接，留空表示暂时没有
//     comment: '我的评论：为什么值得收藏。',  // 可选，留空时不显示，也不代写
//     cover:   '/assets/covers/xxx.webp',  // 可选，缩略图，建议 WebP
//     added:   '2026-11-06',               // 可选，收录日期
//     sample:  true,                       // 可选，示例条目，界面上会标注
//   }
//
// 只有 id / title / author / type 是必填的，其余缺省即可。

export const COLLECTED_TYPES = {
  book: '电子书与文学',
  article: '网络文章',
  repo: '仓库与开源',
  paper: '论文与资料',
  other: '其他推荐',
};

export const COLLECTED = [
  {
    id: 'sample-homecraft',
    title: 'Homecraft',
    author: 'terryHu7 · GitHub',
    type: 'repo',
    tags: ['三维网站', 'Three.js', '模板'],
    summary: '本站使用的三维个人网站模板：原生 ES 模块、无构建步骤、自带传送门协议。',
    url: 'https://github.com/terryHu7/homecraft',
    comment: '',
    added: '2026-11-06',
    sample: true,
  },
  {
    id: 'sample-louvre-craft',
    title: 'Louvre Craft',
    author: 'Hacker News',
    type: 'article',
    tags: ['建筑', '玻璃金字塔', '灵感'],
    summary: '用游戏内方块重建卢浮宫的项目，是本站玻璃金字塔的直接参考来源。',
    url: 'https://news.ycombinator.com/item?id=25632405',
    comment: '',
    added: '2026-11-06',
    sample: true,
  },
  {
    id: 'placeholder-book',
    title: '（待添加）电子书与文学作品',
    author: '—',
    type: 'book',
    tags: ['待添加'],
    summary: '把读过的小说或非虚构作品放在这里，并写下当初为什么读它。',
    url: '',
    comment: '',
    sample: true,
  },
  {
    id: 'placeholder-paper',
    title: '（待添加）论文与技术资料',
    author: '—',
    type: 'paper',
    tags: ['待添加'],
    summary: '值得反复翻的论文、规范或技术手册。',
    url: '',
    comment: '',
    sample: true,
  },
  {
    id: 'placeholder-other',
    title: '（待添加）其他推荐',
    author: '—',
    type: 'other',
    tags: ['待添加'],
    summary: '不属于以上分类、但仍然想推荐的任何东西。',
    url: '',
    comment: '',
    sample: true,
  },
];
