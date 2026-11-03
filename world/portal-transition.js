// Stepping through a door should feel like the light takes you: the glass
// charges for one breath, and the next room opens out of a ripple. Both are a
// plain full-screen element with CSS keyframes — no render pass, no extra
// draw calls — and both are skipped when the visitor asks for less motion.
const ARRIVING = 'homecraft.arriving.v1';
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

// Written by the door just before it navigates; read once by the page that
// lands, which is why it lives in sessionStorage and not in the URL.
export function markArrival() {
  try { sessionStorage.setItem(ARRIVING, '1'); } catch { /* private mode: no ripple */ }
}

// Returns true when this page load is a portal arrival that played.
export function revealArrival() {
  let arriving = false;
  try { arriving = sessionStorage.getItem(ARRIVING) === '1'; sessionStorage.removeItem(ARRIVING); } catch { arriving = false; }
  if (!arriving || reduceMotion()) return false;
  const el = layer();
  el.classList.remove(CHARGING);
  const start = () => {
    el.classList.add(OPENING);
    const done = () => el.classList.remove(OPENING);
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 1500);
  };
  // The loading screen takes half a second to fade; the room opens out behind it.
  const loading = document.querySelector('#loading');
  if (loading && !loading.classList.contains('done')) setTimeout(start, 520); else start();
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
