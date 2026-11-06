# Local Project Audit — 2026-11-06

## Follow-up: reading-first mobile entry

The subsequent text-blog revision gives phones a reading-first default with an explicit 3D option. The text catalogs, section navigation, article reader and missing-content states now work independently of WebGL. HTML sample paths are normalized, all demonstration articles remain labelled, and Markdown destinations resolve against the source file URL. The short-landscape mini-player placement was changed and the Ori picking check passed again. The hub's original rendering-budget overrun remains a separate 3D optimization task. The findings below record the earlier audit state.

## Completed change

Music now starts at 25% when no valid volume preference exists. The full player and mini player share `DEFAULT_VOLUME`; an explicitly saved volume or mute setting still takes priority. A fresh browser reported `audio.volume === 0.25`, and both sliders reported `25`.

## Findings

### 1. Existing article readers request missing URLs

Priority: high. Confirmed in the current browser view.

`world/library/written.js` defines its base as `/articles/`, while the three legacy `page` entries already start with `articles/`. Resolving an entry therefore produces `/articles/articles/first-visit.html`, and the other two HTML entries have the same duplicate segment. Opening the first entry returned HTTP 404 and displayed the server's error page inside the reader.

Use one consistent base/path convention for legacy page entries. The browser check in `tools/check-library.mjs` currently accepts a URL suffix that also matches the broken URL; it should verify a successful response and the expected article heading.

### 2. The mini player intercepts landscape exhibit clicks

Priority: high for touch landscape use. Confirmed twice by the Ori browser check and by a separate DOM hit test.

At 568 by 320 pixels, the small-width rule in `assets/music.css` positions the mini player 148 pixels above the bottom edge. After opening and closing Ori's card, the player covers the projected exhibit target at approximately `(284, 135)`. `document.elementFromPoint()` returns the music capsule rather than the scene canvas, and tapping there leaves the exhibit card closed.

Use a short-landscape layout that keeps the capsule away from the central scene, or collapse it while preserving accessible playback controls. Check scene targets as well as the navigation bar when validating overlay clearances.

### 3. Text mode does not expose the new library catalogs

Priority: normal. Confirmed from the current HTML and browser view.

`engine/main.js:plain()` reveals the static `#pages` content without mounting the library renderer. The `collected` and `written` cards in `index.html` contain introductions, while their searchable lists and the new Markdown reader are created by `world/library/ui.js`. The text version consequently omits the actual collection entries and `reading-room.md`.

Make the reading renderer usable independently of scene startup, or provide ordinary fallback links and catalog content in the HTML.

### 4. Text-mode category shortcuts have no targets

Priority: normal. Confirmed in the browser.

The welcome card links to `#blog`, `#works`, `#writing` and `#about`, but the corresponding cards only have `data-station` attributes. In text mode, the 3D `data-open` handler is absent. Clicking Articles changed the hash to `#blog`, left the scroll position at zero and found no element with that ID.

Provide real section IDs and keep the native anchor behavior usable in text mode.

### 5. Common relative Markdown destinations are rejected

Priority: normal before adding article links and images. Reproduced against the renderer; the current sample does not use these destinations.

`world/library/markdown.js` accepts only a small set of URL prefixes. Rendering `[read](first-visit.html)` produces `href="#"`; rendering `![photo](images/photo.webp)` produces `src="#"`. An explicit `./first-visit.html` passes the prefix check but is still resolved against the outer room document rather than the Markdown file's directory.

Resolve authored destinations against the Markdown file URL, then validate the resolved scheme before emitting HTML attributes.

### 6. The hub remains above its rendering budget

Priority: normal before public/mobile release. Existing condition, measured again during this audit.

The local overview reported 78 draw calls and 689,988 triangles against the repository's limits of 60 and 200,000. The scenery GLB is 12,761,876 bytes before transport compression. These measurements indicate remaining rendering and download work; desktop mobile emulation does not establish actual phone frame rate.

## Verification and evidence

- `npm run check:site` completed with the three documented metadata/baseline warnings.
- `node --test tools/*.test.mjs`: 77 tests passed.
- `node tools/check-music-mini.mjs http://127.0.0.1:2823/`: desktop and phone playback, 25% startup volume, synchronized sliders, mute and saved preferences passed.
- Browser reproductions and screenshots are stored locally under `tools/.check/project-audit/`; the structured report records the iframe HTTP 404, missing text-mode target and current rendering counts.
- Full acceptance stopped at `tools/check-ori.mjs:103` with a landscape canvas-picking timeout. A standalone rerun reproduced that failure; its output is in `tools/.check/project-audit-ori-rerun.log`. The separate hit test confirmed the mini-player overlap described above.
- The subsequent library suite was run independently and passed its ten checks. Its legacy-article assertion still misses the HTTP 404, so that pass does not resolve the article-response coverage gap.
- Full acceptance output is stored locally in `tools/.check/project-audit-acceptance.log`; independent library output is in `tools/.check/project-audit-library.log`.
