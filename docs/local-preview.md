# Glass Pyramid Local Preview

This local prototype adapts `Aletheiar/homecraft` on branch `feat/pyramid-local-preview`. It has not been pushed or deployed.

## Start

On Windows, run the preview server in the repository root:

```powershell
python tools/serve.py 8765
```

Open the address printed by the server; the command above uses `http://127.0.0.1:8765/`. The current session may use a different port: `Get-Content tools/.serve-url` shows it. The bundled server binds to loopback by default. `?plain=1` displays the text version.

## Experience

- The overview shows the actual cropped NewHeaven pyramid and pool courtyard.
- Enter Hall moves the visitor indoors and switches to first-person view. V switches camera mode.
- Welcome and Articles remain reading cards. Projects, Journal, Friends and About use four matching west-facing portal frames arranged in aligned pairs. Their Dock buttons only move to the approach; crossing the physical opening is required to enter. Keyboard interaction and its prompts are disabled; ordinary room reading cards remain pointer-accessible.
- Three local sample articles demonstrate normal, responsive reading pages. They are explicitly labeled examples and contain no invented owner biography.
- The original west-side glass opening is the entrance. The added south portal and bridge have been removed. Seven polygon basins support walking entry, swimming, diving and climbing out through the original swimming animation system.
- The courtyard is bounded at ±39.5 m by rails and hedges; the original palace and small pyramids remain scenery. Pools are scaled to 88% around their own centroids, leaving a continuous perimeter path. Walking, flying and jumping remain bounded. The flight ceiling is 38 m including body height; the lower bound is -4.5 m to accommodate swimming.
- A procedural voxel angel monument stands opposite the original horse at (-62.6, -19.2), faces east toward the pyramid and remains outside the walkable area. This game-reference-driven Angel Room fan adaptation has 292 batched boxes / 3,504 triangles and a height of 11.4 m; no source GLB was changed.
- The imported glass shell supplies its own walkable surface. The western entry is carved out of the model's blocks and is reported at the height the model draws it, the apex takes the capstone's block top, and a 0.6 m stone apron ring at the base turns the model's full-block first course into two steps a visitor can take on foot. The slope between them follows a cone drawn through the treads' noses, because a 0.267 m tread is narrower than the body's step test. Interior rain and snow stop on that same height field, and a body crossing the glass or its ceiling is refused.

## Files

- `world/layout.js`: spawn and physical stations.
- `world/build.js`: ground, perimeter, scenery and world behavior.
- `world/boundaries.js`: courtyard and glass-shell collision predicates.
- `world/furnish.js`: simplified interior furniture; no standalone About kiosk or desk/stools between library bookcases.
- `world/pyramid.js`: GLB loading and preview materials.
- `world/statue-data.js`, `world/statues.js`: procedural angel sculpture and batching.
- `world/portals.js`, `world/portal-journey.js`, `world/portal-transition.js`, `world/rooms/`: portal interactions, one-shot return checkpoints, transit effects and enclosed rooms.
- `index.html`, `articles/`, `about/`, `friends/`, `assets/pyramid.css`, `assets/article.css`, `assets/about.css`, `assets/links.css`: site content and reading layouts. Profile data is edited in `about/profile.js`; the friend list is edited in `friends/list.js`.
- `assets/models/provenance.json`: model source hash, crop transform and output counts.

A focused local engine extension adds optional convex POOL.polygons support. Rectangular pool behavior remains available; an isolated differential check matched 1,173 original rectangular-pool snapshots. Intentional engine changes cover water containment, shore entry/exit, water surface geometry, camera effects and minimap coloring. engine/manifest.json is intentionally unchanged. The GLTFLoader and BufferGeometryUtils modules are vendored from Three.js r180, matching the existing core. Their license is `vendor/three/LICENSE`.

## Model preparation

```powershell
python tools/prepare-pyramid.py --source ../MC-Architecture/Louvre-3D-Selection/models/NewHeaven.glb
```

