# Central armillary: a motion pass with real axles

Status: implemented in the working tree on branch `codex/armillary-museum-upgrade`,
on top of the committed precision pass (`1d750e8`). Local only.

## Why the old motion was invisible

Only two objects ever moved. The middle band rocked ±2° on a Z-axis gimbal with
a 1047 s period, and the crystal turned once in 1571 s (0.23°/s). Everything
else — the outer meridian band, the near-horizontal band, the fork, the
bed-plate — was welded into one static mesh. At walking pace a visitor could
not see any of it.

## The axle has to lie in the band's own plane

A circular band is unchanged as a set by a rotation about its **normal**: the
graduations simply map onto themselves, which is why a "spin" of that kind is
invisible. A rotation about any axis **lying in the band's plane** — a diameter
through two rim points — tips the plane instead, so the band tumbles like a
coin. That is the only honest way for a hoop to show attitude change, and it
also puts the bearings on two rim points, which leaves the floating crystal a
clear sphere. Angling a band on the shared Z axle would have needed a hub
through the crystal, which both the brief and the acceptance check rule out.

## What turns, on what

| Part | Mesh | Axle | Period |
| --- | --- | --- | --- |
| outer main band | `armillary-ring-outer` in `armillary-spin-outer` | world Z, world-fixed bearings | 20 s |
| middle band | `armillary-ring-middle` in `armillary-gimbal` | Y, carried by the outer band | 40 s |
| inner band | `armillary-ring-inner` in `armillary-spin-inner` | X, carried by the middle band | 60 s |
| crystal | `armillary-core` | Y | 10 s |

The gimbal nests inside the outer spin, and the inner spin inside the gimbal, so
each axis is dragged through space by its parent and the compound motion cannot
repeat in as little as one period. The rest pose is the three mutually
orthogonal hoops of a classical armillary. `armillary-base` holds the
bed-plate, pier, fork and the outer band's trunnions; it never moves.

Periods live in `world/space-config.js` as
`spin: { outer: 20, middle: 40, inner: 60, core: 10 }`. `update(dt)` accumulates
one clock and writes each angle as `(t * tau / period) % tau`, so the motion is
delta-time driven, wraps instead of drifting, and rebuilds no geometry.

## Bearings without piercing a band

Each band is pinned at two rim points; the width of a band is radial, so the
pinned point is on the band's own centreline. A collar box straddles the child
band at that point and its centre is also the parent's rim, so one collar grips
both rims where they meet, and a short stub reaches from the child's rim into
the parent's band. Both stubs stop at the child band's outer edge and start
inside the parent band, so no stub passes through a hoop it does not belong to.
The four-arm fork now carries the outer axle for real, which is what its
trunnion flange and nut were drawn for. The cheek plate that used to be bolted
to the outer band's face was deleted: that band rotates through its bearing and
would have swept the plate.

Graduations are engraved on **both** faces now, since a tumbling band shows
either side; rivets stay on the raised border, so the silhouette is unchanged.

## Clearance

Every band turns about a diametral axle, so it moves inside a fixed radial
shell around the instrument centre: outer 1.183–1.281 m, middle 1.087–1.181 m,
inner 0.992–1.080 m (band half-widths plus the 10 mm clamp overhang). The
shells are disjoint, so no two hoops can meet at any pose, and the crystal
(radius 0.3375 m) is far inside the innermost. The fork arms sit 12 mm outside
the outer shell. The acceptance check recomputes the shells from config and
probes the crystal volume at six directions across a 120 s cycle (the least
common multiple of 20/40/60 s), and the run below shows no hits.

## One trade-off

The sight line from the west entrance to the reading-room sign is high and far,
and it passes through the volume a tumbling 1.23 m band must occupy. The fixed
mounting never crosses it, but the turning bands do at some phases: sampled
every 5 s over 120 s, the three targets stay clear in 12, 18 and 24 of 24
phases. The label therefore stays readable for at least half of the cycle, and
the acceptance check asserts exactly that instead of the old "never crosses"
rule, which only held while the bands never moved.

## Measurements

Instrument geometry and scene cost, `tools/.check/measure.mjs` at the same four
viewpoints as the previous pass:

| | before this pass | after |
| --- | --- | --- |
| instrument triangles | 10,288 | 11,888 |
| instrument draw calls | 5 | 7 |
| scene calls, front/detail | 39 | 41 |
| scene calls, entrance/hall | 55 | 57 |
| scene triangles, front/detail | 661,456 | 663,056 |
| scene triangles, entrance/hall | 661,580 | 663,180 |

The growth is the two extra band meshes that the motion needs, the second
engraved face and the four collars. Frame time reads 20–21 ms here against
16.4 ms before, but the software renderer varies by several ms between runs and
this pass was measured while another browser check was running; it is not a
regression claim.

## Validation

- `npm run check:site` — passed (the three known informational warnings).
- `node --test tools/*.test.mjs` — 57 tests passed, including a new one that
  asserts all four periods, the nested axles, a still mounting, one axis per
  joint and delta-time stepping.
- `node tools/check-armillary.mjs` — passed at 1440×950 and 390×844: periods,
  support rest, nesting, 24-step cycle, crystal clearance, shell disjointness,
  navigation and screenshots.
- `node tools/check-all.mjs http://127.0.0.1:8765/` — every standalone check
  passed.
- `npm run build` — passed.
- Screenshots inspected at eight 2.5 s phases and at the bearing nodes; no
  visible clipping between bands, fork or crystal.
