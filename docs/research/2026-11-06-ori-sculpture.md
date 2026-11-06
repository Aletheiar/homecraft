# Ori spirit sculpture

The south-east lounge is replaced with an Ori fan-art sculpture. The imported
character stands on a curved, tapered branch above a single shallow limestone
plinth. An open blue arc and 12 circular motes provide restrained light accents.
The centre armillary, north-east workstation and all three portals retain their
positions and controls. No GRIS geometry was present or reused.

## Model selection and attribution

**Ori from the game "Ori and the Blind Forest"**, by
[vincentskc](https://sketchfab.com/vincentskc), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
[Original model](https://sketchfab.com/3d-models/ori-from-the-game-ori-and-the-blind-forest-9154a505ba8143cba354d04ac9f7ac29).

The GLB was obtained from the public
[Objaverse archive](https://huggingface.co/datasets/allenai/objaverse).
Its embedded author, license, and source match the current Sketchfab API.
The shipped file remains unmodified; its SHA-256, retrieval URL, current
license check, and rejected alternatives are in
`assets/models/ori-provenance.json`. Public attribution and runtime modifications
are also disclosed in the exhibit information card. The display theme is
*Ori and the Will of the Wisps*; the mesh author's original title references
*Ori and the Blind Forest*. It is not presented as an official Ori2 asset.

The requested rogeriofsalves1 model was checked first. It is marked downloadable
and CC BY 4.0, with source OBJ and converted glTF/GLB archives, but its official
download endpoint requires authentication (HTTP 401). It was not available in
the inspected Objaverse index. The Cults3D listing returned HTTP 403, preventing
verification of its specific license and download. Neither resource was imported.
An alternate model by Kristian LaGrange was previewed but rejected because of
its T pose and substantially higher triangle count. No account credentials,
viewer extraction, purchases, or downloaded reference images are bundled.

## Implementation

- `world/ori-sculpture.js`: independent support geometry, local GLB loader,
  normalisation that preserves the authored glTF root transform, restrained
  emissive material animation, open arc, motes, and local proximity button.
- `world/space-config.js`: anchor `(13, 12.5)`, front facing the hall centre,
  1.68 m character, 1.18 m foot height, and approach `(10.95, 10.45)`.
- `world/build.js`: geometry, hotspot, navigation obstacle and update registration.
- `world/layout.js`: station used by the existing picking/card system.
- `index.html`: short user-supplied description, game title, collection category,
  author attribution, original model title, and license link.
- `assets/ori-sculpture.css`: card sizing and a touch-friendly local prompt.
  The generic keyboard interaction setting remains disabled.
- `world/furnish.js`: removes the former south-east benches, table, planter,
  and their collision footprints. Library furniture remains.

The total geometry envelope is approximately 2.0 by 2.0 m in world axes and
2.97 m high, excluding soft point-sprite radii. The padded collision footprint
is 2.24 by 2.24 m. Each imported vertex is checked against the sloping glass,
including the 0.6 m membrane clearance. The base sits at paving height.

The local GLB is 243,748 bytes (122,778 bytes with gzip level 9), contains
9,496 rendered triangles, and needs three mesh draws. The complete exhibit is
11,816 triangles and seven draws: stone, merged wood, arc, one points batch,
and three model parts. There are no new real-time lights, shadow casters,
post-processing passes, refraction, animation mixers, or external asset requests.
Repeated `load()` calls reuse one promise. The update loop reuses its arrays,
vectors, frustum and matrix. Motion pauses outside the camera view, at distance,
while a card is open, while the document is hidden, and under reduced motion.

## Verification

Run with the preview server available:

```sh
node --test tools/*.test.mjs
npm run check -- http://127.0.0.1:8765/
node tools/check-ori.mjs http://127.0.0.1:8765/
node tools/check-netrunner.mjs http://127.0.0.1:8765/
node tools/check-armillary.mjs http://127.0.0.1:8765/
node tools/check-spaces.mjs http://127.0.0.1:8765/
```

`check-ori.mjs` checks the actual imported model, all support/model vertices
against the roof, navigation to every portal/workstation and the new approach,
walking around the display, release of old furniture colliders, conflicts,
one-time model loading, real desktop/touch canvas selection, proximity button,
card text and attribution, close-button/Escape/backdrop closure, repeated
open/close cycles, viewport fit (including 568 by 320 landscape, with scrollable
attribution), reduced motion and browser errors.
It saves screenshots and a JSON report under `tools/.check/ori/` and is included
in `check:all`. The standalone unit checks cover support placement, roof
clearance, open arc, particle count, paused motion and support geometry cost.

Recorded local results on 2026-11-06: 75/75 unit checks passed; `npm run check`,
`check-ori`, `check-netrunner`, `check-armillary`, and `check-spaces` exited with
status 0. The Ori browser acceptance passed at 1440 by 1000, 390 by 844, and
568 by 320 with no browser errors. Screenshots were inspected. Independent code
review identified compact-landscape card clipping; after adding viewport/safe-area
height limits and a scrolling body, the failing regression passed. Independent
reverification also checked 667 by 375, 740 by 360, and 320 by 568 without clipping.

The baseline view before the change was 667,734 triangles. The same sampled
view after integration was about 679,300 triangles, an increase of approximately
11,600 after removal of the lounge furniture. The existing imported building
and scenery already exceed the repository's 200,000-triangle budget. This task
does not resolve that existing whole-world limitation. Measured desktop and
emulated-phone frame timings are local results, not evidence of real-phone
performance. Local implementation only; no commit, push or deployment.
