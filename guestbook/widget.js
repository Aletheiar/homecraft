import { GUESTBOOK } from './config.js';

const ORIGIN = 'https://giscus.app';
const status = document.querySelector('[data-guestbook-status]');
const retry = document.querySelector('[data-guestbook-retry]');
const github = document.querySelector('[data-guestbook-github]');
const container = document.querySelector('.giscus');
document.body.classList.toggle('is-embedded', window.parent !== window);

function setStatus(state, text) {
  status.dataset.state = state; status.textContent = text;
  retry.hidden = state !== 'error';
}
function unavailable() {
  setStatus('error', '留言服务暂时无法连接。可以重试，或在 GitHub 打开留言区。');
}
// A clean reload replaces the official client's listeners as well as its frame.
retry.addEventListener('click', () => location.reload());
github.href = GUESTBOOK.githubURL;

const script = document.createElement('script');
script.src = `${ORIGIN}/client.js`; script.async = true; script.crossOrigin = 'anonymous';
Object.assign(script.dataset, {
  repo: GUESTBOOK.repo, repoId: GUESTBOOK.repoId,
  category: GUESTBOOK.category, categoryId: GUESTBOOK.categoryId,
  mapping: 'specific', term: GUESTBOOK.term, strict: '1',
  reactionsEnabled: '0', emitMetadata: '1', inputPosition: 'top',
  theme: 'light', lang: 'zh-CN',
});
script.addEventListener('error', unavailable);
const timeout = setTimeout(unavailable, 20000);

window.addEventListener('message', event => {
  const frame = container.querySelector('iframe.giscus-frame');
  if (event.origin !== ORIGIN || !frame || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
  const message = event.data.giscus;
  if (!message || typeof message !== 'object') return;
  if (typeof message.error === 'string') {
    clearTimeout(timeout);
    if (/discussion not found/i.test(message.error)) {
      setStatus('empty', '还没有留言，欢迎登录 GitHub 留下第一张明信片。');
    } else unavailable();
  } else if (message.discussion && typeof message.discussion === 'object') {
    clearTimeout(timeout); setStatus('ready', '欢迎留下明信片，也可以回复其他来访者。');
    // A real discussion URL becomes available after the first visitor posts.
    const url = message.discussion.url;
    if (typeof url === 'string' && /^https:\/\/github\.com\/Aletheiar\/homecraft\/discussions\/[1-9]\d*$/.test(url)) github.href = url;
  } else if (typeof message.resizeHeight === 'number' && Number.isFinite(message.resizeHeight) && message.resizeHeight > 0) {
    // The official frame has rendered. This is not evidence that anyone posted.
    clearTimeout(timeout);
    if (status.dataset.state === 'loading') setStatus('loaded', '登录 GitHub 后即可在下方留言。');
  }
});
document.body.append(script);
