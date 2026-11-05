# Netrunner workstation interaction acceptance

Date: 2026-11-05, Asia/Shanghai. Baseline: `80d39f5`.

This records the completed composition before the owner's subsequent rotation
request. See [diagonal placement](2026-11-05-netrunner-diagonal-placement.md)
for the current world positions, facing and follow-up checks.

The baseline already contained the industrial workstation and the supplied
poster textures. This pass completes its interaction, corrects reproduced input/camera/telemetry
defects, and implements the owner's subsequent request to replace the flat
composition with a large central poster, separate working layer and turned side wing. It reuses the existing engine
tap recognizer, Raycaster, modal page dialog and external-link handler.

## Placement and visuals

| Item | Actual dimensions / coordinates (metres) |
| --- | --- |
| Entire workstation's batched boxes | x 9.812 to 15.875; z -14.105 to -11.165; y 0.02 to 4.12 |
| Occupied rectangle | 6.063 wide x 2.940 deep, including wing feet |
| Desk anchor | (13.30, 0, -12.60), facing south |
| Desk | 3.50 x 1.14; tabletop y 0.785 |
| Mat | 5.35 x 2.85; visual surface only, no floor-height change |
| Seated player / eye | (13.15, 0, -11.54) / (13.15, 1.28, -11.54) |
| Requested safe exit | (13.15, -10.58), resolved through the existing navigation grid |
| Approach | (13.30, -10.20) |

All 309 workstation boxes, the poster planes and the merged light geometry
were checked against the actual pyramid dimensions (half-width 18.2, height
24.8) with a 0.15 m roof margin. Furniture collision now covers the visible
chair footprint, back wall and equipment case. The former chair obstacle was
offset north of the visible backrest; it no longer acts as an invisible barrier.
Existing routes from the west entrance to every portal and the workstation
remain available. The standing exit passes `nav.canStand`.

The backdrop is rebuilt as a stepped service frame: a raised central panel,
low shoulders, open joints, cable tray and visible ribs. It is 5.6 m wide;
only the centre reaches 4.12 m. The main poster is now 3.2 x 2.0 m (formerly
2.05 x 1.281 m): 56% wider, 144% more area and 57% of the backdrop width. Its
centre is (13.20, 2.91, -13.888), aligned above the three monitors. It retains
small top/side margins and a plain, unlit metal frame.

The V image is 1.15 x 0.647 m on a separate 60-degree inward-facing left wing,
at approximately (10.678, 2.18, -12.805). The wing extends towards the visitor,
with upper/lower panels separated by an open joint and a vent bank below.
The side image is no longer on the front wall and has about one ninth of the
main print's area. Its ray target uses the same rotation as the real image.

The backdrop moves 0.45 m back, leaving 0.978 m between the main display and
the hero print, and about 0.7 m behind the desktop. The left rack moves 0.58 m
forward to (11.25, -12.10). A distinct right-hand drawer/speaker unit stands
at (15.50, -12.15). These side devices project beyond the desk, forming a
working corner rather than a single display plane. The corner's existing shelf
moves east to (15.95, -14.25), clear of the new rear shoulder; its planter moves
to (9.65, -14.00). No other room or furniture group is rearranged.

## Supplied images

| Image | Resource path | Dimensions / bytes |
| --- | --- | --- |
| Main pyramid artwork | `assets/posters/cyberpunk-pyramid.webp` | 1280 x 800 / 110,850 |
| Smaller yellow V artwork | `assets/posters/cyberpunk-v.webp` | 960 x 540 / 43,018 |

The existing files were visually inspected and preserved byte for byte.
Their source and copyright are recorded in `assets/posters/README.md` and the
existing import record. Both keep their full aspect ratio in the world and
in the larger preview. No replacement image, AI-generated artwork, added
reflection or crop is used. The current attachment contains only the task
text, so comparison against a newly supplied layout diagram was unavailable.

## Interaction

| Target | Result |
| --- | --- |
| Chair | Click/tap or F/E within 1.8 m sits down. The camera eases over 0.55 s to the lower seated eye, facing the desk. Mouse/touch drag still looks around. |
| Exit | A 44 px touch button, Escape, F or E stands the player on navigable floor and smoothly restores their prior first/third-person mode, heading, pitch and distance. |
| Main monitor | The existing GitHub page-link handler opens `https://github.com/Aletheiar` once, in a new tab with `noopener`, plus a brief scene confirmation. |
| Left monitor | Local simulated terminal: `help`, `about`, `projects`, `github`, `clear`. Enter and a touch submit button work; text never executes as code or a shell command. |
| Right monitor | Actual renderer calls, triangles, pixel ratio, scene lights, local time and engine-measured mean frame time/FPS; refreshed every 0.25 s only while open. |
| Rack | Described as decorative and offline. A disabled-during-boot button starts 2.4 s of indicator animation, followed by a clearly simulated completion message. |
| Posters | Each opens its own full-image preview with game title and CD PROJEKT RED attribution. |
| Light switch | Cycles warm yellow/teal, stronger night trim and decorative lights off, with feedback. It changes only the workstation's own emissive material and indicators. |

The engine's `extras.tap` hook consumes each fixture tap before walking or
ordinary station activation. There is no second `click` listener. Exact tilted
display-plane intersections and nearest-hit selection prevent side-screen
misclicks. The inherited main-screen hotspot shares the same floor/flight
reach guard, preventing a fallback activation when a local tap is rejected.

