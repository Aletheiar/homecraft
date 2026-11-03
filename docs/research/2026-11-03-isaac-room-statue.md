# Isaac Angel Room Statue: Reference and Asset Search

Checked on 2026-11-03. This note records the local preview revision, not a published release.

## Intended subject

The requested object is the stationary statue found inside an Angel Room or Devil Room in *The Binding of Isaac*. This revision uses the **Angel Room statue**. A previous procedural model incorrectly used a small head, a standing robe, closed facial features, joined praying hands and widely raised wings. Those features described a generic angel and did not establish the requested game prop.

## Inspected visual reference

The in-game Angel Room screenshot on [PlayerAssist, How to Get Angel Rooms in Binding of Isaac](https://playerassist.com/binding-isaac-get-angel-rooms/) was retrieved and visually inspected. [Direct screenshot](https://i0.wp.com/playerassist.com/wp-content/uploads/2021/09/Binding-of-Isaac-How-to-Get-Angel-Rooms.jpg?ssl=1&w=1080). A temporary research copy is stored in the ignored `tools/.check/statue-reference/angel-room-guide.jpg`.

The screenshot shows a large, unmarked pale oval face bordered by a gray cap/rim, a very short white robe with two small feet, two separated palms offered at the sides, and tall narrow wings hanging down next to the head. No eyes, nose or mouth are visible. The model follows those observed features. The oval face and folded wing proportions are preserved; the outlines, feather channels, stone base and rear volume are original geometric simplifications.

The same article also contains [a Devil Room screenshot](https://playerassist.com/wp-content/uploads/2021/09/xkx037ri7tuz.jpg). It was inspected and excluded from the Angel Room shape reference: it shows a horned demonic statue. Search-image labels alone were insufficient to identify the correct room.

The [Angel Room wiki](https://bindingofisaacrebirth.wiki.gg/wiki/Angel_Room) and [Angels gallery](https://bindingofisaacrebirth.wiki.gg/wiki/Angels) were located by live search, but direct retrieval was blocked. Their indexed text identifies the room statue and its relationship to the separate angel minibosses. The model was not drawn from unseen wiki artwork.

## Existing asset and project search

Local asset filenames were checked first. The project contains the original courtyard/scenery GLBs and the procedural monument, with no separate Isaac room-statue mesh found. The existing horse and source GLBs were not edited.

| Source inspected | What was found | Decision |
| --- | --- | --- |
| [Nice Cream: The Binding of Isaac - Low Poly Models](https://nice-cream.itch.io/the-binding-of-isaac-low-poly-models) | Creator page offers free Blockbench/OBJ files and explicitly lists 17 playable characters plus 5 familiars. | A useful existing fan asset pack, but the listed contents do not include the requested room prop. No download imported. |
| [techslogi/Binding-of-Isaac-VR](https://github.com/techslogi/Binding-of-Isaac-VR) | Repository describes a 2.5D diorama built from a user's own extracted game sprites; it ships no game assets. | Does not supply a reusable 3D room statue. No code or art imported. |
| [Steam Workshop: angel_statue](https://steamcommunity.com/workshop/filedetails/?id=3364108059) | Creator description says it resprites statues to look like actual statues. | A 2D graphics mod rather than a 3D scene model. No art imported. |
| [Steam Workshop: isaac minecraft in minecraft but also in isaac](https://steamcommunity.com/sharedfiles/filedetails/?id=2573429220) | Workshop page for an Isaac graphics modification. | Does not establish a usable room-statue mesh. No download imported. |
| [Cults: Figure of Isaac and Angel Isaac](https://cults3d.com/en/3d-model/art/the-binding-of-isaac-figure-of-isaac-and-angel-isaac) | Live search index reproduces creator zein9's description identifying the winged option as Isaac's third boss phase. Direct page retrieval returned 403. | Wrong subject; also a paid STL listing. No purchase or download. |
| [Sketchfab: Isaac, by rakushe4nik](https://sketchfab.com/3d-models/isaac-the-binding-of-isaac-rebirth-cd10cc573b6f442994789e3c47aaa233) | Indexed creator description identifies playable Isaac inspired by the Specialist dance mod. Direct page retrieval returned 403. | Wrong subject. No download. |
| [3DGO index: angel and devil Joy-Con holder](https://3dgo.app/models/makerworld/3192160) | Index identifies a Switch 2 Joy-Con holder by user_190779473 and reports BY-NC-SA. Its [hosted product photograph](https://makerworld.bblmw.com/makerworld/model/UScf5792a9c3310c/design/d561e7c6b797bee6.png) was retrieved and visually inspected. It combines half a devil and half an angel as a flat layered holder, with controller mounts. | A closer iconographic match, but not a complete standalone 3D room statue. Original MakerWorld download and license were not independently verified. No model imported or license assumed. |

Searches included room-statue terms, general 3D/printing terms, Sketchfab, GitHub, Steam Workshop and existing Blockbench projects. This is a bounded search report: it does not establish that no suitable model exists anywhere. No verified ready-to-use complete 3D room-statue asset was found in these inspected results.

## Local implementation

`world/statue-data.js` defines an original code-native voxel interpretation. It uses six tint colors, including the observed pale face and gray rim. The face has no facial features. Palms are separate and visible above their supporting dark edges. The head has a rounded solid rear rather than being a single flat board. Wings descend close to the head with three stepped feather tips and gray grooves. Runs merge horizontally, vertically and in depth.

The six-metre foundation and monument position remain unchanged: `(-62.6, -19.2)`, facing east toward the glass pyramid. Height is 11.4 m, including the existing tall base. Geometry contains 292 boxes / 3,504 triangles in one opaque batch, with no added lights, glass or navigable obstacles. The object remains outside the fence. This is a stylized fan interpretation, not an official game asset or a claim of an exact 3D reconstruction from a 2D screenshot.

## Validation evidence

- The revised recognition test failed against the previous generic model before the geometry rewrite.
- `node --test tools/statues.test.mjs`: 3 tests pass, covering location/facing/bounds/budget; blank face, gray rim, separate visible palms, solid head and folded wing shape; finite grounded geometry.
- Isolated Three.js previews were rendered with a headless Chromium session and visually inspected from front, side and oblique views. No page errors were reported. Ignored outputs: `tools/.check/statues/room-angel-front.png`, `room-angel-side.png`, `room-angel-oblique.png`.
- The isolated preview uses neutral preview lighting, not the full site's materials or environment. Actual courtyard appearance and full-site checks are a separate integration check.

The underlying game design belongs to its respective creators, including Edmund McMillen and Nicalis. No external mesh, texture or sprite is bundled with this original procedural adaptation. Reference screenshots are kept only as ignored local research evidence.
