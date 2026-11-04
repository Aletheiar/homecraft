# Courtyard detail refinement

Implemented locally on 2026-11-04, Asia/Shanghai. This supersedes the three-artwork
layout in the earlier courtyard decoration note. The owner explicitly chose
removing the exterior benches without replacement and subsequently requested
removing the Defect and Watcher hanging panels.

## Devil Room sculpture

The sculpture remains an original voxel fan interpretation of the stationary
Isaac room prop. The previously saved in-game reference and the previous
runtime sculpture were visually inspected before editing. The placement,
east-facing orientation, six-metre base and matching Angel Room statue are
preserved; no source GLB was modified.

The skull now uses 0.11 m slices with varying depth and cheek facets. The eye
sockets have projecting brows; the muzzle, nostrils, lip and teeth use smaller
features. Hooked horns use 16 overlapping slices each, with sparse ridges.
Folded wings use curved leading edges and narrower lower tips, membrane
insets and rib segments. The offering hands have separate fingers and thumbs;
the robe and hooves have restrained grooves.

The devil uses 404 boxes / 4,848 triangles, up from 254 / 3,048. The pair
remains in one opaque batch and totals 8,352 triangles, below its existing
10,000-triangle bound. Height is 11.42 m. No light, animated detail or
navigation obstacle was added. The overall scene remains above its existing
200,000-triangle budget; this is a visual refinement, not a performance fix.

## Forecourt and gallery

Both benches at x=-35, z=+-4 and their matching collision obstacles were
removed. Nothing replaces them. The E8 paving, music kiosk, guestbook and
entrance route remain. This leaves a clear approach in front of the pattern
instead of adding more decorative objects.

Only the original central Miku image remains in the suspended gallery. The
two side images, frames and cables are no longer constructed. Readiness now
tracks the single retained image; it does not wait for three loads. The former
image files remain available as unused source assets, but the current scene
does not request or upload their textures.

## Friends icon

`engine/ui/icons.js` adds a generic 16 by 16 interlocking-link sprite using
the existing palette. `world/layout.js` and `index.html` both select `link`
for Friends. The Dock, minimap station marker and card header therefore share
the symbol, while About retains its avatar icon. The engine contains the
generic symbol; the site-specific assignment stays in the world and page.
No navigation destination, entry behavior or label was changed.

## Validation

The existing Devil Room tests check placement, finite positive geometry,
the paired triangle bound and recognizable features. The browser decoration
check now also requires distinct rendered Friends/About icons, walkable former
bench positions, no side image objects or requests, and the original loaded
central image. It captures front and oblique sculpture views, the gallery and
the forecourt at desktop and narrow-screen sizes.

The changed views were inspected in Chromium, including 390px screenshots.
An independent read-only review found no actionable defects. Final full-suite
and build results are recorded in the parent status note. Browser screenshots
and reports are under `tools/.check/decor/`.

The complete `npm run check:all -- http://127.0.0.1:8765/` run passed, including
47 Node tests and all browser suites. `git diff --check` passed. The reference
forecourt frame renders 57 calls and 657,962 triangles with 24 textures; the
triangle-budget warning remains. These are local checks, not deployment or
physical-phone performance acceptance.
