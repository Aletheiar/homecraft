# Central armillary replacement

Implemented locally on 2026-11-04, Asia/Shanghai. The owner requested replacing
only the small central glass pyramid with a restrained scientific instrument.
The starting workspace already contained uncommitted hall and statue changes;
scope comparisons use snapshots taken at the beginning of this task, not HEAD.

## Placement and appearance

The old ConeGeometry was centered at world `(0,1.16,0)`, above a low stone
plinth at hall center `(X=0,Z=0)`. It is removed, not hidden or retained beside
the new instrument. The existing plinth geometry and height support are reused
without modification: 1.9 m body, 2.02 m cap and top at Y=.37.

The new Group keeps the `hall-exhibit` name and is anchored at `(0,.37,0)`.
The ring and crystal center is `(0,1.54,0)`. The instrument has an outer sweep
of approximately 1.83 m, fits the 2.02 m stone cap, and reaches Y=2.4525.
Its height above the cap is approximately 2.08 m. The core is .54 m tall.

Three tilted TorusGeometry rings use radii .88, .81 and .74 m. Their tubes
have real thickness, approximately 3.0–3.6 cm across. Twenty-four restrained
marks sit on the outer meridian; the circular foot and short tapered stem
connect it to the stone. Rings, marks and mount share one merged, vertex-colored
geometry and a matte bronze MeshStandardMaterial (roughness .74, metalness .32).

The centered OctahedronGeometry core is pale cyan, transparent at opacity .66,
with roughness .18 and weak material emission. It adds no real-time light,
particle, bloom, texture or interaction.

## Animation and runtime state

The complete metal assembly rotates around Y at .008 radians/second
(approximately 13.1 minutes per revolution); the core turns at .012
radians/second (approximately 8.7 minutes). The circular foot/stem are
rotationally symmetric, so they retain their appearance. The stone is fixed.
Updates change only Euler components and allocate no per-frame objects.

`world/build.js` exports `hall.exhibit` through `named.exhibit` and invokes its
update callback. This is necessary for the new instrument: the old exhibit
state was left at the build result's top level and never reached the runtime
world, silently disabling its intended bobbing. Actual runtime rotation is
checked, not inferred from the existence of an update function.

The moving meshes do not cast shadows. They can receive the existing light,
without requiring an animated shadow-map update or leaving stale cached
shadows. No renderer or engine code is changed.

## Scope and navigation

Only the central construction, its configuration and state/update hookup
change. The existing stone base, floor pattern, floorAt support, portal data,
workbench, lounge and every other furnishing remain identical to the task
baseline. The new instrument adds no obstacle or hotspot. The low .37 m step
and the surrounding routes remain usable; the geometry is decorative rather
than a new collision column.

The western entrance has clear rays to the lower edge of the reading-room
sign. Existing routes to all three portals remain reachable. No other object
was added to any part of the hall or exterior.

The instrument uses two draws and 3,912 triangles. Relative to the old single
8-triangle cone, the increment is one draw and 3,904 triangles, with no new
texture. The inspected common frame has 60 draws and roughly 664k triangles;
the preexisting 200k triangle-budget violation remains unresolved.

## Validation

- All 53 existing Node tests passed, with the old central-pyramid case replaced
  by armillary acceptance in `tools/hall-signs.test.mjs`.
- `node tools/check-armillary.mjs http://127.0.0.1:8765/` passed desktop and
  390px checks: old cone absent, three solid rings, core, real animation via
  production updates, bounds, zero new lights/overlapping obstacles, routes,
  center crossing and rays to the reading-room label.
- `npm run check -- http://127.0.0.1:8765/` and `node
  tools/check-followup.mjs http://127.0.0.1:8765/` passed.
- `D:\Git\bin\bash.exe tools/build.sh` passed without deployment.
- Source/resource hashes for 123 protected files matched the starting state;
  the non-central furnishing block and complete portal definitions also
  matched. Independent code review found no actionable issue.

The dedicated runtime check is included in `check-all.mjs`. Screenshots and
reports are in ignored `tools/.check/armillary/`. The work is local; no push or
deployment was performed. Real-phone performance is not established by a
narrow desktop-browser viewport.
