// Pure geometry shared by portal movement and regression tests.
export function crossedPortal(gate, from, to) {
  if (Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) > 1.8) return false;
  const sn = Math.sin(gate.yaw), cs = Math.cos(gate.yaw);
  const a = (from.x - gate.x) * sn + (from.z - gate.z) * cs;
  const b = (to.x - gate.x) * sn + (to.z - gate.z) * cs;
  if (!(a > 0 && b <= 0)) return false;
  const t = a / (a - b), y = from.y + (to.y - from.y) * t;
  const x = from.x + (to.x - from.x) * t - gate.x;
  const z = from.z + (to.z - from.z) * t - gate.z;
  return Math.abs(x * cs - z * sn) < 1.03 && y >= -.1 && y + 1.8 < 3.5;
}

export function portalTarget(href, base) {
  try {
    const url = new URL(href, base), origin = new URL(base).origin;
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === origin) ? url.href : null;
  } catch { return null; }
}

