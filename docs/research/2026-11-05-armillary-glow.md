# Armillary glow pass

Scoped record for the light pass over the central exhibit. The form, the three
diametral axles, the crystal geometry, the stone tiers and the floor drawing are
untouched; only emissive values, one extra decal and the brass response change.

## Why no light was added

The hall is lit by exactly two lights (`stage.js`: one hemisphere and one
directional with a baked shadow) and the renderer uses neutral tone mapping at
exposure 1.08. A point light at the plinth would have had to be a real shadow
caster to look right, which the render cost does not allow, and it would have
lifted the floor around the exhibit — the one thing the brief rules out. Every
effect here therefore rides on emissive shading, vertex colour or a texture
painted once at build time:

- the crystal's two `MeshStandardMaterial.emissive` terms,
- the plinth lanterns' `iEmissive` instance lane in the existing `BoxBatch`,
- one 1024² canvas decal on the floor,
- brass `roughness`/`metalness` plus brighter `RIM`/`BOLT` vertex colours.

`h.stats().lights` stays 0 for the exhibit and the scene keeps its two lights.

## Crystal

The shell (opacity .76, `0x2e7a70` at .44) sits over an opaque kernel
(`0x54cbbb` at 1.3). Because the shell is drawn over the kernel, the inner layer
only shows through the remaining quarter of the tint; that is why a bright
kernel and a restrained shell read as "lit from inside" while a bright shell
reads as plastic. The kernel keeps `vertexColors`, so its twelve rib highlights
survive. Edge lines were lifted from .45 to .56 opacity.

Measured with runtime overrides (`tools/.check/tune.mjs` variants): shell .52
washed the octahedron flat, a flat-coloured kernel lost the ribs, and metalness
above .4 drained the brass colour because there is no environment map to
reflect. The shipped pair is the shell/kernel split above.

## Breathing — removed after measurement

A five-second breath of ±7 % (and later ±15 %) on the two emissive intensities
was implemented and then retired. The reason is measurable: the emissive term is
only a part of what the eye reads on a lit, transparent shell, so a ±15 % swing
on the intensities moved the crystal's mean pixel luminance from 162.1 to 165.9
in a 140 x 140 crop — **2.3 %**, below the noise of a faceted, dithered surface
against a bright glass wall (`tools/.check/breath.mjs`, which reads the pixels
back from the framebuffer rather than trusting the numbers).

The intensities are now constants set at construction (`CRYSTAL_GLOW = .44`,
`KERNEL_GLOW = 1.3`) and `update()` no longer touches any material. There is no
`glow` block left in `space-config.js` to tune, and both suites assert that
nothing animates the intensities again.

## Corner lanterns

The four plinth lanterns are the same blocks as before, retuned rather than
rebuilt: the emissive pane is now `lantern.emissive = .45` on
`lantern.tint = 0xecc487`, and the pane is 172 mm wide between 160 mm brass
plates so a warm band shows on all four faces instead of only from below. They
cast no shadow, never flicker and light nothing — the shader adds their own
colour and stops there.

## Floor emblem

The inlay is a `MultiplyBlending` decal, so it can only *darken* the paving:
lightening its palette made the emblem fainter, which is the opposite of what
was wanted. The emblem therefore ships two layers — the unchanged multiplied
inlay for definition, plus `hall-emblem-shine`, an additive decal at opacity
.18 that strokes only the principal rings, the four instrument axes, the eight
ordinal ticks and the twelve major dial marks. Neither writes depth, and the
second sits 1 mm higher, so nothing z-fights. It is static: no sweep, no
rotation, no run of light along the wire. Cost: one draw call, two triangles,
one texture.

## Brass

`roughness .42`, `metalness .36` on the shared frame material, with `RIM`
`0xf2ddaf` and `BOLT` `0xf0dbb2`. Lower metalness keeps the diffuse colour,
which is what actually reads without an environment map, while the brighter rim
and bolt vertex colours give the machined edges their highlight.

## Measurements

| Item | Before | After |
| --- | --- | --- |
| Instrument triangles | 11,888 | 11,888 |
| Instrument draw calls | 7 | 7 |
| Floor emblem draw calls | 1 | 2 |
| Scene calls (front / entrance) | 41 / 57 | 42 / 58 |
| Scene triangles (front / entrance) | 663,056 / 663,180 | 663,058 / 663,182 |
| Textures / geometries | 24 / 67 | 25 / 68 |
| Realtime lights | 2 | 2 |

## Validation

- `npm run check:site` — pass, three pre-existing informational warnings.
- `node --test tools/*.test.mjs` — 59 pass (two new tests: the steady crystal
  glow and the lantern/emblem lane).
- `node tools/check-armillary.mjs` — desktop 1440x950 and narrow 390x844; the
  runtime now also confirms the glow holds steady, counts the two emissive
  meshes in the exhibit and checks the additive floor layer.
- `node tools/check-all.mjs http://127.0.0.1:8765/` — all standalone checks pass.
- `npm run build` — 152 MB into `dist/`.
- Screenshots at the standing distances (`tools/.check/shots/g5-*`,
  `tools/.check/measure/g6-*`, `tools/.check/armillary-a/`): the crystal separates
  from the glass wall, the corner panes read warm without spilling light, and
  the emblem's catch-light only shows on the principal rings.
