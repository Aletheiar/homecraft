# Diagonal workstation placement

Date: 2026-11-05, Asia/Shanghai.

The owner requested that the complete north-east workstation open towards the
central armillary instead of remaining parallel to the glass walls. This
follow-up preserves the existing artwork, furniture design and interaction.

## Placement

- Rotation: -30 degrees around the vertical axis. The front normal is
  `(-0.5, 0, 0.866025)`, facing southwest into the hall. The main artwork's
  normal has a dot product above 0.95 with its direction to the central instrument.
- Desk anchor: `(12.7, 0, -12.6)`, moved 0.6 m west from `(13.3, 0, -12.6)`.
  This inward adjustment keeps the tall backdrop under the sloping roof.
- Main poster centre: approximately `(13.257, 2.91, -13.765)`. Its 3.2 x 2 m
  image, dark frame and relative position above the triple display are unchanged.
- Seat: approximately `(12.040, -11.757)` on the ground plane, with eye y 1.28.
- Requested stand point: `(11.560, -10.926)`, resolved through navigation before exit.
- Workbench station approach: `(11.500, -10.522)`.
- Rack centre: approximately `(10.675, -13.192)`; side cabinet centre:
  `(14.380, -11.110)`. Both share the workstation rotation.
- Batched furniture envelope: x 9.382 to 15.683, z -15.490 to -10.148,
  y 0.02 to 4.12. This is the bounding rectangle of the turned footprint;
  its empty corner wedges remain walkable.

The workbench's separate bookshelf remains at its previous safe location.
Only its associated planter moves around the turning workspace. A reproduced
foliage/backdrop overlap was removed by moving the planter another 0.35 m
left in local coordinates. Its pot and foliage clear the workstation and roof.

Subsequent owner cleanup: both ground planters behind the main poster were
removed, including the rotated corner planter and the north-wall planter at
`(11.6, -15.3)`. Their pot/foliage geometry and collision footprints are gone.
The desktop plant, lounge planter and library-door planters remain in place.

## Shared transformation

`world/space-config.js` defines one yaw and `workbenchPoint()` conversion.
The same rigid transform applies to:

- BoxBatch furniture, the rear wall, V wing, desk, chair, rack and side cabinet;
- the mesh group containing both real poster textures, screen atlas and LEDs;
- the screen and auxiliary-housing world positions, exact image-face ray tests,
  broad-phase hotspot boxes and equipment targets;
- seat, stand and approach positions, desk-facing heading and existing desk bake.

The main GitHub target intersects its actual oriented face and still rejects
occlusion by the side display housings. Equipment front/back checks use the
rotated normal rather than global Z. Native desktop and touch tests also cover
a valid rack click whose ray points towards positive world Z.

The existing collision engine accepts axis-aligned furniture footprints.
Rotated solids are covered by tiles no larger than 0.24 m in local space,
converted to conservative axis-aligned boxes with the existing furniture
margin. This avoids a large invisible bounding box across the empty corners
of the diagonal desk. No duplicate movement or interaction system is added.
The 309 rendered workstation boxes and five supplemental meshes are unchanged.

## Verification

- All 73 Node tests passed, including rotation/facing, exact display/poster
  picking, roof clearance, collision wedges, planter clearance and library routes.
- `node tools/check-workstation.mjs http://127.0.0.1:8765/` passed at
  1440 x 950 and 390 x 844. The actual walking controller travelled from the
  chair exit to the library approach and back, in addition to the A* checks.
- `node tools/check-netrunner.mjs http://127.0.0.1:8765/` passed on desktop and
  touch: one GitHub popup, terminal, actual render stats, decorative rack boot,
  both poster previews, light modes, pinch, chair controls and view restoration.
- `node tools/check-followup.mjs http://127.0.0.1:8765/` passed: original portal
  placement, native door entry/return, Dock and mobile interactions.
- `npm run check -- http://127.0.0.1:8765/` passed. Startup reference views still
  report 71 calls, approximately 678k triangles and 16.7 ms/frame locally.
- `npm run build` passed with Git Bash on PATH, producing the local 152 MB dist.
- `git diff --check` passed.
- Final desktop/portrait screenshots from the centre, detail and side angles
  were inspected. They are under `tools/.check/netrunner/rotation-*.png`.

No poster image, central exhibit, portal, library, lounge, music or guestbook
source is changed by this rotation. No new real-time light, texture, visual
geometry or runtime dependency is introduced. The existing whole-scene
draw/triangle budget excess remains; desktop touch emulation is not a physical
phone performance measurement. This work is local and has not been deployed.

## Files in this follow-up

`world/workstation.js`, `world/space-config.js`, `world/furnish.js`,
`tools/netrunner.test.mjs`, `tools/hall-signs.test.mjs`,
`tools/check-workstation.mjs`, `tools/check-netrunner.mjs`,
`docs/project-status.md`, the earlier acceptance record's follow-up link,
and this record. Earlier uncommitted interaction/composition changes are preserved.
