/* Runs as a classic script before first paint. If this load came through a
   door, keep the violet ripple visible and hide the engine loader until
   world/portal-transition.js dissolves it. A normal visit clears the overlay
   at once, and a stale flag is ignored. */
(() => {
  const ARRIVING = 'homecraft.arriving.v1';
  const AT = 'homecraft.arriving.at.v1';
  const root = document.documentElement;
  const veil = document.getElementById('portal-ripple');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let arriving = false, at = 0;
  try {
    arriving = sessionStorage.getItem(ARRIVING) === '1';
    at = Number(sessionStorage.getItem(AT)) || 0;
  } catch { /* private mode: no veil */ }
  if (!veil) return;
  if (!arriving || !at || Date.now() - at > 30000 || reduced) {
    veil.remove();
    try {
      sessionStorage.removeItem(ARRIVING);
      sessionStorage.removeItem(AT);
    } catch { /* no stored flag */ }
    return;
  }
  root.classList.add('arriving');
  // If the module never runs, do not leave the page behind a permanent veil.
  setTimeout(() => {
    if (!root.classList.contains('arriving')) return;
    root.classList.remove('arriving');
    veil.remove();
  }, 15000);
})();
