# Courtyard monument and gallery update

Checked on 2026-11-04, Asia/Shanghai. This describes the local working revision.

## Devil Room monument

The owner requested the room statue from The Binding of Isaac, opposite the
existing Angel Room prop. The [Devil Room in-game screenshot](https://playerassist.com/wp-content/uploads/2021/09/xkx037ri7tuz.jpg)
was retrieved and visually inspected. It shows an upright horned goat face,
dark slanted eyes, a pointed muzzle/jaw, folded bat wings and asymmetric hands.
The new code-native monument interprets these features using stepped boxes;
it is a fan adaptation rather than an imported official mesh.

`world/devil-statue.js` defines the geometry, colors and measured runtime cut.
The new monument is at `(-62.6, 19.2)`, east-facing, opposite the existing angel
at `(-62.6, -19.2)`. Its 254 boxes add 3,048 triangles and reach 11.46 m; the
angel remains 292 boxes / 3,504 triangles / 11.4 m. Both share one opaque batch,
the same six-metre base and the same 4.8 m statue foot height. No lights or
walkable obstacles were added outside the fence.

The original horse belongs to the imported scenery. Its measured vertices lie
within x `[-66.2,-59]`, z `[16.2,21.8]`, y up to `11.4`. At runtime a slightly
larger box removes only triangles with all three vertices inside the measured
monument volume. The actual source mesh uses identity node transforms and one
indexed primitive per mesh. Removal excludes 3,035 source triangles; distant
architecture and spanning floor triangles remain. The source GLB bytes are
unchanged.

## Gallery pair

The owner chose the Defect from Slay the Spire 2 for the left panel and the
Watcher from the first game for the right panel. Visual design references were
inspected: [Defect image](https://slaythespire-2.com/imgs/characters/defect.png)
and [Watcher image](https://sxhodsrixg8meuri.public.blob.vercel-storage.com/fandom-lore/characters/slay-the-spire/the-watcher-2523805a35a2.jpg).
These are third-party-hosted visual references, not a claim of official image
provenance. Mega Crit's [FAQ](https://www.megacrit.com/faq/) was also checked
for the sequel's character context.

The built-in image generator produced two new fan illustrations, using the
existing Miku painting as a palette/composition reference. Final workspace
assets are `assets/gallery/defect-glass.webp` (32,582 bytes) and
`assets/gallery/watcher-glass.webp` (34,800 bytes), both 512 x 640. The original
Miku image remains unchanged. Side panels remain 1.7 x 2.12 m at z=-6 and z=6;
the central 3.2 x 4.8 m panel remains dominant. Frames and hanging cables stay
in place, and the new side panels remain noninteractive decoration.

## Validation

- New geometry/removal tests failed before implementation and now pass.
- Six angel/devil geometry tests pass; the pair stays below 10,000 triangles.
- `check-decor.mjs` verifies the removed source horse, matching positions,
  all three real image textures, left/right order and central emphasis at
  desktop/mobile viewports. Screenshots were inspected in the actual world.
- The complete site acceptance and static build pass, including the owner's
  current music and opening-handoff changes. Rendering remains over budget.
