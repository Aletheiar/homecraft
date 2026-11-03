// Original voxel interpretation of the *room prop* in The Binding of Isaac.
// Reference and asset-search limits: docs/research/2026-11-03-isaac-room-statue.md.
// Local +z is the blank face; the runtime turns it east toward the pyramid.
export const ANGEL_PLACEMENT = Object.freeze({ x: -62.6, z: -19.2, yaw: Math.PI / 2 });
export const ANGEL_PALETTE = Object.freeze([
  0xeeeef2, // white robe and feathers
  0xa3a5af, // gray crown and feather shadows
  0x666773, // stone recesses
  0x29262c, // dark sprite-style contours
  0xe6c8c2, // unmarked pale oval face and hands
  0xc09d99, // hand and face edge shade
]);
const STEP = .2, FOOT = 4.8;

export function createAngelBoxes() {
  const boxes = [], cells = new Map();
  const box = (x, y, z, w, h, d, tone, part) => boxes.push({ x, y, z, w, h, d, tone, part });
  const voxel = (x, y, z, tone, part) => cells.set(`${x},${y},${z}`, { x, y, z, tone, part });
  box(0, 0, 0, 6, .4, 6, 1, 'foundation');
  box(0, .4, 0, 4, 4.05, 4.4, 1, 'pedestal');
  box(0, .65, 0, 4.08, .15, 4.48, 2, 'pedestal-trim');
  box(0, 4.45, 0, 4.45, .2, 4.85, 2, 'pedestal-trim');
  box(0, 4.65, 0, 4.6, .15, 5, 0, 'pedestal-trim');
  box(0, 1.3, 2.215, 2.5, 2.3, .035, 2, 'pedestal-panel');
  box(0, 1.4, 2.24, 2.3, 2.1, .035, 1, 'pedestal-panel');
  for (const x of [-1.78, 1.78]) box(x, .9, 2.23, .2, 3.2, .12, 0, 'pedestal-trim');

  // The game prop has a short seated robe and two feet under an oversized head.
  for (const side of [-1, 1]) {
    box(side * .68, FOOT, .25, 1, .35, 1.25, 3, 'feet-outline');
    box(side * .68, FOOT + .15, .4, .7, .2, 1.12, 2, 'feet');
  }
  for (let y = 2; y <= 11; y++) {
    const halfWidth = y < 5 ? 9 : (y < 8 ? 8 : 6);
    for (let x = -halfWidth; x <= halfWidth; x++) for (let z = -5; z <= 4; z++) {
      if (Math.abs(x) === halfWidth && (z === -5 || z === 4)) continue;
      voxel(x, y, z, Math.abs(x) === halfWidth || y === 2 ? 3 : (z < -2 ? 1 : 0), 'robe');
    }
  }
  box(0, FOOT + .55, .94, 2.8, .18, .18, 1, 'robe-fold');
  box(0, FOOT + 1.78, .92, 2.2, .2, .2, 1, 'collar');

  // The screenshot shows two open offering hands, far apart at the waist.
  for (const side of [-1, 1]) {
    box(side * 1.38, FOOT + 1.3, .52, .7, .65, .78, 3, 'sleeve-outline');
    box(side * 1.38, FOOT + 1.45, .64, .55, .4, .8, 0, 'sleeve');
    box(side * 1.78, FOOT + 1.47, 1.04, 1.02, .16, .82, 3, 'hand-outline');
    box(side * 1.78, FOOT + 1.62, 1.08, .76, .22, .72, 4, 'hands');
    box(side * 1.45, FOOT + 1.8, 1.21, .25, .24, .32, 4, 'thumb');
    for (let i = 0; i < 2; i++) box(side * (1.76 + i * .2), FOOT + 1.63, 1.454, .065, .15, .035, 5, 'finger-groove');
  }

  // Wide blank oval and gray cap: the strongest identifying features. The
  // solid rear shell has real depth; the front remains completely unmarked.
  for (let y = 11; y <= 32; y++) {
    const v = (y - 21.5) / 11;
    const halfWidth = Math.floor(9.7 * Math.sqrt(Math.max(0, 1 - v * v)));
    for (let x = -halfWidth; x <= halfWidth; x++) for (let z = -7; z <= 4; z++) {
      if ((x / 10) ** 2 + v * v + ((z + 1) / 6.5) ** 2 > 1.08) continue;
      voxel(x, y, z, z < -3 ? 2 : 1, 'head-rim');
    }
  }
  // Dark contour and inner gray rim surround the blank face. Each row is
  // authored geometry; no extracted game texture or sprite is bundled.
  for (let y = 11; y <= 31; y++) {
    const v = (y - 21) / 10.6;
    const outer = Math.floor(9.6 * Math.sqrt(Math.max(0, 1 - v * v)));
    const faceV = (y - 20.5) / 9.2;
    const inner = Math.abs(faceV) < 1 ? Math.floor(8.1 * Math.sqrt(1 - faceV * faceV)) : -1;
    for (let x = -outer; x <= outer; x++) {
      voxel(x, y, 4, Math.abs(x) >= outer - 1 || y <= 12 ? 3 : 1, 'head-rim');
      if (Math.abs(x) <= inner) {
        voxel(x, y, 4, Math.abs(x) === inner || y === 12 ? 5 : 4, 'blank-face');
        voxel(x, y, 5, Math.abs(x) === inner || y === 12 ? 5 : 4, 'blank-face');
      }
    }
  }

  // Long folded wings flank the head and point down toward the hem. The
  // stepped arch and three descending tips are an original simplification.
  const wing = [[8, 22], [10, 29], [12, 31], [14, 28], [16, 20], [18, 6],
    [18, 3], [16, 4], [14, 10], [14, 7], [12, 9], [11, 15], [10, 12], [8, 17]];
  const inside = (x, y) => {
    let hit = false;
    for (let i = 0, j = wing.length - 1; i < wing.length; j = i++) {
      const [xi, yi] = wing[i], [xj, yj] = wing[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  for (const side of [-1, 1]) for (let y = 3; y <= 31; y++) for (let x = 8; x <= 18; x++) {
    if (!inside(x, y)) continue;
    const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !inside(x + dx, y + dy));
    for (let z = -4; z <= -1; z++) voxel(side * x, y, z, edge ? 3 : (z === -4 ? 1 : 0), 'wing');
    const groove = (y > 11 && y < 24 && x === 13 - Math.floor((y - 11) / 6)) ||
      (y > 7 && y < 18 && x === 16 - Math.floor((y - 7) / 5));
    if (!edge && groove) voxel(side * x, y, 0, 1, 'wing-feather');
  }

  // Merge horizontal runs and vertically adjacent matching runs. All opaque
  // instances share a single draw batch, including the contour/face colors.
  const rows = new Map();
  for (const cell of cells.values()) {
    const key = `${cell.y},${cell.z},${cell.tone},${cell.part}`;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(cell.x);
  }
  const runs = [];
  for (const [key, xs] of rows) {
    const [y, z, tone, part] = key.split(',');
    xs.sort((a, b) => a - b);
    let first = xs[0], last = first;
    const add = () => runs.push({ first, last, y: Number(y), z: Number(z), tone: Number(tone), part });
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] === last + 1) last = xs[i];
      else { add(); first = last = xs[i]; }
    }
    add();
  }
  runs.sort((a, b) => a.y - b.y);
  const active = new Map();
  for (const run of runs) {
    const key = `${run.first},${run.last},${run.z},${run.tone},${run.part}`;
    const previous = active.get(key);
    if (previous && previous.lastY === run.y - 1) {
      previous.box.h += STEP; previous.lastY = run.y;
    } else {
      const entry = { x: (run.first + run.last) * STEP / 2, y: FOOT + run.y * STEP, z: run.z * STEP,
        w: (run.last - run.first + 1) * STEP, h: STEP, d: STEP, tone: run.tone, part: run.part };
      boxes.push(entry); active.set(key, { box: entry, lastY: run.y });
    }
  }
  // Matching runs can also join in depth; this keeps the rounded rear of the
  // head within the geometry budget instead of flattening it into a plaque.
  const merged = [], depth = new Map();
  boxes.sort((a, b) => a.z - b.z);
  for (const item of boxes) {
    const key = [item.x, item.y, item.w, item.h.toFixed(6), item.tone, item.part].join(',');
    const previous = depth.get(key);
    if (previous && Math.abs(previous.z + previous.d / 2 - item.z + item.d / 2) < 1e-6) {
      const front = item.z + item.d / 2, back = previous.z - previous.d / 2;
      previous.z = (front + back) / 2; previous.d = front - back;
    } else { merged.push(item); depth.set(key, item); }
  }
  return merged;
}
