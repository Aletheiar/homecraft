# Central armillary, precision pass

Second visual pass on the same uncommitted branch (`codex/armillary-museum-upgrade`),
following [plan A](2026-11-04-armillary-plan-a.md). The owner asked for a
museum-grade instrument: legible graduations, machined bands, a crystal that
survives the glazed background, and a support that reads as a mechanism. No
portal, station, workstation, lounge, sign, shell, exterior, music, guestbook,
player or minimap code changed, and nothing was enlarged.

## Bands

Each band is now one swept closed profile instead of a bevelled annulus
extrusion: a polished outer radial rim, raised lips on both faces, and a
recessed dial field between them. The twelve profile edges keep their own
vertex colour, so the strip reads as machined brass with a bright border, a
darker field and a chamfered silhouette from one merged mesh.

- 48 / 32 / 32 graduations per band in three grades (minor 6.2 mm wide up to a
  90-degree major mark 16.6 mm wide and 58 mm long), kept as merged boxes in
  the same geometry rather than one mesh per degree.
- A 10.8 mm rivet head on the raised border at every 45-degree mark, so the
  border reads as riveted and the silhouette stays straight.
- The graduated face is chosen per ring: the west face for the two standing
  bands (the entrance view) and the upper face for the near-horizontal band,
  whose dial previously pointed at the floor.
- The four clamped segment joints per band are unchanged, and no fourth ring
  was added.

## Crystal

The octahedron and its pale cyan palette stay. Opacity moves 0.64 to 0.80 and
the two face shades deepen to `0x86d5c7`/`0x55a89c`, which separates the gem
from the pale glass hall. Inside it now sit a smaller opaque octahedron at
0.56 of the radius (its own emissive, so it reads as a brighter kernel) and
twelve metal edge ribs; a LineSegments outline of both shells keeps the
geometry crisp without bloom, particles or extra lights.

## Support

- A circular brass bed-plate (0.912 m across) with a bolted swept rim ring and
  eight hex bolts replaces the flat square inlay, and the turned drum and
  baluster pier now top out at 0.308 m, 21 mm under the meridian rim.
- Four fork arms leave the pier capital and curve up to the pole flanges. Each
  stays 30-60 mm outside the meridian rim and only enters the flange where it
  bolts in, so the fork clamps the fixed meridian instead of passing through it.
- Each pole keeps the Z-axis axle, gap collar, bearing flange, axle nut and
  bolted cheek plate. The moving band still pivots on that axle by
  `0.035 * sin(t * 0.006)` radians (about +/-2 degrees), and the crystal
  self-rotates at 0.004 rad/s; both are transform-only updates.

## Stone and floor

Two stone tiers, the pale cap and the brass side trim are unchanged. The
emblem keeps its multiply-blended 1024 px canvas and one draw call; only its
drawing changed: a darker low-saturation palette, a nine-percent outer
construction ring, and a 72-tick five-degree dial (longer every thirty) between
the 2.5 m and 2.72 m rings. The four cardinal axes now run from the plinth edge
at 1.40 m into the dial at 2.52 m, so the platform sits inside the same
setting-out as the brass above it. No new geometry, glow line, magic circle or
z-fighting layer was added.

## Measurements

Measured with an ad-hoc Playwright dump of the `hall-exhibit` subtree and
`__home.stats()` from four showcase views (front, entrance, detail, hall):

| | Before | After |
| --- | --- | --- |
| Instrument mesh triangles | 7,392 | 10,288 |
| Fixed frame | 5,336 | 7,928 |
| Moving band | 2,048 | 2,152 |
| Crystal (+inner, +outline) | 8 + 8 | 8 + 200 + 16 |
| Instrument draw calls | 4 | 5 |
| Scene calls, close views | 38 | 39 |
| Scene calls, entrance/hall | 54 | 55 |
| Scene triangles, close views | 658,560 | 661,456 |
| Scene triangles, entrance | 658,684 | 661,580 |
| Frame time, software GPU | 16.3 ms | 16.4 ms |

The assembly gains 2,896 triangles (+39%) and one draw call, both inside the
central exhibit; geometry and materials are still built once and the frame
only changes two transforms. The extra call is the inner crystal kernel, which
needs its own material.

## Validation

```powershell
npm run check:site
node --test tools/*.test.mjs
node tools/check-all.mjs http://127.0.0.1:8765/
node tools/check-armillary.mjs
```

- 56 Node tests pass, including the band, crystal, edge, opacity and
  frame-stays-fixed hall assertions.
- `check-all` passes every standalone site check (startup, hall, rooms,
  portals, movement, entry descent, music, guestbook, decor, forecourt,
  workstation and armillary) against the local preview.
- The armillary acceptance run passes at 1440x950 and 390x844: ring count,
  compact bounds under the 2.75 m plinth, empty crystal volume, clear
  reading-room sight lines, no obstacle overlap, walkable routes across the
  plinth and unchanged portal positions.
- Screenshots were inspected at the normal viewing distance from the entrance,
  from a walking approach, from the south and from above, plus close-ups of the
  base, the pole bearing and the crystal. The graduation hierarchy reads at
  play distance, the rivets sit on the border, and the fork meets the flange.
- No unresolved issue was found. The pre-existing budget overrun (scene
  triangles and, at some views, draw calls) is unchanged by this pass; the
  instrument itself adds 39% triangles and one call.
