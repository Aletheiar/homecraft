# Central armillary, plan A

Implemented locally on `codex/armillary-museum-upgrade`. The owner requested
an enlarged museum-style instrument and step-by-step status updates. The
working status note is in the parent workspace at
`deepseek/2026-11-04-天体仪方案A升级状态.md`; it was updated after each step.

## Scope and dimensions

Only the central exhibit, two stone tiers, local supporting floor heights
and the inlay inside radius 2.5 m change. No portal, station, workstation,
lounge, shelf, planter, hanging artwork, shell, exterior, music, guestbook,
player input or minimap implementation changes.

| Component | Previous | Plan A |
| --- | --- | --- |
| Plan centre | X/Z = 0/0 | X/Z = 0/0 |
| Instrument anchor | `(0, 0.37, 0)` | `(0, 0.445, 0)` |
| Crystal centre | `(0, 1.54, 0)` | `(0, 2.045, 0)` |
| Ring centre-line radii | 0.88 / 0.81 / 0.74 m | 1.232 / 1.134 / 1.036 m (+40%) |
| Outer ring section depth | 0.036 m | 0.054 m (+50%) |
| Outer ring face width | circular wire | 0.078 m band, with small bevels |
| Octahedron radius | 0.27 m | 0.3375 m (+25%) |
| Mechanical assembly span | about 1.83 m | up to 2.559 m |
| Highest point above ground | about 2.45 m | 3.320 m |
| Lower stone tier | 1.9 m square | 2.75 m square, top 0.19 m |
| Upper stone tier/cap | 2.02 m cap | 2.15 m body / 2.23 m cap, top 0.445 m |

## Geometry and motion

Three beveled annular ExtrudeGeometry bands replace the narrow torus wires.
Their planes are vertical, initially 45 degrees to horizontal, and 10 degrees
to horizontal. Sparse engraved ticks and low-poly rivet heads decorate their
faces. The rough brass/champagne palette stays restrained under existing light.

A circular fixing plate, tapered shaft, short lower fork and two nested
pairs of Z-axis rim bearings support the assembly. No shaft crosses the
crystal. Fixed bands and support share one vertex-colored mesh/material.
The separate middle gimbal rotates about the same Z bearing axis by a bounded
`0.035 * sin(t * 0.006)` radians (about +/-2 degrees, 17.45-minute period).
The fixed support stays stationary. The octahedron self-rotates at 0.004 rad/s
(about 26.18 minutes per turn). Geometry is built once; frame updates change
only transforms. The moving band casts no cached shadow; the fixed frame does.

The enlarged crystal uses a transparent flat-shaded pale cyan material with
low emissive intensity. A child LineSegments mesh gives its edges definition
and follows its rotation. There are no new point lights, particles or bloom.

## Stone tiers and local floor

The broad lower stone slab and smaller upper slab are separated by a narrow
reveal, capped in pale stone and trimmed with thin brass. Four small corner
lanterns use emissive faces, not additional real-time/baked lights. Their
brightness does not change the hall lighting.

The local `floorAt` returns 0.19 m on the lower tier and 0.445 m on the upper
cap; it does not change the player implementation or create an infinite
obstacle column. Both step heights remain within ordinary walking capability.

The existing central CanvasTexture retains all drawing outside radius 2.5 m.
Its former small triangle is replaced by a main 2.5 m ring, a thin 2.24 m ring,
32 short radial ticks and four short cardinal divisions. The existing
multiply/depth-write settings avoid a floating decal or z-fighting. There is
no new ground texture, draw call, glow animation or collider.

## Validation

The enlarged geometry and two-tier floor tests failed against the old model
before implementation. Final commands and results:

```powershell
node --test (Get-ChildItem tools -Filter '*.test.mjs' | ForEach-Object {$_.FullName})
node tools/check-armillary.mjs
node tools/check-workstation.mjs
npm run check -- http://127.0.0.1:8765/
node tools/check-followup.mjs http://127.0.0.1:8765/
node tools/check-spaces.mjs http://127.0.0.1:8765/
D:/Git/bin/bash.exe tools/build.sh
git diff --check
```

- 56 Node tests pass. Startup/Dock, hall, room, workstation and armillary checks
  pass at their desktop/narrow or touch viewports. Local build succeeds.
- Runtime checks sample a complete gimbal period: fixed frame, bounded angle,
  empty crystal volume, no furniture overlap and clear library-label rays.
  Ray tests count actual meshes rather than the one-metre default line-picking
  threshold used by Three.js for the thin crystal outline.
- Actual player movement crosses both tiers, reaches the cap and returns to
  ground. Around-exhibit points and paths from the entrance to all doors pass.
- Desktop and 390px screenshots were inspected. Independent read-only review
  found no actionable issue and reran the 11 hall tests successfully.
- Repeating `check-armillary.mjs` with `HOMECRAFT_SOFTWARE_GPU=1` also passes
  the complete desktop/narrow instrument acceptance.
- Of 133 source/asset hashes at task start, 128 remain identical. Only
  `world/armillary.js`, `world/furnish.js`, `world/hall-floor.js`,
  `world/layout.js` and `world/space-config.js` change. Non-central furniture
  code and complete portal definitions match the starting snapshots.

The instrument contains 7,392 triangles. Including the stone/lantern additions,
the scene gains approximately 3,876 triangles and two draw calls. The startup
reference views report 62 calls, about 669k triangles, 24 textures and 16.7 ms
per frame locally. This exceeds the 60-call and pre-existing 200k-triangle
targets. No physical-phone performance claim is made. The full `check:all`
suite was not rerun for this new visual revision; the targeted checks above
were run. No unresolved functional issue was found in this scope.

This new visual revision is local and uncommitted. Separate fixes to older
CI timing tests were committed/pushed independently; their remote acceptance
does not certify this uncommitted plan A model.
