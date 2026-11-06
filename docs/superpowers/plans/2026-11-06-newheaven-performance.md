# NewHeaven Performance Implementation Plan

**Goal:** Reduce measured rendering and loading costs without redesigning the completed site or changing its interactions.

**Architecture:** Keep site-specific optimization in `world/` and offline asset tools. Preserve generic engine boundaries. Optimize opaque, appearance-equivalent geometry first; keep glass, sculptures, animated exhibits, collision, and static shadows intact. Do not collapse the entire scene into one mesh. Work in the existing topic checkout and preserve all earlier uncommitted work.

**Stack:** Native Three.js ES modules, GLB, Python geometry analysis, Playwright/Chrome, existing Node acceptance suites.

## 1. Establish evidence before editing production files

- Read AGENTS.md, current model generator, renderer, loaders, build rules, and provenance.
- Run six fixed cameras: exterior, armillary, workstation, Ori, library, and explicit mobile 3D.
- Pin viewport, DPR, weather, time, camera, and browser. Record RAF FPS/mean/P95, main-loop CPU cost, GPU timer results when available, draw calls, triangles, resource bytes, and screenshots.
- Save raw results under ignored `tools/.check/performance/`. Record browser/GPU identity and measurement limitations.
- Hide scenery, courtyard, and glass independently after the full baseline. Compare rendering cost and triangle deltas before choosing optimizations.

## 2. Optimize measured geometric bottlenecks

- Audit exact duplicate faces, coincident internal surfaces, planar runs, repeated units, and model bounding boxes.
- Preserve the existing flat/smooth shading rules and directional vertex colors; appearance-equivalent coverage alone is insufficient.
- Back up original assets before mutation. Add reproducible offline transformation and invariant checks.
- Reject lossy simplification of core sculpture/building silhouettes. Use spatial partitioning only when measured culling benefit outweighs added draw calls.
- Re-run all six views and inspect image differences after each geometry stage. Revert changes that add complexity without benefit.

## 3. Apply low-risk runtime and loading cleanup

- Prove resource references before removing anything. Preserve research and attribution; exclude proven development-only assets from distribution when source retention is useful.
- Keep static shadow behavior, current quality defaults, transparency, and light counts. Consider single-pass only for planar transparent decals after image verification.
- Remove proven per-frame allocation/redundant work without changing animation clocks or public interfaces.
- Precompress GLBs where supported; document that compression changes transfer size, not triangle count or FPS. Keep mutable URL cache policy safe.
- Check temporary geometry/material/texture disposal and repeated-load behavior.

## 4. Verify and deliver

- Run relevant Node suites, all affected browser acceptance suites, `npm run check`, and `npm run build`.
- Inspect screenshots for all six views and test protected interactions.
- Write an English report with raw evidence links, method, before/after table, triangle reduction sources, changed files, cleanup, unchanged design, rejected approaches, and remaining limits.
- Distinguish desktop mobile emulation from a real phone and local transfer bytes from production network measurements. Do not commit, publish, or deploy without a separate request.