The offline script requires numpy, trimesh and shapely 2.1 or newer. It crops the archived model, recenters it, uniformly scales it by 0.4 and retains the original west opening. A second GLB restores the original surrounding palace and smaller pyramids as non-walkable scenery. Coplanar surface unions remove redundant subdivision edges; distant material colors are grouped and rendered with baked directional tones. The original source GLB is retained unchanged. Runtime preview materials lighten the structural frame and adjust glass opacity; the original authored materials and shaders are not reproduced exactly.

Original GLB: 39,037,312 bytes and 814,226 triangles. Current courtyard GLB: 1,986,816 bytes and 41,609 triangles. Scenic GLB: 12,761,876 bytes and 579,388 triangles. These numbers exclude new furniture and terrain. This is a crop, not a claim of lossless simplification of the entire original building.

Building author: NewHeaven. Source: https://www.minecraft.net/en-us/article/louvre-craft . Model and Minecraft textures are retained for local inspection; their redistribution permissions have not been established. Homecraft's MIT license does not automatically cover third-party model or texture assets.

## Validation

```powershell
node --test tools/pyramid.test.mjs tools/pool-regions.test.mjs
node --test tools/doors.test.mjs tools/portals.test.mjs tools/portal-journey.test.mjs
node --test tools/hall-signs.test.mjs tools/statues.test.mjs tools/camera-rig.test.mjs
npm run check
node tools/check-spaces.mjs http://127.0.0.1:8765/
node tools/check-pyramid.mjs http://127.0.0.1:8765/
node tools/check-swimming.mjs http://127.0.0.1:8765/
node tools/check-followup.mjs
```

Pass the active preview address to the checks when it differs from port 8765. `check-followup` reads `tools/.serve-url` by default. The dedicated checks cover desktop/mobile layouts, dry spawn, west entrance traversal, physical F interactions, Dock cards without physical targets, opaque reading panels, article pages, courtyard limits, the flight ceiling, climbing and landing on the glass crown, falling through the roof, room round trips and native swimming. Reports are in `tools/.check/pyramid/`; this continuation's scene-click, monument and reduced-motion checks are in `tools/.check/followup/` (both ignored by Git).

Browser QA uses software rendering and mobile viewport emulation. It does not establish actual phone frame rate. Restored scenery exceeds the upstream 200,000-triangle and 500 KB compressed first-load targets; initial download optimization remains future work. The owner's final tagline, logo, biography, articles and links are not supplied in this prototype.

## Revision requested after the first preview

- Linear dimensions changed from .32 to .4: width, depth and height increase by 25%, with 56.25% more ground area. Furniture retains its original size and is spread farther apart.
- The west-side opening was confirmed in original glass and frame geometry, not inferred from the invented portal.
- Original palace scenery is visible but has no walking surface, click destination or collision entry beyond the courtyard boundary.
- The outside lawn has a central hole so it does not cover the deepened water basins.
- Nine pure tests and desktop/mobile station checks cover the revision. Separate swimming acceptance visits all seven basins through the normal navigation handler, dives and climbs out, and exercises manual shore entry.
- Research and content recommendations are recorded in docs/research/2026-11-03-blog-spaces.md. No personal biography, project result or real article was invented. Content entry points remain configurable.

## Earlier iterations (historical behavior)

