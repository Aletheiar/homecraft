// 极简 Markdown 渲染：够写随笔、技术笔记。
//
// 支持：front matter、标题、段落、列表、引用、代码块、分隔线、
// 行内 `code`、**粗体**、*斜体*、[链接](url)、![图片](src)。
// 输出前先转义 HTML，所以文章内容不会带上任何标签或脚本。

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ESCAPES[c]);

const SAFE_LINK = /^(https?:|mailto:)/i;

// The source text is already escaped when this runs, so the value is only
// checked for a safe scheme; escaping again would turn `&` into `&amp;amp;`.
function attribute(url, baseURL) {
  const value = String(url).trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  try {
    const resolved = new URL(value, baseURL || 'https://text.invalid/');
    if (!SAFE_LINK.test(resolved.protocol)) return '#';
    return escapeHtml(baseURL || /^[a-z][\w+.-]*:/i.test(value) ? resolved.href : value);
  } catch { return '#'; }
}

function inline(text, options = {}) {
  const codes = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      (_, alt, src) => `<img src="${attribute(src, options.baseURL)}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      (_, label, href, title) => `<a href="${attribute(href, options.baseURL)}"${title ? ` title="${title}"` : ''}`
        + `${SAFE_LINK.test(href.trim()) && !/^(\/|\.\/|\.\.\/|#)/.test(href.trim()) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

// Front matter is a leading `---` block of `key: value` lines. Lists use
// `[a, b]` or a comma separated value; everything else stays a string.
export function parseFrontMatter(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = raw.trim().replace(/^(['"])(.*)\1$/, '$2');
    data[key] = value.startsWith('[')
      ? value.slice(1, -1).split(',').map(item => item.trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean)
      : value;
  }
  return { data, body: text.slice(match[0].length) };
}

export function renderMarkdown(source, options = {}) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = null;      // 'ul' | 'ol'
  let quote = [];
  let fence = null;     // { lang, lines }

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '), options)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote>${renderMarkdown(quote.join('\n'), options)}</blockquote>`);
    quote = [];
  };
  const flush = () => { flushParagraph(); flushList(); flushQuote(); };

  for (const line of lines) {
    if (fence) {
      if (/^```/.test(line)) {
        const body = fence.lines.join('\n');
        html.push(`<pre${fence.lang ? ` data-lang="${escapeHtml(fence.lang)}"` : ''}><code>${escapeHtml(body)}</code></pre>`);
        fence = null;
      } else fence.lines.push(line);
      continue;
    }
    if (/^```/.test(line)) { flush(); fence = { lang: line.slice(3).trim(), lines: [] }; continue; }
    if (!line.trim()) { flush(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flush(); html.push('<hr>'); continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2], options)}</h${level}>`);
      continue;
    }
    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) { flushParagraph(); flushList(); quote.push(quoted[1]); continue; }
    if (quote.length) flushQuote();

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { flushList(); html.push(`<${kind}>`); list = kind; }
      html.push(`<li>${inline((bullet || ordered)[1], options)}</li>`);
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  if (fence) html.push(`<pre><code>${escapeHtml(fence.lines.join('\n'))}</code></pre>`);
  flush();
  return html.join('\n');
}

// Rough reading time for a Chinese or English body.
export function readingMinutes(text) {
  const source = String(text ?? '');
  const cjk = (source.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (source.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9']+/g) || []).length;
  return Math.max(1, Math.round(cjk / 350 + words / 220));
}
