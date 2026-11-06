import { BoxBatch } from '@engine/world/blocks.js';
import { HALL_SPOTS, HALL_EXHIBIT, workbenchPoint } from './space-config.js';
import { createArmillary } from './armillary.js';
import { buildWorkstation } from './workstation.js';

// The hall interior: one centre display under the glass, a private workbench
// in the north-east corner, an Ori exhibit in the south-east, and the few
// planters and shelves that frame the three doors. Everything is built from the
// shared box vocabulary (walnut, travertine, plaster, terracotta, linen) so the
// furniture reads as furniture in a Minecraft hall, not as a render.
const WOOD = { tex: 'walnut' };
const STONE = { tex: 'travertine' };
const LEAF = { tex: 'leaves' };
const POT = { tex: 'terracotta' };
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

  // ---- the centre: plinth and armillary, aligned with the floor
  // drawing at (0, 0). Low and quiet; the doors stay the landmarks. ----
  const { plinth, height, cap, upperWidth, upperHeight, capHeight, gap, armillary, lantern } = HALL_EXHIBIT;
  // No obstacle: `world/layout.js` reports the plinth top as floor, so the walk
  // grid climbs onto it. An obstacle here would be an invisible column over a
  // low slab, which is exactly what a visitor must not meet.
  box(0, .02, 0, plinth, height, plinth, STONE);
  const lowerTop=.02+height, upperBottom=lowerTop+gap, upperTop=upperBottom+upperHeight;
  box(0, upperBottom, 0, upperWidth, upperHeight, upperWidth, STONE);
  box(0, upperTop, 0, cap, capHeight, cap, { tex: 'paint', tint: 0xe2dccd });
  const brass={tex:'paint',tint:0xb89c68};
  for(const axis of ['x','z'])for(const side of [-1,1])
    box(axis==='x'?side*(upperWidth/2+.004):0,upperTop-.025,axis==='z'?side*(upperWidth/2+.004):0,
      axis==='x'?.012:upperWidth,.012,axis==='z'?.012:upperWidth,brass);
  // Small warm corner lanterns are emissive surfaces, not new point lights:
  // a dim amber pane inset between brass plates and posts, so the frame reads
  // before the light does. They never flicker and never light the floor.
  for(const x of [-1.19,1.19])for(const z of [-1.19,1.19]){
    box(x,lowerTop,z,.16,.035,.16,brass);
    box(x,lowerTop+.035,z,.172,.1,.172,{tex:'paint',tint:lantern.tint,emissive:lantern.emissive});
    box(x,lowerTop+.135,z,.16,.025,.16,brass);
    for(const dx of [-.067,.067])for(const dz of [-.067,.067])box(x+dx,lowerTop+.035,z+dz,.014,.1,.014,brass);
  }
  const exhibit = createArmillary(armillary, upperTop+capHeight);
  planes.push(exhibit.mesh);

  // ---- north-east corner: the private industrial workstation ----
  const { shelfX, shelfZ } = HALL_SPOTS.workbench;
  const workstation = buildWorkstation(HALL_SPOTS.workbench, { box, solid });
  planes.push(workstation.mesh); hotspots.push(workstation.hotspot);
  const lamp=workbenchPoint(0,.3);
  bakes.push({ id: 'hall-workbench-lamp', position: [lamp.x,1.1,lamp.z], power: .8, radius: 2, direction: null });
  // The workbench's own bookshelf, in the corner and turned to face the desk.
  B.at(shelfX, 0, shelfZ, -Math.PI / 2, () => {
    box(0, .04, 0, 1.2, 1.58, .34, SHELF);
    box(0, 0, 0, 1.24, .04, .36, WOOD);
    box(0, 1.62, 0, 1.24, .05, .36, WOOD);
  });
  solid(shelfX, shelfZ, .42, 1.3);

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

  return { batches: { hall: B }, planes, obstacles, hotspots, bakes, exhibit, workstation };
}