- **Doors face the entrance.** `world/space-config.js` exports `ENTRANCE_YAW = -Math.PI / 2`, and all three hub portals use it, so every door faces the only opening in the west glass (x ≈ -18.2). The three stations sit 2.0–2.5 m in front of their door and look at it, which also satisfies the standing spot `go(id)` lands on. `tools/doors.test.mjs` asserts the normals point west (-x) and that each station is inside the door's F window and looks into it.
- **Coming back lands at the door you left by.** `world/portal-journey.js` (no dependencies) stores `{x, y, z, yaw, firstPerson, gate}` in sessionStorage when a portal or a card link leaves the hall, and restores it when the hall is opened with `&return=1`. Rooms send that flag from their return button, their return portal and the card link. The checkpoint is one-shot: a second visit without the flag starts at the normal spawn, and a saved point outside the island or above the ceiling falls back to 1.5 m in front of the recorded gate. Yaw is wrapped with atan2, because the rig accumulates rotations (a visitor who turned twice may hold 11 rad).
- **Engine hook for the restored viewpoint.** `engine/main.js` played the island opening shot after `W.setup()`, which flew the camera away from the restored door. The setup result can now carry `skipIntro` and the engine skips that shot: `else if (!reducedMotion && !extras.skipIntro) rig.startIntro(player);`. Without this the restore feature does not work, so the change is required rather than cosmetic. It is the only engine edit in this pass.
- **Nether-style transit.** Portal veils are redrawn as a dark violet curtain with vertical light streaks and the door colour at the edges, UV-scrolled on the existing plane, so no draw call is added. `world/portal-transition.js` charges for 0.42 s and plays a full-screen violet ripple on arrival; the nether veil was tried and reverted. The overlay is a radial violet field with a ring; the engine loader is hidden for portal arrivals, and `prefers-reduced-motion` skips it.
- **F keeps its browser meaning.** `world/portal-rules.js:portalShortcut` rejects Ctrl, Cmd and Alt combinations, key repeat, text fields and contenteditable hosts, so Ctrl+F searches the page again.
- **The Miku illustration is reachable.** `index.html` had a `data-station="miku"` card but `world/layout.js` had no station, and `stationFor` returns nothing for unknown ids, so the hotspot was dead. The station now stands under the suspended frame. The artwork hangs at y 6.2–11, so the card, not the wall, is what a visitor reads.
- **The perimeter road was a test-placement error.** The walkable band is 0.4 m wide: pool copings stand at |x|,|z| ≈ 38.16 and the fence blocks from 38.92, so the dry centre line runs at 38.3–38.7. The check walked 38.2, where the coping clipped the 0.28 m body radius, and reported 300 invalid samples. It now walks 38.5 and all four legs complete (77 m each); the world itself needed no change.
- **Courtyard shadow stripes.** The diagonal bars across the paving and water were shadow acne from the imported shell, not a paving texture: they vanish with shadows off. This world raises `stage.sun.shadow.normalBias` from .035 to .09 in `world/build.js`, before the baked map is built; contact shadows are a separate pass and are unaffected.
- The crystal and observatory checks failed because `openPage` closes a card once the player is further than 3.5 m from the station. `check-spaces.mjs` now walks to the stand first, the way a visitor has to.

## Earlier follow-up after the DeepSeek handoff

- Removed the physical Welcome and Articles assemblies and station targets, while preserving both HTML cards and Dock buttons. About now stands at (-6, 2.4), with a western approach at (-8.25, 2.4). Its mesh, base, carpet, bounds, hotspot and baked lamp share the same transform; its explicit number remains 03.
- Added the mirrored angel monument described above. The original horse at approximately (-62.6, +19.2) remains unchanged. This implements the documented mirrored-monument option, not relocation of the horse onto the central axis. Attribution is in `assets/models/statues-provenance.json`.
- Fixed veil animation wiring in both hub and rooms. The engine only exposes custom fields returned inside `named`; the prior top-level `veils` field never reached setup. `check-spaces` now measures the rendered material's UV offset rather than merely checking that a texture loads.
- Fixed ordinary scene hotspot clicks in `engine/main.js`: `tap` previously handled only the default portal. Ordinary hotspots now call the existing activation route after intro, diving and web-mode handling. This enables the sign's advertised pointer action without replacing engine input handling. The manifest is unchanged. The upstream latest stable release was checked read-only and remains v0.1.1; no engine upgrade was applied.
- Fresh checks: 36 focused Node tests, 34 desktop/mobile courtyard checks, 9 space checks, all 7 native pool journeys, 6 follow-up browser checks, and `npm run check` passed. The review found no concrete scoped regression. Software-rendered frame timings are not phone performance evidence; the roughly 655k-triangle scene still exceeds the upstream budget.
- The inherited `check:pr` expects template portal/mailbox/listing fixtures this customized root does not provide. That gate, its fixtures and its tooling have since been removed from this repository; no push or deployment was attempted at the time of writing.



