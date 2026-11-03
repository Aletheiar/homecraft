export const FENCE_HALF = 39.5;
export const COURTYARD = { x0: -39.5, x1: 39.5, z0: -39.5, z1: 39.5, bottom: -4.5, top: 38 };
export const PYRAMID = { half: 18.2, height: 24.8, doorHalf: 2.8, doorHeight: 3.2 };
const BODY_SAMPLES = [.15, .95, 1.7];

export function withinCourtyard(x, z, feet = 0) {
  return Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(feet)
    && x > COURTYARD.x0 + .3 && x < COURTYARD.x1 - .3
    && z > COURTYARD.z0 + .3 && z < COURTYARD.z1 - .3
    && feet >= COURTYARD.bottom && feet + 1.8 < COURTYARD.top;
}

export function shellCollides(x, feet, z) {
  if (Math.abs(z) < PYRAMID.doorHalf && x < -13.5 && x > -19.5 && feet + 1.8 < PYRAMID.doorHeight) return false;
  const r = Math.max(Math.abs(x), Math.abs(z));
  for (const h of BODY_SAMPLES) {
    const y = feet + h;
    if (y < 0 || y > PYRAMID.height + .3) continue;
    const edge = PYRAMID.half * (1 - y / PYRAMID.height);
    if (Math.abs(r - edge) < .72) return true;
  }
  return false;
}

export function segmentHitsShell(from, to) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / .2));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (shellCollides(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, from.z + (to.z - from.z) * t)) return true;
  }
  return false;
}

export function createBoundarySource(obstacles = []) {
  return {
    levels() {},
    // The outer lawn is a rendered plane, outside the voxel collision grid.
    viewBlock(from, dir, far) {
      if (dir.y >= 0) return Infinity;
      const t = (-.39 - from.y) / dir.y;
      if (t < 0 || t > far) return Infinity;
      const x = from.x + dir.x * t, z = from.z + dir.z * t;
      return Math.abs(x) >= 44.2 || Math.abs(z) >= 44.2 ? t : Infinity;
    },
    collides(x, feet, z) {
      if (!withinCourtyard(x, z, feet) || shellCollides(x, feet, z)) return true;
      if (feet < 2.3) for (const o of obstacles) {
        if (x > o.x0 - .25 && x < o.x1 + .25 && z > o.z0 - .25 && z < o.z1 + .25) return true;
      }
      return false;
    },
  };
}
