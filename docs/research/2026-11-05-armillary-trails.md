# Armillary travelling light

Two lights run along the driven brass bands of the central armillary: a pale
cyan one on the outer meridian and a warmer, slower one on the middle band. They
change nothing about the instrument's form, bearings, base or the rest of the
hall.

## Why the first two attempts were wrong

The first version baked a fixed comet arc into the band: a ribbon of geometry
faded from bright head to transparent tail, parented to the turning group. It
looked static because it *was* static — the only motion it had was the band's own
rotation, so the arc travelled around the instrument at exactly the speed of the
metal it was welded to. A viewer reads that as "a lit patch of brass", not as
light moving along a track.

A second version turned the ribbon into a tube so it kept its width when the ring
plane went edge-on (a flat ribbon collapses to a hairline there: the measured
screen box fell from 314 x 94 px to 382 x 26 px). That fixed the shape and still
did nothing about the motion.

Both shared the same defect: the *pattern* was geometry, so its shape, its
brightness and its position were welded to the band.

## What it is now

Each light is one full-circumference tube drawn with a small shader. The
fragment shader knows its own angle around the ring from the torus UV, and the
head angle arrives as a uniform, so the lit stretch is recomputed every frame
while the geometry never changes.

```
theta = vUv.x * TAU                       // angle around the band
back  = mod(uHead - theta + TAU, TAU)     // how far behind the head, seam-safe
fade  = pow(clamp(1 - back / uSpan), uPower)
head  = smoothstep(uSpan * .22, 0, back)  // a short hotter tip
alpha = fade * (.42 + .58 * head) * edge * uGain
```

`mod()` closes the 0/360 seam, so there is no jump when the head laps the ring.
`uPower` above 1 thins the tail out rather than fading it linearly, and the head
mixes 45% toward white while the tail keeps the band's colour, so the head reads
as brighter rather than merely bigger.

| Light | Parent group | Lap time | Lit stretch | Colour | Tube |
| --- | --- | --- | --- | --- | --- |
| `armillary-trail-outer` | `armillary-spin-outer` | 4 s | 55° | pale cyan `0x9ff0e4` | 26 mm |
| `armillary-trail-middle` | `armillary-gimbal` | 7 s | 44° | warm gold `0xffd08a` | 19 mm |

The two clocks are independent by construction: `spin` turns the brass, and each
light reads `elapsed / trails.<band>.period`. Holding the mechanical turn still
leaves the light lapping the band — measured 1.5708 rad advance against a rotation
that never moved — which is the test that distinguishes a travelling light from a
lit decoration.

The geometry is a `TorusGeometry(rim + 28 mm, 26 mm, 5, 128)` per light, so the
light always sits on the track and can never drift off it: the lit part simply
sweeps around the rim it belongs to. Nothing is rebuilt per frame; `update()`
writes exactly two floats.

## Occlusion and blending

Additive, `depthWrite: false`, `depthTest: true`, `forceSinglePass: true`,
`renderOrder: 2`. Depth testing means the far half of the tube hides behind the
brass, which is what makes the light read as sitting *on* the ring rather than
floating in front of it. Writing no depth keeps it from punching holes in the
crystal or the brass.

## Cost

Measured with `tools/.check/lightperf.mjs` at 1440 x 950, 90 timed renders per
state, same camera and the same pixels:

| State | Draw calls | Triangles | Mean frame | P95 |
| --- | --- | --- | --- | --- |
| Lights on | 47 | 667,386 | 8.76 ms | 12.10 ms |
| Lights off | 45 | 664,826 | 9.31 ms | 11.90 ms |
| Lights on again | 47 | 667,386 | 10.36 ms | 13.70 ms |

Two draw calls and 2,560 triangles. The frame-time difference is inside the
run-to-run spread (the third run, identical to the first, was 1.6 ms slower than
the second), so there is no measurable regression at this resolution.

## Validation

`node --test tools/*.test.mjs` covers the shader material, the full-lap torus, the
child relationship, the two independent clocks and the frozen-ring case.
`node tools/check-armillary.mjs` re-checks the same facts in the browser, samples
16 half-second steps for seam jumps, and confirms the light outruns its band.
