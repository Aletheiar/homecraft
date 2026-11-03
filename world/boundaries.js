// The courtyard's floor and the imported shell standing on it. The shell is not
// in the block grid, so this source describes it for walking, flying, landing
// and clicks: it is a cone a body can walk up, not a wall around the pyramid.
import * as THREE from 'three';

export const FENCE_HALF = 39.5;
export const COURTYARD = { x0: -39.5, x1: 39.5, z0: -39.5, z1: 39.5, bottom: -4.5, top: 38 };
export const PYRAMID = { half: 18.2, height: 24.8, doorHalf: 2.8, doorHeight: 3.2 };
export const PYRAMID_SITE = 'pyramid';
const SHELL = .6;          // depth of the stepped membrane
const BODY = 1.8;
// The andesite capstone on the apex: a flat 1.2 m block that rises 0.8 m above
// the glass around it, so it is a plinth to web or jump onto, not a stair.
const CAPSTONE = .6;
// The model's western door is cut through the lowest treads: its floor is the
// courtyard paving, and the treads above it start at 3.3 m.
const DOOR = { x0: -19.6, x1: -13.4, half: 2.9, top: 3.3 };
// Paving reported beside the shell so a body can step between the block grid and
// the first of it: a surface is only enterable when its neighbours are in reach.
const APRON = .6;

export function withinCourtyard(x, z, feet = 0) {
  return Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(feet)
    && x > COURTYARD.x0 + .3 && x < COURTYARD.x1 - .3
    && z > COURTYARD.z0 + .3 && z < COURTYARD.z1 - .3
    && feet >= COURTYARD.bottom && feet + 1.8 < COURTYARD.top;
}

// Height of the shell at radius r, or null off the pyramid. The membrane is a
// cone, not the 0.4 m treads it is drawn with: a tread is 0.267 m deep and the
// step test samples 0.3 m out, so a body's feet would straddle two treads at
// every riser and jam. The cone runs through each tread's nose, so a visitor
// climbs the staircase they see without the staircase telling them to stop.
export function pyramidTop(r) {
  if (!(r <= PYRAMID.half)) return null;
  if (r <= CAPSTONE) return PYRAMID.height;
  return PYRAMID.height * (1 - r / PYRAMID.half);
}

// A* routes stay on the courtyard floor. Use a fixed footprint rather than
// the async loaded surface: a raised, climbable apron must not become a wall
// merely because the model arrived before the walking grid was built.
export function navigationBlocks(x, z, feet = 0) {
  const top = pyramidTop(Math.max(Math.abs(x), Math.abs(z)));
  if (top === null) return false;
  if (top <= DOOR.top && Math.abs(z) < DOOR.half && x > DOOR.x0 && x < DOOR.x1) return false;
  return feet < top - .01 && feet + BODY > top - SHELL;
}

// Walkable top of the shell under (x, z), or null off it. Once the model is
// loaded the answer comes from the shell itself, so a body stands exactly where
// the glass is drawn — including the door gap and the steps around it, which the
// analytic cone below gets wrong near the entrance. Until then (and in tests)
// the cone stands in for the model. Inside the door tunnel the answer is 0: the
// tunnel's floor is level with the courtyard.
let surface = null;

export function useShellSurface(fn) { surface = fn; }

export function shellTop(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const r = Math.max(Math.abs(x), Math.abs(z));
  // The apron beyond the shell is ours: a step ring that turns the model's full
  // block first course into two steps a body can take on foot.
  if (!(r <= PYRAMID.half + APRON)) return null;
  if (surface) {
    const y = surface(x, z);
    if (typeof y === 'number' && Number.isFinite(y)) return Math.max(0, y);
    if (y === null) return null;
  }
  const top = pyramidTop(r);
  if (top === null) return null;
  if (top <= DOOR.top && z > -DOOR.half && z < DOOR.half && x > DOOR.x0 && x < DOOR.x1) return 0;
  return top;
}

// A body at (x, feet, z) inside the membrane, or under glass too low for it.
// Standing on the glass is not a collision; walking the hall floor under the glass
// is free until the slope comes down to head height.
export function shellBlocks(x, feet, z) {
  const top = shellTop(x, z);
  if (!top) return false;
  return feet < top - .01 && feet + BODY > top - SHELL;
}

export function createBoundarySource(obstacles = []) {
  return {
    // The slope, the door tunnel, and the paving beside them.
    levels(x, z, out) {
      const top = shellTop(x, z);
      if (top === null) {
        if (Math.max(Math.abs(x), Math.abs(z)) <= PYRAMID.half + APRON) out.push({ y: 0, site: null });
        return;
      }
      out.push(top > 0 ? { y: top, site: PYRAMID_SITE } : { y: 0, site: null });
    },
    // The shell is solid, and the glass overhead is a ceiling.
    obstructed(x, z, feet) { return shellBlocks(x, feet, z); },
    // The outer lawn is a rendered plane, outside the voxel collision grid.
    viewBlock(from, dir, far) {
      if (dir.y >= 0) return Infinity;
      const t = (-.39 - from.y) / dir.y;
      if (t < 0 || t > far) return Infinity;
      const x = from.x + dir.x * t, z = from.z + dir.z * t;
      return Math.abs(x) >= 44.2 || Math.abs(z) >= 44.2 ? t : Infinity;
    },
    // The shell answers a ray as a height field, so a web can anchor on the
    // slope and a tap on it is a place to go. Rays starting under the glass
    // (inside the hall) do not answer, and a crossing has to touch the
    // membrane: a ray passing below the roof through the door misses.
    pick(ray) {
      const o = ray.origin, d = ray.direction;
      const under = shellTop(o.x, o.z);
      if (under !== null && o.y < under - .05) return null;
      const B = PYRAMID.half + APRON;
      let t0 = 0, t1 = 200;
      for (const [at, dir, lo, hi] of [[o.x, d.x, -B, B], [o.y, d.y, 0, PYRAMID.height], [o.z, d.z, -B, B]]) {
        if (Math.abs(dir) < 1e-9) { if (at < lo || at > hi) return null; continue; }
        const a = (lo - at) / dir, b = (hi - at) / dir;
        t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
      }
      if (!(t1 > t0)) return null;
      const px = t => o.x + d.x * t, py = t => o.y + d.y * t, pz = t => o.z + d.z * t;
      // Positive above the shell, negative below it; off the pyramid counts as above.
      const rise = t => { const s = shellTop(px(t), pz(t)); return s === null ? 1 : py(t) - s; };
      if (rise(t0) < 0) return null;
      let lo = t0, hi = 0;
      for (let t = t0 + .15; t <= t1; t += .15) {
        if (rise(t) < 0) { hi = t; break; }
        lo = t;
      }
      if (!hi) return null;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (rise(mid) < 0) hi = mid; else lo = mid; }
      const p = { x: px(hi), y: py(hi), z: pz(hi) }, s = shellTop(p.x, p.z);
      if (s === null || Math.abs(p.y - s) > SHELL) return null;
      return { t: hi, point: new THREE.Vector3(p.x, p.y, p.z), site: PYRAMID_SITE };
    },
    collides(x, feet, z) {
      if (!withinCourtyard(x, z, feet) || shellBlocks(x, feet, z)) return true;
      if (feet < 2.3) for (const o of obstacles) {
        if (x > o.x0 - .25 && x < o.x1 + .25 && z > o.z0 - .25 && z < o.z1 + .25) return true;
      }
      return false;
    },
  };
}