Seating bypasses walking physics; movement, jump, flight and view-mode controls
cannot move the seated player. The zoom guard covers wheel and native two-finger
pinch. Escape/F/E respect the existing page, map and weather-menu priority.
The single engine dialog prevents panel stacking. Closing workstation content
restores focus to the seated exit button or scene canvas, so a hidden terminal
field cannot absorb later movement keys. Reduced-motion users skip the view
transition. No seat animation is added; this is the permitted seated-view mode.

## Comparable rendering measurements

Chromium, same machine, 1440 x 950 desktop and 390 x 844 touch emulation;
same morning lighting and fixed desk/entrance camera positions.
The desk camera is (13.3, 2.9, -6.1), looking at (12.9, 1.95, -12.7). Baseline source
was served from Git objects through browser route interception without changing
the working checkout. Measurements are in ignored
`tools/.check/netrunner/performance.json`.

| View | Draw calls before / after | Triangles before / after | Mean ms before / after |
| --- | --- | --- | --- |
| Desktop desk | 37 / 37 | 652,892 / 653,098 | 16.7 / 16.7 |
| Desktop entrance | 60 / 60 | 667,504 / 667,710 | 16.7 / 16.7 |
| Touch desk | 37 / 37 | 652,892 / 653,098 | 16.7 / 16.7 |
| Touch entrance | 47 / 47 | 653,038 / 653,244 | 16.7 / 16.7 |

Textures (27), geometries (73) and shader programs (66) are unchanged. No new
real-time lights, postprocessing, runtime dependencies or per-frame geometry
creation. The larger composition adds 206 rendered triangles in these views
(about 0.03%). These local samples do not establish performance on physical
phones or a statistically significant frame-time change. The pre-existing
whole-scene budget excess remains: roughly 653k-678k triangles, and 71 calls
in the startup reference view, versus the 200k-triangle / 60-call budget.
This pass does not optimize unrelated scenery.

## Modified files

- `world/workstation.js`: visual corrections, exact targets, controls and panels.
- `world/space-config.js`: shared backdrop/wing/equipment composition and shelf anchor.
- `world/furnish.js`: move only the workstation planter clear of the deeper rear structure.
- `world/build.js`: pass navigation/delta time and expose the existing world's tap handler.
- `engine/main.js`: generic optional world tap dispatch before navigation.
- `engine/world/rig.js`: generic view snapshot/restore, eye height and smooth transition.
- `index.html`: protect interactive panel contents and clarify terminal network behavior.
- `assets/netrunner.css`: touch submit/exit controls and interaction feedback.
- `assets/posters/README.md`: existing poster provenance.
- `tools/camera-rig.test.mjs`: smooth seat transition and view restoration regressions.
- `tools/netrunner.test.mjs`: exact screen faces, actual colliders and all-geometry roof clearance.
- `tools/check-workstation.mjs`: collision expectation aligned with the visible chair.
- `tools/hall-signs.test.mjs`: describe the inherited GitHub hotspot accurately.
- `tools/check-netrunner.mjs`: new desktop/native-touch functional acceptance.
- `tools/check-all.mjs`: include the new acceptance suite.
- `tools/check-music-autoplay.mjs`: test-only readiness polling without granting user activation.
- `docs/superpowers/plans/2026-11-05-netrunner-interaction-completion.md`: implementation checklist.
- This report and `docs/project-status.md`.

The pyramid shell, central armillary, three portals, hanging illustration,
lounge, music system, guestbook and library source remain unchanged.

## Verification

Final local results:

- `node --test (Get-ChildItem tools -Filter '*.test.mjs' | ForEach-Object { $_.FullName })`: 70 passed, 0 failed.
- `npm run check -- http://127.0.0.1:8765/`: passed; startup and Dock checks at desktop/mobile sizes.
- `npm run check:all -- http://127.0.0.1:8765/`: exit 0; all standalone browser checks passed, including the corrected autoplay test and the new native-touch workstation suite.
- `npm run build` (Git Bash on PATH): exit 0; `dist/` built, 152 MB.
- `git diff --check`: passed.
- Poster assets and protected scene/music sources: no diff.
- Final front, oblique and portrait screenshots were rendered and inspected.

Screenshot artifacts are under `tools/.check/netrunner/` (desktop/touch workstation,
terminal, status, seated eye and both poster previews) and
`tools/.check/workstation/` (geometry/routes and existing interaction checks).
The composition views are `layout-desktop-front.png`,
`layout-desktop-left.png`, `layout-desktop-corner.png` and their touch variants.
The full acceptance log is `tools/.check/netrunner/full-check-final.log`.

Independent review also caught the relocated shelf intersecting the rear shoulder;
its eastward move is covered by a failing-then-passing geometry regression.
Independent review identified pinch zoom, old-hotspot reach fallback and
weather-menu keyboard priority. Each was reproduced or traced, corrected and
covered by the acceptance suite. Further native input testing caught focus
remaining in a hidden terminal after Escape; scene focus is now restored.

The first full regression run stopped in the existing autoplay test. A minimal
experiment showed `navigator.userActivation.hasBeenActive` changing from false
to true after `page.evaluate(() => 0)` without a real input gesture. The local
Playwright implementation sets `userGesture: true` for evaluation. The test
now polls readiness/title/paused state through CDP with `userGesture: false`
before its first trusted input, and uses a non-modifier key because Shift alone
does not grant Chromium activation. No music functionality was changed.

This is a local implementation and build, not a publication or deployment.
