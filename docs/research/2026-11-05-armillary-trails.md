# Armillary comet trails

Two short arcs of light ride the driven brass bands of the central armillary.
They were added after the motion and glow passes, and they change nothing about
the instrument's form, bearings, base or the rest of the hall.

## What the arcs are

Each arc is one ribbon of geometry, baked once at build time and parented to the
band that drives it:

| Arc | Parent group | Rim radius | Angular span | Colour |
| --- | --- | --- | --- | --- |
| `armillary-trail-outer` | `armillary-spin-outer` | 1.232 m band, 20 s period | 58° | pale cyan `0x9ff0e4` |
| `armillary-trail-middle` | `armillary-gimbal` | 1.134 m band, 40 s period | 38° | warm gold `0xffd08a` |

Because a trail is a child of the axle group that already turns, the arc travels
with its band without a single line of animation code. There is no second
axis, no shader uniform, no per-frame matrix work — the group rotation that was
already there carries it.

The fixed inner band and the mounting get no trail at all, so nothing glows
where nothing moves.

## Shape

`trail()` in `world/armillary.js` sweeps a five-row profile around the band:

- rows sit at `gap + width * t` outside the band's outer rim, with `gap = .042 m`
  so the arc floats clear of the metal instead of reading as a specular streak
  on it;
- the profile is `[[0,.04],[.3,.34],[.5,1],[.7,.34],[1,.04]]`, a bright core
  with two soft shoulders, so the edges dissolve instead of ending on a hard
  line;
- the vertex colour attribute is `Float32` with **item size 4**: RGB carries the
  tint scaled by that arc's strength, alpha carries `u^2.4`, so the head is
  bright and the tail fades to nothing and the arc reads as a direction of
  travel;
- 30 segments, four quads each: **240 triangles per arc**, two arcs, two draw
  calls.

The material is shared between both arcs: `MeshBasicMaterial` with
`vertexColors`, `transparent`, `AdditiveBlending`, `depthWrite: false`,
`toneMapped: false`, `side: DoubleSide` and `forceSinglePass: true`. Additive
blending is what makes it light rather than paint; `depthWrite: false` means it
can never occlude the crystal or leave a stencil behind; depth *testing* stays
on, so a band passing in front still hides the arc behind it — which is what
keeps the trail attached to the metal rather than floating through it.
`forceSinglePass` exists because three otherwise draws a two-sided transparent
material twice, once per face; the ribbon is flat and additive, so one pass is
both correct and half the cost.

`renderOrder = 2` puts the arcs after the crystal and the other transparents, so
the glow always lands on top of what it passes in front of.

## Why the period is 20 s, not 45 s

The request described the outer ring as a 45-second loop. The instrument's
config is `spin: { outer: 20, middle: 40, inner: 60, core: 10 }` — the 20/40/60
second set chosen for the earlier motion pass. The trail is driven by whatever
`spin.outer` holds, so it currently completes a lap every 20 seconds. Changing
`spin.outer` in `world/space-config.js` retimes the band and its trail together;
the mismatch is recorded here rather than silently edited.

## Cost, measured

`tools/.check/trail.mjs` renders the same camera, resolution (1440×950),
animation pose and scene with the arcs visible and hidden, and reads the live
render loop both ways:

| | Trails on | Trails off |
| --- | --- | --- |
| FPS (rAF mean, 180 frames) | 60.0 | 60.0 |
| Mean frame time | 16.66 ms | 16.66 ms |
| P95 frame time | 18.5 ms | 18.8 ms |
| Draw calls per frame | 88 | 84 |
| Triangles per frame | 1,327,076 | 1,326,116 |

The instrument's scene is rendered twice per frame (the entrance portals mirror
the hall), so two extra draw calls per pass read as four per frame; the
armillary itself gains **2 draw calls and 480 triangles**. The frame-time
difference is inside the noise floor: at 60 fps both states are vsync-bound.

The arcs are not just technically present. Differencing two screenshots of the
identical frozen pose shows **24,969 pixels (1.83%) changing by more than 8
levels, peaking at 225**, i.e. a clearly visible effect at normal viewing
distance, and still only a small share of the frame.

## Validation

- `node --test tools/*.test.mjs` — 15 hall tests (one new: the arcs ride their
  own band, share one material, span the configured degrees, sit outside the rim,
  fade head to tail, and are never rebuilt while the rings turn).
- `node tools/check-armillary.mjs` — asserts both arcs exist, hang off the right
  groups, are 240 triangles, additive without depth writes, sit just outside the
  rim in their band's plane, and swing with the band when its axle is turned.
- `npm run check:site`, `npm run check:all`, `npm run build` — unchanged.
