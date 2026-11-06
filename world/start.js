import { chooseView, viewURL, VIEW_PREFERENCE_KEY } from './view-mode.js';

const params = new URLSearchParams(location.search);
let preferred;
try { preferred = sessionStorage.getItem(VIEW_PREFERENCE_KEY); } catch {}
const mode = chooseView(location.search, {
  touch: matchMedia('(pointer: coarse)').matches,
  width: innerWidth, height: innerHeight, preferred,
});
if (params.has('plain') || params.get('view') === '3d') {
  try { sessionStorage.setItem(VIEW_PREFERENCE_KEY, mode); } catch {}
}

async function read(error) {
  const { mountTextBlog } = await import('./text-blog.js');
  await mountTextBlog({ error });
}

if (mode === 'text') {
  const url = viewURL(location.href, 'text');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  await read();
} else {
  document.addEventListener('homecraft:plain', event => {
    void read(event.detail?.error);
  }, { once: true });
  const styles = ['engine/style.css', 'assets/pyramid.css', 'assets/music.css',
    'assets/netrunner.css', 'assets/ori-sculpture.css', 'assets/interface.css', 'assets/library.css'];
  await Promise.all(styles.map(path => new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = new URL(`../${path}`, import.meta.url).href;
    link.dataset.sceneStyle = '';
    link.onload = resolve; link.onerror = () => reject(new Error(`Unable to load ${path}`));
    document.head.append(link);
  }))).then(() => import('../engine/main.js')).catch(error => read(error.message));
}
