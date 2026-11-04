# E8 forecourt and arrival music

Implemented locally on 2026-11-04, Asia/Shanghai. The owner approved the
rectangular crop from the earlier E8 design preview and requested actual
browser inspection. The same task adds random-start, ordered music playback
on page arrival. This document does not claim website deployment.

## Forecourt

`world/e8.js` constructs the 112 signed coordinate-pair roots and 128
even-parity half-coordinate roots. It projects them onto the same orthonormal
Coxeter plane axes used in the approved preview. The full root graph has
6,720 nearest-neighbor edges; the floor paints the 2,460 edges joining rings
at most one rank apart. All eight rings contain 30 projected roots.
See [Stembridge's Coxeter planes](https://websites.umich.edu/~jrs/coxplane.html)
for mathematical background; this is a classical object, not a new AI result.

`world/forecourt.js` scales the projection uniformly to radius 18.3 m and
clips it to x `[-33.8,-20.7]`, z `[-16.5,17.5]`. This is a 13.1 by 34 m
window, centered at `(-27.25, .5)`. Clipping means that the complete root set
and global thirtyfold outline are not all visible. Separate canvas scales
compensate for the texture's aspect ratio; the world-space projection is
not stretched.

The texture uses pale stone, brass linework, faint stone joints and 3.7 m
square quiet surrounds for the existing music and guestbook kiosks. One
opaque, rough, shadow-receiving plane sits at y=.036 above the imported
andesite at y=.025. It adds no obstacle, navigation source, step, light or
per-frame animation. Its 1024 by 2048 canvas is painted once at startup;
the RGBA texture with mipmaps uses approximately 10.7 MiB before driver
overhead. Anisotropic filtering keeps oblique views readable.

The measured rendering increment is one draw call and two triangles. The
existing scene still has roughly 656k triangles, above the 200k budget;
this change does not resolve that existing limitation or establish real-phone
performance.

## Arrival music

Every page initialization chooses one public manifest entry with a uniform
random index, then attempts `audio.play()` before the music card is opened.
Shuffle remains off and list repeat remains on. Endings advance in the
manifest's existing order and wrap from the last track to the first. Selecting
another song makes that entry the new position for ordered playback.

A browser that refuses audible autoplay with `NotAllowedError` leaves the
chosen song ready and retries after a trusted click, keydown, pointerup or
touchend outside
the music controls. The controls perform their own action, preventing a global
retry from undoing a pause or changing a selection. Retrying never rerolls the
initial song. The pending listeners are removed after playback or explicit
selection, and disposal cancels pending work and releases the audio source.

Volume and mute preferences remain local to the visitor. A missing volume
preference now defaults to .8: coercing a missing localStorage value with
`Number(null)` had inadvertently selected zero. Muted or zero-volume choices
are still respected. Visitors do not need GitHub authentication to change
music; the separate guestbook authentication is unchanged.

Closing the music card keeps the song playing. Leaving through a portal stops
the old page; reloading or returning to a newly initialized page selects a new
random starting entry. The narrow-screen playing indicator is positioned above
the scene buttons and hint so it does not cover the entrance controls.

## Validation

- `tools/check-music-autoplay.mjs` uses real Chromium media playback under
  both explicit autoplay policies. It checks a nonzero starting entry,
  activation without rerolling, ordered advance, wrap, manual selection and
  pause surviving subsequent input. A separate touch-drag check covers mobile
  activation without a synthesized click. The media is a short fixture, not a
  download of the full public collection.
- `tools/check-music.mjs` retains public/private shelves, import, seeking,
  persisted volume, repeat controls, background playback and responsive layout
  coverage. Its initial-state assumptions now match arrival playback, and the
  playing indicator must not overlap scene controls.
- `tools/check-forecourt.mjs` checks the real mesh and incremental draw cost,
  samples the footprint against water, and walks across the pattern and toward
  the entrance using the production movement code. It saves morning overview,
  top, walking and night views at desktop and narrow-screen sizes.
- Both new browser checks are included in `tools/check-all.mjs`.

The screenshots are local artifacts under `tools/.check/forecourt/`. Visual
inspection covers texture placement, border, kiosk surrounds and readability;
it does not establish real-device performance or a global rendering-budget
pass. Exact commands and final results are recorded in the parent status note.

Final local acceptance: the complete `npm run check:all --
http://127.0.0.1:8765/` run passed, including 47 Node tests and all browser
suites. `D:\Git\bin\bash.exe tools/build.sh` also passed without deployment.
The measured reference frame renders 59 calls and 656,362 triangles. The
existing metadata, frozen-engine drift and triangle-budget warnings remain.
