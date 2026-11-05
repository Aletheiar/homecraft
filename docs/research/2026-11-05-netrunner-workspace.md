# Netrunner workspace: the north-east corner as a room

The private desk in the hall's north-east corner (+X, −Z) was a table with three
monitors on a gantry. This pass turns that one piece of furniture into a small
industrial room you can walk up to, sit down in, and operate — still inside the
glass pyramid, still built out of the same box batch.

## What the room is

| Part | Size / position |
| --- | --- |
| Rendered workstation boxes | 289, tagged `workstation` |
| Footprint | x 10.10 → 15.50, z −13.64 → −11.17 (5.40 m × 2.48 m) |
| Height | 0 → 3.21 m (back wall 3.12 m + steel cap) |
| Desk | 3.50 m × 1.14 m, top 0.785 m; call it 3.5 m of desk, not a 3.2 m table |
| Chair | seat at (13.15, −11.50), backrest solid behind it |
| Approach | (13.3, −10.2), the point the station card walks you to |

The wall sits 0.93 m behind the desk centre, so the whole assembly clears the
armillary's floor emblem (radius 3.9 m centred at the origin) and leaves the lane
from the entrance to the portals untouched.

## Structure

- Back wall: a full-width low band, a taller centre panel, two shoulder panels,
  edge columns with bolted pads, a steel-capped top rail, a plinth rail, a hazard
  rail, a clamped cable run and a vent bank. The gaps between panels are
  deliberate — the pyramid is still visible above and beside it.
- Desk: dark top on a twin-frame, rear gantry with three monitor arms, drawer
  stack, cabinet, keyboard, mouse, mug, notebook, two tools and a hard case.
- Equipment: the old rack was kept and rebuilt (four modules, grille slats,
  breakers, power switch, header) and a second cabinet stands beside the desk.
- Floor: a 4.34 m × 2.30 m rubber mat laid at y 0.026 over the 0.025 m paving,
  with yellow hazard tape at y 0.038, two red bands and a cable ramp. Nothing is
  raised, so movement, collision and pathfinding are unchanged.
- Lights: every strip is emissive geometry in one merged mesh — no light object
  was added. `lights: 0` in the station stats; the hall still renders with the
  hemisphere and the one shadow-casting directional light.

## Posters

| Plane | Asset | Source |
| --- | --- | --- |
| `poster-pyramid`, 2.05 m wide | `assets/posters/cyberpunk-pyramid.webp` (1280 × 800, 110 KB) | Cyberpunk 2077 Ultimate Edition key art, supplied by the owner |
| `poster-v`, 1.00 m wide | `assets/posters/cyberpunk-v.webp` (960 × 540, 43 KB) | Cyberpunk 2077 yellow V key art, supplied by the owner |

Both are official CD PROJEKT RED artwork, converted from the owner's originals
with `ffmpeg -c:v libwebp -quality 84` and no crop, so the aspect ratios (1.6 and
1.778) survive. The planes are `MeshBasicMaterial({ map, toneMapped: false })`
with `userData = { file, credit: 'CD PROJEKT RED' }`, framed in dark metal with a
warm sill. No reflection, no glow, no stretch.

## Interaction

The corner reuses the engine's own machinery instead of adding a second one:

- Hotspots go through `world.hotspots`, which the engine filters against
  `#pages .page[data-station]`; the five new cards (`terminal`, `status`, `rack`,
  `poster-pyramid`, `poster-v`) are what make the fixtures clickable.
- Panels open through the engine's `[data-open]` handler. Because that listener
  lives on `#panel` rather than the document, the hidden proxy anchors are
  appended *inside* the panel.
- The main screen keeps the GitHub entry: hovering shows `访问 GitHub ↗`, clicking
  opens `https://github.com/Aletheiar` in a new tab with `window.opener === null`.
- Seat: click the chair (hint `坐下 · 操作工作台`) or press F within 1.25 m. The
  visitor is pinned to the seat, the camera goes first-person facing the desk,
  walking is zeroed for as long as they sit, and Escape stands them up on the mat
  at (13.15, −10.58).
- While seated the side screens sit outside a 50° view, so the visitor turns
  their head with the mouse — the same look they use while walking.
- Panels never stack: the engine's own `#panel` dialog owns the modal state, and
  Escape closes the page before it stands the visitor up.

## Assets and UI

`index.html` gains five cards and one stylesheet link; `assets/netrunner.css`
holds the panel styling. The shell's `<input>` is built when the terminal opens,
not in the hidden card list — a focusable field sitting in `#pages` steals the
browser's sticky user activation on load, which made the courtyard's automatic
playback start before any gesture (found by `tools/check-music-autoplay.mjs`).

## Measurements

Same camera as the previous desk (`tools/.check/ws.mjs near`):

| | Before | After |
| --- | --- | --- |
| Draw calls | 23 | 25 |
| Triangles | 650,752 | 652,482 |
| Frame time | 16.7 ms | 16.7 ms |
| Real lights | 0 added | 0 added |

The station adds two draw calls: the poster planes (one material, two meshes) and
the emissive strip mesh. Everything else joins the hall's existing batched meshes.

## Validation

- `npm run check:site` — exit 0 (the three known informational warnings).
- `node --test tools/*.test.mjs` — 63 pass, including `tools/netrunner.test.mjs`.
- `node tools/check-workstation.mjs` — passes at 1440×950 and 390×844: three
  screens, exact main-screen hover and popup, side screens open their own panels
  without a popup or a stray URL hash, seat/sit/walk-frozen/stand, roof clearance
  over all 289 boxes, and the hall routes.
- `node tools/check-all.mjs` — "All standalone site checks passed."
- `npm run build` — `built dist (152M)`.
- Screenshots: `tools/.check/ws/v6-*.png` (near/front/left/wide/seat),
  `tools/.check/panels/*.png` (each panel), `tools/.check/workstation/*.png`.
