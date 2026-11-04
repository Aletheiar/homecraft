import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { HALL_CENTER, HALL_EMBLEM } from './space-config.js';

// The hall floor drawing: one compass-and-orbit emblem under the centre
// plinth, joined to the doors by pale stone seams. Both parts are floor
// decoration only — no colliders, no lights, two draw calls in total.
//
// The imported courtyard paving sits at y = .025 and already receives the glass
// shadows. A decal painted on top of it and lit by the scene turns into a grey
// film wherever the lattice crosses it, so the emblem is drawn white-on-white
// and multiplied into the floor instead: the stone pattern and its shadows stay
// exactly as they are, and only the darker inlay lines survive. Nothing writes
// depth, so there is nothing to z-fight.
const PAVING = .025;
const SEAM_Y = PAVING + .006;
const EMBLEM_Y = PAVING + .012;

// Multiplied into the floor, so these are "how much darker than the stone":
// a few percent for the medallion, about a quarter for the inlay lines. The
// palette stays a low-saturation pale gold grey so it reads as inlaid stone
// and brass rather than as paint.
const MEDALLION = '#f5f0e4';
const OUTER = '#c0b39a';
const HAIRLINE = '#ded8c9';
const INNER = '#b9ad97';
const DIAL = '#c2b294';

function paintEmblem(ctx, w, h) {
  const cx = w / 2, cy = h / 2, px = w / (HALL_EMBLEM.radius * 2);
  const radius = HALL_EMBLEM.radius;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  const ring = (r, width, color) => {
    ctx.beginPath(); ctx.arc(cx, cy, r * px, 0, Math.PI * 2);
    ctx.lineWidth = width * px; ctx.strokeStyle = color; ctx.stroke();
  };
  // The medallion itself: a stone a shade warmer than the paving, cut on the
  // outer ring so the circle is legible from across the hall.
  ctx.beginPath(); ctx.arc(cx, cy, (radius - .3) * px, 0, Math.PI * 2);
  ctx.fillStyle = MEDALLION; ctx.fill();
  // Outer construction ring: two hairlines, the inner one much fainter.
  ring(radius - .34, .09, OUTER);
  ring(radius - .62, .02, HAIRLINE);
  // A guide ring between the two circles, as a plan keeps its setting-out.
  ring(2.95, .018, HAIRLINE);
  // Local orbital inlay around the museum plinth. The outer compass and the
  // seams toward the doors remain unchanged outside this 2.5 m radius.
  ring(2.72, .016, '#cabca0');
  ring(2.5, .045, '#c1b090');
  ring(2.24, .022, '#cbbda3');
  // A graduated dial, five degrees a tick and a longer mark every thirty, so
  // the floor repeats the scales cut into the armillary above it.
  for (let i = 0; i < 72; i++) {
    const a = i * Math.PI / 36, major = i % 6 === 0, medium = i % 2 === 0;
    const r0 = major ? 2.53 : medium ? 2.57 : 2.6;
    ctx.strokeStyle = major ? INNER : DIAL;
    ctx.lineWidth = (major ? .022 : medium ? .014 : .011) * px;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0 * px, cy + Math.sin(a) * r0 * px);
    ctx.lineTo(cx + Math.cos(a) * 2.69 * px, cy + Math.sin(a) * 2.69 * px);
    ctx.stroke();
  }
  ctx.strokeStyle = '#bfae8e'; ctx.lineWidth = .018 * px;
  for (let i = 0; i < 32; i++) {
    const a = i * Math.PI / 16, r0 = i % 4 === 0 ? 2.31 : 2.36, r1 = 2.43;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0 * px, cy + Math.sin(a) * r0 * px);
    ctx.lineTo(cx + Math.cos(a) * r1 * px, cy + Math.sin(a) * r1 * px); ctx.stroke();
  }
  // Eight spokes, like the drawn radii of a plan, not an ornament.
  ctx.strokeStyle = HAIRLINE; ctx.lineWidth = .026 * px; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const r0 = radius - .64, r1 = radius - .06;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0 * px, cy + Math.sin(a) * r0 * px);
    ctx.lineTo(cx + Math.cos(a) * r1 * px, cy + Math.sin(a) * r1 * px);
    ctx.stroke();
  }
  // Four notches mark the two walking axes: west-east, north-south.
  ctx.strokeStyle = INNER; ctx.lineWidth = .05 * px;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, r0 = radius - .28, r1 = radius - .02;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0 * px, cy + Math.sin(a) * r0 * px);
    ctx.lineTo(cx + Math.cos(a) * r1 * px, cy + Math.sin(a) * r1 * px);
    ctx.stroke();
  }
  // The four axes of the instrument run out of the plinth and into the dial,
  // so the stone platform sits in the same setting-out as the brass above it.
  ctx.strokeStyle = '#bfae8e'; ctx.lineWidth = .022 * px;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2; ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 1.40 * px, cy + Math.sin(a) * 1.40 * px);
    ctx.lineTo(cx + Math.cos(a) * 2.52 * px, cy + Math.sin(a) * 2.52 * px); ctx.stroke();
  }
}

// A pale seam from the emblem edge toward (tx, tz), rotated to its direction.
function seam(B, from, to, width, tint) {
  const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
  if (length < .05) return;
  const cx = from.x + dx / 2, cz = from.z + dz / 2;
  B.box(cx, SEAM_Y, cz, length, .012, width, { tex: 'paint', tint }, { ry: Math.atan2(-dz, dx), shadow: false });
}

export function buildHallFloor(layer) {
  const B = new BoxBatch(layer);
  const planes = [];
  const radius = HALL_EMBLEM.radius;
  const { x, z } = HALL_CENTER;
  const edge = (dx, dz) => {
    const length = Math.hypot(dx, dz) || 1;
    return { x: x + dx / length * (radius + .45), z: z + dz / length * (radius + .45) };
  };
  // The main axis runs west to east, from the entrance to the reading-room
  // door; the two front doors are joined by shorter diagonal seams. Each seam
  // stops short of the emblem ring and of the door thresholds.
  seam(B, { x: -14.6, z }, edge(1, 0), .14, 0xd9d2c2);
  seam(B, edge(1, 0), { x: 9.9, z }, .14, 0xd9d2c2);
  seam(B, edge(-1, -1), { x: -8.1, z: -4.9 }, .11, 0xdcd5c6);
  seam(B, edge(-1, 1), { x: -8.1, z: 4.9 }, .11, 0xdcd5c6);
  const texture = canvasTexture(1024, 1024, paintEmblem, { pixelated: false });
  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: texture, blending: THREE.MultiplyBlending, premultipliedAlpha: true,
      transparent: true, opacity: .9, depthWrite: false, toneMapped: false,
    }),
  );
  emblem.name = 'hall-emblem';
  emblem.rotation.x = -Math.PI / 2;
  emblem.position.set(x, EMBLEM_Y, z);
  emblem.renderOrder = 1;
  planes.push(emblem);
  return { batches: { hallFloor: B }, planes };
}
