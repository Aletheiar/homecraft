export const VIEW_PREFERENCE_KEY = 'homecraft.view-mode.v1';

export function chooseView(search, { touch = false, width = 1280, height = 800, preferred } = {}) {
  const params = new URLSearchParams(search);
  if (params.has('plain')) return 'text';
  if (params.get('view') === '3d') return '3d';
  if (preferred === 'text' || preferred === '3d') return preferred;
  return touch && Math.min(width, height) <= 700 ? 'text' : '3d';
}

export function viewURL(href, mode) {
  const url = new URL(href);
  url.searchParams.delete('plain'); url.searchParams.delete('view');
  if (mode === 'text') url.searchParams.set('plain', '1');
  else { url.searchParams.set('view', '3d'); url.hash = ''; }
  return url;
}
