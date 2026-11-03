// Optional convex polygon regions extend the original rectangular pool.
// All coordinates are horizontal x,z positions, independent of Three.js.
const cache = new WeakMap();
function regions(pool) {
  if (!pool) return [];
  if (cache.has(pool)) return cache.get(pool);
  const polygons = pool.polygons || [[[pool.x0, pool.z0], [pool.x1, pool.z0], [pool.x1, pool.z1], [pool.x0, pool.z1]]];
  const result = polygons.map(points => {
    const area = points.reduce((s, a, i) => { const b = points[(i + 1) % points.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0);
    const p = area < 0 ? [...points].reverse() : points;
    return p.map((a, i) => {
      const b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      return { ax: a[0], az: a[1], bx: b[0], bz: b[1], dx, dz, len, ox: dz / len, oz: -dx / len };
    });
  });
  cache.set(pool, result); return result;
}
function contains(edges, x, z, margin = 0) {
  return edges.every(e => (x - e.ax) * e.ox + (z - e.az) * e.oz <= -margin + 1e-7);
}
export function poolRegion(pool, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return -1;
  return regions(pool).findIndex(edges => contains(edges, x, z));
}
export function poolContains(pool, x, z) {
  if (!pool) return false;
  if (!pool.polygons) return x >= pool.x0 && x < pool.x1 && z >= pool.z0 && z < pool.z1;
  return poolRegion(pool, x, z) >= 0;
}
function projection(e, x, z, inset = 0) {
  inset = Math.min(inset, e.len / 2);
  const t = Math.max(inset / e.len, Math.min(1 - inset / e.len, ((x - e.ax) * e.dx + (z - e.az) * e.dz) / (e.len * e.len)));
  return { x: e.ax + e.dx * t, z: e.az + e.dz * t, ox: e.ox, oz: e.oz };
}
function choose(pool, x, z, reference) {
  const all = regions(pool);
  const at = reference ? poolRegion(pool, reference.x, reference.z) : poolRegion(pool, x, z);
  if (at >= 0) return all[at];
  let best = all[0], distance = Infinity;
  for (const edges of all) for (const e of edges) {
    const p = projection(e, x, z), d = Math.hypot(p.x - x, p.z - z);
    if (d < distance) { distance = d; best = edges; }
  }
  return best;
}
export function clampPoolPoint(pool, x, z, margin = .4, reference = null) {
  const edges = choose(pool, x, z, reference);
  if (!edges) return { x, z };
  // Repeated half-plane projection keeps movement in the same convex basin.
  for (let i = 0; i < 40; i++) {
    let changed = false;
    for (const e of edges) {
      const d = (x - e.ax) * e.ox + (z - e.az) * e.oz + margin;
      if (d > 1e-9) { x -= e.ox * d; z -= e.oz * d; changed = true; }
    }
    if (!changed) break;
  }
  if (!contains(edges, x, z)) {
    x = edges.reduce((sum, e) => sum + e.ax, 0) / edges.length;
    z = edges.reduce((sum, e) => sum + e.az, 0) / edges.length;
  }
  return { x, z };
}
export function poolShores(pool, x, z, reference = null) {
  return (choose(pool, x, z, reference) || []).map(e => projection(e, x, z, .8));
}
