// Stepping through a door should feel like the glass takes you: a translucent
// curtain of the same violet light covers the page at both ends, drifting
// upward with a slow sway. It is one full-screen element plus CSS keyframes
// and one tiny runtime texture — no render pass, no extra draw calls.
const ARRIVING = 'homecraft.arriving.v1';
const ARRIVING_AT = 'homecraft.arriving.at.v1';
const ARRIVING_CLASS = 'arriving';
const CHARGING = 'charging', OPENING = 'opening';
const DEPART_MS = 900, ARRIVE_MS = 1100, WAIT_MS = 2500;

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// A seamless 128x256 tile of the door's violet current: dark blooms, curved
// wisps and a few long light smears, wrapped at both ends so the CSS drift
// loop has no seam. Kept dark on purpose: the page has to stay readable
// through the veil, the way the nether portal keeps the world visible.
let textureURL = '';
function netherTexture() {
  if (textureURL) return textureURL;
  try {
    const w = 128, h = 256, canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#090314'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = (i * 47 + 11) % w, y = (i * 89 + 19) % h, r = 18 + (i % 5) * 14;
      for (const dy of [-h, 0, h]) {
        const glow = ctx.createRadialGradient(x, y + dy, 1, x, y + dy, r * 2.2);
        glow.addColorStop(0, `rgba(118,66,206,${.08 + (i % 3) * .035})`);
        glow.addColorStop(.5, 'rgba(64,28,128,.05)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      }
    }
    for (let i = 0; i < 26; i++) {
      const x = (i * 43 + 17) % w, y = (i * 71 + 5) % h, r = 4 + (i % 5) * 2.2;
      for (const dy of [-h, 0, h]) {
        ctx.save();
        ctx.translate(x, y + dy);
        ctx.rotate(((i % 7) - 3) * .1);
        ctx.scale(1, 2.6);
        const wisp = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
        wisp.addColorStop(0, `rgba(196,172,255,${.04 + (i % 4) * .018})`);
        wisp.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wisp;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const x = (i * 41 + 7) % w, y = (i * 83 + 5) % h, len = 24 + (i % 6) * 22, wide = .8 + (i % 2) * .6;
      for (const dy of [-h, 0, h]) {
        const streak = ctx.createLinearGradient(0, y + dy - len / 2, 0, y + dy + len / 2);
        streak.addColorStop(0, 'rgba(255,255,255,0)');
        streak.addColorStop(.5, `rgba(214,196,255,${.05 + (i % 4) * .025})`);
        streak.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = streak; ctx.fillRect(x, y + dy - len / 2, wide, len);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    textureURL = canvas.toDataURL('image/png');
  } catch { textureURL = ''; }
  return textureURL;
}

function layer() {
  let el = document.querySelector('#portal-ripple');
  if (!el) {
    el = document.createElement('div');
    el.id = 'portal-ripple';
    el.setAttribute('aria-hidden', 'true');
    document.body.append(el);
  }
  // The early arrival boot draws a CSS fallback first; swap in the real
  // curtain as soon as the module is running.
  if (!el.dataset.nether) {
    el.dataset.nether = '1';
    const url = netherTexture();
    if (url) el.style.setProperty('--nether', `url(${url})`);
  }
  return el;
}

function clearOverlay(root = document.documentElement) {
  document.querySelector('#portal-ripple')?.remove();
  root.classList.remove(ARRIVING_CLASS);
}

// Written by the door just before it navigates; read once by the page that
// lands, which is why it lives in sessionStorage and not in the URL.
export function markArrival() {
  try {
    sessionStorage.setItem(ARRIVING, '1');
    sessionStorage.setItem(ARRIVING_AT, String(Date.now()));
  } catch { /* private mode: no veil */ }
}

// Returns true when this page load is a portal arrival that played.
export function revealArrival() {
  const root = document.documentElement;
  let stored = false, at = 0;
  try {
    stored = sessionStorage.getItem(ARRIVING) === '1';
    at = Number(sessionStorage.getItem(ARRIVING_AT)) || 0;
    sessionStorage.removeItem(ARRIVING); sessionStorage.removeItem(ARRIVING_AT);
  } catch { /* no stored flag */ }
  if (!(stored || root.classList.contains(ARRIVING_CLASS)) || reduceMotion()) {
    clearOverlay(root);
    return false;
  }
  const el = layer();
  if (at) el.style.setProperty('--nether-delay', `-${Math.min(6000, Math.max(0, Date.now() - at))}ms`);
  if (!root.classList.contains(ARRIVING_CLASS)) root.classList.add(ARRIVING_CLASS);
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
    setTimeout(done, ARRIVE_MS + 500);
  };
  // The engine loading screen is hidden on portal arrivals; wait for the
  // world to be on screen before dissolving the veil. Direct visits keep the
  // normal loader because no arrival flag is set.
  const loading = document.querySelector('#loading');
  if (!loading || loading.classList.contains('done')) { requestAnimationFrame(start); return true; }
  const begun = performance.now();
  const wait = () => {
    if (!document.body.contains(loading) || loading.classList.contains('done') || performance.now() - begun > WAIT_MS) start();
    else requestAnimationFrame(wait);
  };
  requestAnimationFrame(wait);
  return true;
}

// Charge the glass, then leave. The wait covers the veil's fade-in on this
// page; the next page carries the same texture from its first paint.
export function chargeAndLeave(leave) {
  if (reduceMotion()) { leave(); return; }
  const el = layer();
  document.documentElement.classList.remove(ARRIVING_CLASS);
  el.classList.remove(OPENING);
  el.classList.add(CHARGING);
  setTimeout(leave, DEPART_MS);
}
