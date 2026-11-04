// E8 roots projected onto a Coxeter eigenplane (eigenvalue exp(2 pi i / 30)).
// These orthonormal axes use the orientation approved in the design preview.
const U = [0, -.11911770226439866, -.19273649092558676, -.21763887165692927, -.19273649092558628, -.1191177022643976, 0, -.9219330548851048];
const V = [-.09689906869984792, -.4635056599451289, -.2369303260558056, 0, .23693032605580613, .4635056599451294, .6698235723479294, 0];
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

export function projectE8() {
  const roots = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const root = Array(8).fill(0); root[i] = a; root[j] = b; roots.push(root);
    }
  }
  for (let mask = 0; mask < 256; mask++) {
    const root = Array.from({ length: 8 }, (_, i) => mask & (1 << i) ? -.5 : .5);
    if (root.filter(x => x < 0).length % 2 === 0) roots.push(root);
  }
  const points = roots.map(root => [dot(root, U), dot(root, V)]);
  const radii = points.map(([x, y]) => Math.hypot(x, y));
  const levels = [...new Set(radii.map(r => r.toFixed(7)))].map(Number).sort((a, b) => a - b);
  const rings = radii.map(r => levels.findIndex(level => Math.abs(level - r) < 1e-6));
  const radius = Math.max(...radii);
  for (const point of points) { point[0] /= radius; point[1] /= radius; }
  const edges = [];
  for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) {
    if (roots[i].reduce((sum, x, k) => sum + (x - roots[j][k]) ** 2, 0) === 2) edges.push([i, j]);
  }
  return { points, rings, edges };
}
