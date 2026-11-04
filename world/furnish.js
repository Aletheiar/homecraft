import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { HALL_SPOTS, HALL_EXHIBIT } from './space-config.js';
import { createArmillary } from './armillary.js';

// The hall interior: one centre display under the glass, a private workbench
// in the north-east corner, a lounge in the south-east corner, and the few
// planters and shelves that frame the three doors. Everything is built from the
// shared box vocabulary (walnut, travertine, plaster, terracotta, linen) so the
// furniture reads as furniture in a Minecraft hall, not as a render.
const WOOD = { tex: 'walnut' };
const PALE = { tex: 'plaster' };
const STONE = { tex: 'travertine' };
const BRASS = { tex: 'paint', tint: 0xa98b4e };
const INK = { tex: 'paint', tint: 0x33403f };
const LINEN = { tex: 'linen' };
const PAPER = { tex: 'paint', tint: 0xf0e9d6 };
const LEAF = { tex: 'leaves' };
const POT = { tex: 'terracotta' };
const SCREEN = { tex: 'paint', tint: 0x445c60, emissive: .55 };
const SHADE = { tex: 'paint', tint: 0xf4e5c4, emissive: 1 };
const SHELF = { tex: 'bookshelf', top: 'walnut' };

export function furnishHall(layer) {
  const B = new BoxBatch(layer), planes = [], obstacles = [], hotspots = [], bakes = [];
  const box = (x, y, z, w, h, d, mat = WOOD, opts) => B.box(x, y, z, w, h, d, mat, opts);
  // A footprint the walker cannot enter: the same margin the old furniture used.
  const solid = (x, z, w, d) => obstacles.push({
    x0: x - w / 2 - .07, x1: x + w / 2 + .07,
    z0: z - d / 2 - .07, z1: z + d / 2 + .07, level: 0,
  });

  function planter(x, z) {
    box(x, .02, z, .64, .52, .64, POT);
    box(x, .54, z, .94, .78, .94, LEAF);
    solid(x, z, .94, .94);
  }
  // A bench facing north (back on its south side) or west (back on its east side).
  function benchAlongX(x, z, length) {
    box(x, .36, z, length, .09, .5, LINEN);
    for (const dx of [-1, 1]) for (const dz of [-.17, .17]) box(x + dx * (length / 2 - .1), 0, z + dz, .07, .36, .07, WOOD);
    box(x, .45, z + .235, length, .44, .07, WOOD);
    solid(x, z + .01, length, .62);
  }
  function benchAlongZ(x, z, length) {
    box(x, .36, z, .5, .09, length, LINEN);
    for (const dx of [-.17, .17]) for (const dz of [-1, 1]) box(x + dx, 0, z + dz * (length / 2 - .1), .07, .36, .07, WOOD);
    box(x + .235, .45, z, .07, .44, length, WOOD);
    solid(x + .01, z, .62, length);
  }

  // ---- the centre: plinth and armillary, aligned with the floor
  // drawing at (0, 0). Low and quiet; the doors stay the landmarks. ----
  const { plinth, height, cap, armillary } = HALL_EXHIBIT;
  // No obstacle: `world/layout.js` reports the plinth top as floor, so the walk
  // grid climbs onto it. An obstacle here would be an invisible column over a
  // low slab, which is exactly what a visitor must not meet.
  box(0, .02, 0, plinth, height, plinth, STONE);
  box(0, .02 + height, 0, cap, .05, cap, { tex: 'paint', tint: 0xe2dccd });
  const exhibit = createArmillary(armillary, .02 + height + .05);
  planes.push(exhibit.mesh);

  // ---- north-east corner: the workbench ----
  const { deskX, deskZ, chairZ, shelfX, shelfZ } = HALL_SPOTS.workbench;
  const top = .68, thick = .06, flat = top + thick;              // desk surface
  box(deskX, top, deskZ, 2.6, thick, 1.05, WOOD);
  for (const dx of [-1.16, 1.16]) for (const dz of [-.39, .39]) box(deskX + dx, 0, deskZ + dz, .08, top, .08, WOOD);
  box(deskX, .12, deskZ, 2.44, .08, .9, { tex: 'paint', tint: 0x8c7a5f });
  solid(deskX, deskZ, 2.6, 1.05);
  // Monitor: a dark bezel with a lit-but-quiet screen, facing the chair.
  box(deskX - .15, flat, deskZ - .39, .3, .02, .18, INK);
  box(deskX - .15, flat + .02, deskZ - .39, .07, .2, .05, INK);
  box(deskX - .15, flat + .2, deskZ - .42, 1, .6, .05, { tex: 'black_metal' });
  box(deskX - .15, flat + .23, deskZ - .392, .92, .54, .012, SCREEN);
  box(deskX - .15, flat + .005, deskZ + .18, .86, .022, .22, INK);
  // Three rows of pale keycaps, the smallest readable hint that this is a keyboard.
  for (let i = 0; i < 3; i++) box(deskX - .15, flat + .028, deskZ + .1 + i * .055, .78, .008, .032, { tex: 'paint', tint: 0xb6ae9c });
  box(deskX + .45, flat + .008, deskZ + .2, .09, .03, .15, INK);
  // Papers, an open notebook, a mug and a small toolkit.
  box(deskX - .88, flat + .004, deskZ + .1, .42, .008, .3, PAPER, { ry: .12 });
  box(deskX - .8, flat + .012, deskZ + .18, .3, .008, .22, PAPER, { ry: -.07 });
  box(deskX - .92, flat + .005, deskZ - .34, .3, .018, .24, PAPER);
  box(deskX - .6, flat + .005, deskZ - .34, .3, .018, .24, PAPER);
  box(deskX - .76, flat + .001, deskZ - .34, .024, .026, .24, INK);
  box(deskX - 1.12, flat + .005, deskZ - .3, .09, .1, .09, { tex: 'paint', tint: 0xd9d3c4 });
  box(deskX + .72, flat + .005, deskZ - .35, .42, .15, .22, { tex: 'paint', tint: 0x6d7a72 });
  box(deskX + .72, flat + .155, deskZ - .35, .44, .03, .24, { tex: 'paint', tint: 0x59645d });
  box(deskX + .72, flat + .185, deskZ - .35, .2, .02, .035, BRASS);
  for (const [dx, tint] of [[-.1, 0xbca26a], [0, 0x88927b], [.1, 0xac8a53]]) box(deskX + .72 + dx, flat + .12, deskZ - .45, .03, .2, .03, { tex: 'paint', tint });
  // Desk lamp: the one warm light, and it only ever lights its own corner.
  box(deskX - 1.02, flat, deskZ - .4, .15, .015, .15, INK);
  box(deskX - 1.02, flat + .015, deskZ - .4, .03, .36, .03, BRASS);
  box(deskX - 1.02, flat + .36, deskZ - .32, .03, .03, .2, BRASS);
  box(deskX - 1.02, flat + .32, deskZ - .22, .24, .11, .24, SHADE);
  bakes.push({ id: 'hall-workbench-lamp', position: [deskX - 1.02, flat + .32, deskZ - .22], power: 2.2, radius: 5.5, direction: null });
  // Chair, pulled back to the desk.
  box(13.15, .4, chairZ, .56, .08, .56, LINEN);
  for (const dx of [-.23, .23]) for (const dz of [-.23, .23]) box(13.15 + dx, 0, chairZ + dz, .06, .4, .06, WOOD);
  box(13.15, .48, chairZ + .3, .56, .46, .07, WOOD);
  solid(13.15, chairZ - .03, .62, .66);
  // The workbench's own bookshelf, in the corner and turned to face the desk.
  B.at(shelfX, 0, shelfZ, -Math.PI / 2, () => {
    box(0, .04, 0, 1.2, 1.58, .34, SHELF);
    box(0, 0, 0, 1.24, .04, .36, WOOD);
    box(0, 1.62, 0, 1.24, .05, .36, WOOD);
  });
  solid(shelfX, shelfZ, .42, 1.3);
  planter(10.9, -9);
  // The little nameplate: a card on the desk's front edge, not a white board.
  const plate = canvasTexture(320, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(244,240,229,.94)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7bbbad'; ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = '#244642'; ctx.font = 'bold 34px "Microsoft YaHei",sans-serif'; ctx.fillText('工作台', 18, 58);
    ctx.fillStyle = '#60746f'; ctx.font = '17px "Microsoft YaHei",sans-serif'; ctx.fillText('一些正在进行的小实验', 108, 50);
  });
  box(deskX + 1.05, flat, deskZ + .48, .3, .015, .07, INK);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.44, .132), new THREE.MeshBasicMaterial({ map: plate, transparent: true, side: THREE.DoubleSide }));
  card.name = 'hall-workbench-plate';
  card.position.set(deskX + 1.05, flat + .075, deskZ + .51);
  planes.push(card);
  // The monitor is the workbench's one target: the engine's click path opens
  // the GitHub page through the existing data-link article.
  hotspots.push({ id: 'workbench', box: new THREE.Box3(new THREE.Vector3(deskX - .8, flat, deskZ - .5), new THREE.Vector3(deskX + .5, flat + .9, deskZ + .4)) });

  // ---- south-east corner: the lounge ----
  benchAlongZ(14.45, 10.9, 2.4);
  benchAlongX(12.6, 14.4, 2.4);
  // A low side table in the corner between the two benches.
  box(13.75, .38, 13.25, .7, .05, .7, { tex: 'paint', tint: 0xd8d2c2 });
  for (const dx of [-.29, .29]) for (const dz of [-.29, .29]) box(13.75 + dx, 0, 13.25 + dz, .05, .38, .05, WOOD);
  solid(13.75, 13.25, .74, .74);
  planter(15.3, 13.4);

  // ---- the reading room door: two shelves and two planters, leaving the
  // doorway and the walking lane between them completely open ----
  for (const z of [-4.6, 4.6]) {
    B.at(14.9, 0, z, -Math.PI / 2, () => {
      box(0, .04, 0, 1.2, 1.58, .34, SHELF);
      box(0, 0, 0, 1.24, .04, .36, WOOD);
      box(0, 1.62, 0, 1.24, .05, .36, WOOD);
    });
    solid(14.9, z, .42, 1.3);
  }
  for (const z of [-2.9, 2.9]) planter(11, z);
  // A last planter where the north wall turns, out of every lane.
  planter(11.6, -15.3);

  return { batches: { hall: B }, planes, obstacles, hotspots, bakes, exhibit };
}
