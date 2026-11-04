# North-east industrial workstation

Implemented and checked locally on 2026-11-04. This change replaces only the
hall workbench and its immediate equipment, chair and planter. It does not
modify the three portals, armillary, hanging artwork, lounge, hall shell,
outside scenery, music, guestbook, player movement or minimap.

## Placement and structure

- Desk anchor remains `(13.3, 0, -12.6)`, facing south into the hall.
- Main display centre: `(13.3, 1.32, -12.91)`, 1.12 × 0.70 m.
- Terminal display centre: `(12.28, 1.30, -12.84)`, 0.72 × 0.58 m, yaw +0.2.
- Hardware display centre: `(14.32, 1.30, -12.84)`, 0.72 × 0.58 m, yaw -0.2.
- Table: 3.2 × 1.12 m, top at y = 0.785 m; frame height reaches 1.78 m.
- Short server rack: `(11.25, 0.03, -12.68)`, 0.70 × 0.79 m footprint.
- Seat remains near `(13.15, 0, -11.5)`; the station approach remains
  `(13.3, -10.2)`.
- Only the workbench planter moves, from `(10.9, -9)` to `(10.65, -14.15)`.
  The adjacent bookshelf remains unchanged.
- A 4.8 × 2.5 m dark mat at y = 0.008–0.020 defines the equipment area.
  It adds no floor-height rule or collision step. Existing floor tiles remain.

The existing BoxBatch handles the desk, supports, ventilated PC and rack,
individual keycaps, mouse, stepped headphones, cables, books and chair.
Materials use black metal, charcoal paint, rubber, small walnut details,
cyan emissive trim and amber equipment indicators. No new real-time light,
post-processing, particle effect or dependency was introduced. The former
local desk bake is reduced to power 0.8 and radius 2 m.

## Displays and interaction

One 1536 × 640 CanvasTexture holds three readable display panels and the small
equipment plate. Their geometry is merged into one mesh. GitHub/profile
navigation is the main panel; the terminal and hardware panels say SIMULATION,
and the hardware panel also says NO LIVE DATA. Text is static. Only four small
amber LEDs pulse with a five-second period; no texture is uploaded per frame.

The GitHub destination comes from the existing `PROFILE.accounts` entry:
`https://github.com/Aletheiar`. The workbench card and its text fallback link
point to that profile. Native scene interaction still requires proximity and
opens `_blank` with `noopener`, preserving the current page and player state.
The hover label is `访问 GitHub ↗`.

The hotspot hugs the actual main-screen face: 1.12 × 0.70 × 0.012 m. A generic,
optional `hotspot.hitTest(ray)` guard was added to the engine picker. Only this
station supplies it. Its site-local predicate intersects the actual tilted
auxiliary housing bounds in their local frames and rejects main hits behind
them, as well as hits from behind the main screen. Hover reuses the predicate.
This fixes a reproduced side-view misclick without changing other hotspots or
player input. Keyboard interaction remains disabled by the existing site
configuration; no E/F shortcut was added.

## Scope verification

Task-start snapshots and hashes are in ignored `tools/.check/workstation/`.
Among 132 pre-existing source and asset files measured at task start, only
`world/furnish.js`, `world/build.js`, `index.html` and `engine/main.js` change.
The remaining 128 retain their original hashes. The central-exhibit block
and all furniture after the workbench block remain unchanged, apart from
exporting the new workstation state in the return value.

Production files: `world/workstation.js` (new), `world/furnish.js`,
`world/build.js`, `index.html`, `engine/main.js` (one optional picking guard).
Tests: `tools/hall-signs.test.mjs`, `tools/check-workstation.mjs` (new),
`tools/check-all.mjs`. Documentation: this record and `docs/project-status.md`.
Earlier unrelated uncommitted changes were preserved during implementation.
The owner subsequently requested integrated commits and GitHub publication;
see the [integration record](2026-11-04-hall-release.md). Local validation does
not establish a deployment result.

## Verification

The new station acceptance first failed against the old single monitor.
The auxiliary-occlusion regression also failed before its fix. Final checks:

```powershell
node --test (Get-ChildItem tools -Filter '*.test.mjs' | ForEach-Object { $_.FullName })
node tools/check-workstation.mjs
npm run check -- http://127.0.0.1:8765/
node tools/check-followup.mjs http://127.0.0.1:8765/
node tools/check-armillary.mjs http://127.0.0.1:8765/
D:/Git/bin/bash.exe tools/build.sh
git diff --check
```

- 55 Node tests pass.
- Workstation Chromium checks pass at 1440 × 950 and 390 × 844: three textured
  displays; real main-screen hover and popup; correct URL; null opener;
  unchanged source page/player position; no auxiliary popups; oblique housing
  occlusion; working LED update; roof clearance; furniture colliders; a real
  walk across the approach lane and a walk stopped by the chair; routes from
  the west entrance to all doors and the workstation.
- Startup/Dock, hall interaction and central-armillary regressions pass.
- Browser screenshots were inspected at both widths.
- Build succeeds locally (152 MB output); no deployment flag was used.
- Independent review reproduced the auxiliary-screen bug, then verified its
  fix in Chromium and found no further actionable issue.

The isolated hall geometry increases by 1,518 triangles and one unbatched mesh
relative to the task-start scene. The display atlas replaces the old nameplate
texture, so the measured total remains 24 textures. Startup reference views
report 60 draw calls, about 665k triangles and 16.7 ms/frame on this computer.
The pre-existing 200k triangle-budget violation remains. These measurements
do not establish performance on a physical low-end phone. No remaining
functional issue was found within this task's scope.

Screenshots and logs: `tools/.check/workstation/` (ignored local artifacts).
