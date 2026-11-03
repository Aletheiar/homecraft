// Stepping through a door should feel like the light takes you: the glass
// charges for one breath, and the next room opens out of a ripple. Both are a
// plain full-screen element with CSS keyframes — no render pass, no extra
// draw calls — and both are skipped when the visitor asks for less motion.
const ARRIVING = 'homecraft.arriving.v1';
const ARRIVING_AT = 'homecraft.arriving.at.v1';
const ARRIVING_CLASS = 'arriving';
const CHARGING = 'charging', OPENING = 'opening';

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function layer() {
  let el = document.querySelector('#portal-ripple');
  if (!el) {
    el = document.createElement('div');
    el.id = 'portal-ripple';
    el.setAttribute('aria-hidden', 'true');
    document.body.append(el);
  }
  return el;
}

// The pageshow handlers use this to clear a restored page.
export function clearOverlay(root = document.documentElement) {
  document.querySelector('#portal-ripple')?.remove();
  root.classList.remove(ARRIVING_CLASS);
}

// Written by the door just before it navigates; read once by the page that
// lands, which is why it lives in sessionStorage and not in the URL. The
// timestamp lets world/portal-boot.js ignore a stale flag.
export function markArrival() {
  try {
    sessionStorage.setItem(ARRIVING, '1');
    sessionStorage.setItem(ARRIVING_AT, String(Date.now()));
  } catch { /* private mode: no ripple */ }
}

// Returns true when this page load is a portal arrival that played.
export function revealArrival() {
  const root = document.documentElement;
  let arriving = false;
  try {
    arriving = sessionStorage.getItem(ARRIVING) === '1';
    sessionStorage.removeItem(ARRIVING);
    sessionStorage.removeItem(ARRIVING_AT);
  } catch { arriving = false; }
  if (!(arriving || root.classList.contains(ARRIVING_CLASS)) || reduceMotion()) {
    clearOverlay(root);
    return false;
  }
  const el = layer();
  root.classList.add(ARRIVING_CLASS);
  el.classList.remove(CHARGING);
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    el.classList.add(OPENING);
    const done = () => {
      el.classList.remove(OPENING);
      root.classList.remove(ARRIVING_CLASS);
      el.remove();
    };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 1500);
  };
  // The engine loader is hidden on portal arrivals, but it still has to
  // finish before the ripple opens; direct visits keep the normal loader and
  // never take this path.
  const loading = document.querySelector('#loading');
  if (!loading || loading.classList.contains('done')) { start(); return true; }
  const begun = performance.now();
  const wait = () => {
    if (!document.body.contains(loading) || loading.classList.contains('done') || performance.now() - begun > 2500) start();
    else requestAnimationFrame(wait);
  };
  requestAnimationFrame(wait);
  return true;
}

// Charge the glass, then leave. The wait is short enough to read as response
// rather than delay, and reduced motion leaves at once.
export function chargeAndLeave(leave) {
  if (reduceMotion()) { leave(); return; }
  const el = layer();
  el.classList.remove(OPENING);
  el.classList.add(CHARGING);
  setTimeout(leave, 420);
}