## Current revision: profile portal and walking-only entry

- The former About kiosk and carpet are removed. About is a fourth equal-size portal at (-5, 7), mirrored with Library (-5, -7), Project (9, -7) and Friends (9, 7). All face the only original west entrance. The library desk and stools between the two bookcases are removed.
- About opens `/about/`, a responsive HTML profile without Three.js. It contains the supplied Aletheia name, an intentionally empty biography, and the exact GitHub, Zhihu and Shuiyuan account links. Page content is configured in `about/profile.js`.
- No portal F listener remains. `keyboardInteraction: false` disables the engine's generic F/E/Enter action and proximity prompt in this customized world and its rooms. `portalMenu: false` skips the shared directory's menu/button; incoming native-protocol visitors retain a return-only control. Both engine behaviors retain their previous defaults when flags are absent. Generated plugin controls are synced.
- Portal stations use `page:false`. Dock buttons guide visitors to the front; they neither open a destination nor bypass crossing. Scene portal hitboxes no longer activate content by clicking the veil. Reading-page approach links are intercepted only after successful 3D setup; their real hrefs keep text/WebGL-error fallbacks usable. The explanation panel now contains just its title and movement instructions.
- The sculpture was rebuilt after inspecting an actual Angel Room screenshot: oversized blank pale oval, gray cap, open separated palms, short robe and narrow downward wings. It is an original code-native interpretation, not an official asset. Existing packs/VR projects/sprite mods were checked, but no verified complete reusable room-statue mesh was found among inspected results. See `docs/research/2026-11-03-isaac-room-statue.md`.
- Portal crossing uses the original full-screen violet ripple: a radial violet field with a closing/opening ring, 0.42 s leaving and 1.2 s arriving. The classic boot in `world/portal-boot.js` shows the same overlay before first paint, reads the one-shot sessionStorage flag and hides the engine loader only for portal arrivals; direct visits keep the normal loader. The room return button and About return link use the same departure charge; `prefers-reduced-motion` skips both. Portals can be entered from either face; the return checkpoint and BFCache restore stay on the side the visitor came from. Reloaded history uses a one-shot history marker; BFCache restoration resets the departure latch, overlay and movement samples. Both browser Back paths were reproduced and verified by `node tools/check-history.mjs`.
- Focused tests include `tools/profile.test.mjs` and `tools/check-followup.mjs`. Current functional validation covers disabled F/menu, walking through all four destinations, room return, mobile touch navigation and an empty biography. The inherited rendering budget remains exceeded; no push/deployment or complete upstream PR-gate success is claimed.

## Current revision: friend links as one directory page

- The Friends portal at (9, 7) no longer opens a walkable lounge. It opens `/friends/`, a responsive HTML directory built from `friends/list.js`, so adding a friend is one entry in that file and the hall keeps exactly four portals. The third room, its example portals and the `?space=friends` allow-list entry are removed; `world/rooms/` now serves only the library and the studio.
- Each entry renders as a card with its name, note and host, flagged 示例 while the owner has not supplied real links; the footer note disappears once no entry carries the flag, and an empty list shows one placeholder line. Names and notes are written with `textContent`, so an entry cannot inject markup.
- `tools/links.test.mjs` renders the page at mobile and desktop widths, compares the cards with `FRIEND_LINKS`, checks the return link and the no-overflow condition, then renders a markup-shaped name to confirm no element is created. `tools/check-spaces.mjs` walks through the Friends door and asserts the directory lists every entry.
