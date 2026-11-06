# NewHeaven engineering performance review

Date: 2026-11-06. Work is local and uncommitted. Existing scene, reading interface, and workstation changes were preserved. This review describes the performance changes only, not the entire dirty working tree.

## Outcome and limits

The dominant opaque palace facade now uses four spatial regions near the player and its original single batch beyond 70 m. Both levels contain exactly the same surfaces, vertex colors and materials. They share vertex attributes and one index buffer; this is a batching switch, not a lower-detail model. Indoor triangle submission falls by 33–51% in the required views. The overview retains full geometry and avoids the extra region calls.

Two GLBs are 999,480 bytes smaller after exact zero-area cleanup and index packing. Only 722 authored zero-area triangles were removed. No nondegenerate surface, glass, grille, sculpture, furnishing or interaction was removed. Three planar portal veils now use one transparent pass; the main pyramid glass remains transparent and two-pass. Weather updates avoid three temporary allocation sites per frame while retaining the public snapshot getter.

Interactive FPS remains approximately 240 on this desktop. **A general interactive FPS or whole-frame GPU improvement has not been established.** Normal asynchronous GPU timings actually increased between the separate before/after sessions; they are included below. Same-page alternating batch tests show a smaller, isolated GPU drawing benefit for indoor culling. The full panorama remains about 689k submitted triangles and exceeds the original 200k budget. Common overview calls also exceed 60. No real-phone performance claim is made.

The original 500 KB compressed 3D initial-load target also remains unmet: the verified local gzip build is about 5.29 MB excluding audio. Automatic phone text entry still avoids loading the 3D scene; it is covered by the existing phone acceptance suite.

## Baseline and method

Read `AGENTS.md` before changes. Raw evidence is under ignored `tools/.check/performance/`; compact results persist in [performance-data.json](2026-11-06-performance-data.json). Reproduce against a running source preview with:

```sh
BENCH_FRAMES=600 node tools/benchmark-scene.mjs http://127.0.0.1:8765/ label
```

On PowerShell, set `$env:BENCH_FRAMES='600'` first. The benchmark records Chrome/GPU identity, actual viewport, quality/DPR, calls, triangles, RAF interval distribution, main-loop CPU submission time, available WebGL timer samples, resource body bytes, screenshots, and scene inventory. It pins morning/clear weather, explicit 3D mode, fixed cameras and resolution; disables the resolution governor only in the benchmark; warms 1.5 s; samples two rounds of at least 600 frames per view. External requests are blocked consistently. Audio body bytes are recorded separately because the existing arrival player chooses a random track.

Authoritative comparison: `before-final/report.json` versus `final/report.json`, Chrome 156.0.8078.81, ANGLE D3D11, NVIDIA RTX 5070 Laptop GPU. Desktop 1440×950 / DPR 1; phone emulation 390×844 / render DPR 1.25, browser device scale 2. Shadow resolution remains the normal desktop/mobile value. Cameras are declared in the tool and stored in each result.

The laptop switched GPU/display modes during the investigation. The initial `before/` Intel UHD ~60 Hz run and the first NVIDIA `spatial/` run are **not** a valid before/after timing pair. They remain useful as separately labeled diagnosis. NVIDIA baselines were re-established before the final comparison. Desktop scheduling, GPU clocks and unrelated host load were not isolated; do not infer a percentage speedup from separate-session CPU means or loading times.

RAF FPS is refresh capped; frame interval includes idle time. CPU means include the instrumented production loop, WebGL command submission and timer/counter instrumentation, not GPU completion. Normal GPU timer queries include scheduling effects and were unstable across sessions. Paused-camera batch tests draw 60 times, use GPU elapsed queries, and alternate whole/region geometry eight times in AB/BA order in the **same page**. Those tests measure rendering throughput, not user-visible FPS. Renderer call/triangle counters describe the warmed main pass; they exclude the one-time static shadow bake. No shadows or lights were disabled.

## Six required views

Values are before → after. FPS uses the two round means; P95 is the larger round P95. Source-preview body bytes exclude streamed audio.

| View | Calls | Submitted triangles | FPS | Mean RAF ms | P95 RAF ms | CPU loop ms | Normal sampled GPU ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Exterior panorama | 70 → 67 | 689,880 → 689,156 | 240.0 → 240.0 | 4.167 → 4.167 | 4.3 → 4.3 | .535 → .479 | 2.749 → 3.070 |
| Central armillary | 48 → 48 | 667,618 → 448,258 | 238.6 → 239.9 | 4.192 → 4.168 | 4.3 → 4.4 | .437 → .399 | 2.790 → 2.949 |
| NE workstation | 30 → 31 | 653,062 → 433,704 | 238.8 → 240.0 | 4.187 → 4.167 | 4.4 → 4.3 | .590 → .374 | 2.291 → 2.746 |
| SE Ori | 31 → 31 | 664,470 → 326,443 | 239.4 → 238.4 | 4.177 → 4.195 | 4.3 → 4.4 | .842 → .375 | 2.130 → 2.884 |
| Library interior | 21 → 20 | 4,216 → 4,214 | 238.4 → 239.8 | 4.194 → 4.170 | 4.4 → 4.4 | .435 → .206 | 2.025 → 2.358 |
| Explicit mobile 3D panorama | 70 → 67 | 689,880 → 689,156 | 239.2 → 240.0 | 4.181 → 4.167 | 4.3 → 4.3 | 1.065 → .460 | 2.304 → 3.172 |

The table does not demonstrate lower normal GPU frame time; preserving the raw increase is intentional. Isolated same-page GPU batch medians for whole facade → regions are .287 → .253 ms at the armillary (12%), .302 → .280 ms at the workstation (7%), and .269 → .227 ms at Ori (16%). Absolute savings on this GPU are small. The distant overview automatically selects the single batch. Mobile batch results on this desktop are not evidence of a phone benefit.

Screenshots were captured for every required view, before and after:

| View | Before | After |
| --- | --- | --- |
| Exterior | [PNG](../../tools/.check/performance/before-final/exterior.png) | [PNG](../../tools/.check/performance/final/exterior.png) |
| Armillary | [PNG](../../tools/.check/performance/before-final/armillary.png) | [PNG](../../tools/.check/performance/final/armillary.png) |
| Workstation | [PNG](../../tools/.check/performance/before-final/workstation.png) | [PNG](../../tools/.check/performance/final/workstation.png) |
| Ori | [PNG](../../tools/.check/performance/before-final/ori.png) | [PNG](../../tools/.check/performance/final/ori.png) |
| Library | [PNG](../../tools/.check/performance/before-final/library.png) | [PNG](../../tools/.check/performance/final/library.png) |
| Mobile 3D | [PNG](../../tools/.check/performance/before-final/mobile.png) | [PNG](../../tools/.check/performance/final/mobile.png) |

These local artifacts are intentionally excluded from the web distribution and Git by `tools/.check/`. The benchmark regenerates them. Track titles and animated phases can differ between separate screenshot sessions.

## Bottleneck evidence and geometry decisions

The input GLBs contained 579,388 scenery triangles in five meshes and 41,609 courtyard triangles in six meshes. Scenery accounted for 93% of their combined authored triangles. The dominant sandstone facade alone contained about 455k triangles. Large material-wide bounding spheres kept most palace geometry submitted even when the camera viewed a small corner of the hall.

In the initial Intel UHD exterior isolation run:

| Visible scene | Calls | Triangles | Sampled GPU mean ms |
| --- | ---: | ---: | ---: |
| Full scene | 70 | 689,880 | 4.21 |
| Scenery temporarily hidden | 65 | 113,527 | 2.99 |
| Courtyard temporarily hidden | 63 | 636,133 | 4.16 |
| Imported glass temporarily hidden | 68 | 665,580 | 4.08 |

These were diagnostic hiding operations in the browser only; nothing was deleted or hidden in production. They identify scenery as a larger opportunity than the grille, central exhibit or small furniture in this view. Raw evidence: `before/report.json` and `tools/.check/perf-geometry/` analysis reports.

The existing preparation pipeline already unions coplanar surfaces. Exact additional unions saved only about 1.7k triangles and would require preserving interpolated baked shade, holes and directional coverage. There were no nondegenerate exact duplicate triangles. The 16 duplicates found were themselves zero-area. No model triangle was wholly below the exterior lawn plane. Cross-material coplanar coverage did not establish invisibility and was retained. Consequently, no speculative buried-face deletion, lossy decimation or global merge was used.

Four 128 m grid regions were chosen for the dominant opaque facade. Finer 32 m partitions improved theoretical culling but increased scenery batches from five to twenty. The core courtyard, glass and collision sampler stay intact. Normals and directional colors are computed **before** partitioning, and shared without recomputation. Region bounds enclose only referenced vertices; using automatic bounds on the shared full-position array would undo the culling benefit. Near/whole batches use one shared index attribute with different draw ranges, avoiding duplicate GPU buffers. The original full batch is selected beyond 70 m, so panorama geometry does not pay four calls.

Most frame triangle reduction comes from omitting off-frustum regions, not deleting authored detail. Raw scenery loses 722 exact zero-area triangles; four were already in the existing horse cut, so the rendered scene loses 718 unique degenerate triangles. Three visible portal veils save another six submitted triangles / three calls through single-pass drawing. No authored courtyard triangles are removed.

The main glass remains DoubleSide/two-pass because changing ordering across overlapping panes was not justified. Opaque imported material winding is not proven suitable for blanket FrontSide conversion. Existing static sun shadows, practical baked lighting, water shaders, armillary animation, Ori, Isaac statues and all quality defaults remain. ShaderMaterial already uses single-pass rendering in this vendored Three.js; adding that flag to water or armillary trails would save nothing.

## Loading, cleanup and caching

| Asset | Original raw bytes | New raw bytes | New built gzip bytes |
| --- | ---: | ---: | ---: |
| Courtyard GLB | 1,986,816 | 1,737,044 | 403,371 |
| Scenery GLB | 12,761,876 | 12,012,168 | 3,983,367 |
| Ori GLB, unchanged | 243,748 | 243,748 | 123,595 |

Index values, positions, UVs, image bytes, materials and node hierarchy are preserved by the offline cleanup. Ten index accessors now use uint16; the dominant facade still requires uint32. The tool defaults to dry-run and requires `--write` for mutation. `assets/models/provenance.json` retains upstream attribution and records input/output hashes, counts and the optimization method. Regeneration starts with the existing `prepare-pyramid.py`, then the bounded optimizer; refresh the provenance output fields when regenerating assets.

The fixed source-preview scene body totals are 17,067,508 → 16,071,473 bytes, excluding audio; library is 1,384,461 → 1,384,613 bytes. This is local uncompressed resource accounting, not a production bandwidth test. The exact attributable GLB saving is 999,480 bytes. Completed audio requests made the final observed total about 19.11 MB at exterior/mobile and 19.02 MB at the workstation; comparable other hub views were 16.07 MB. Baseline completed-body totals were 17.07 MB with no completed audio body recorded. Random selection and autoplay therefore make those inclusive totals unsuitable for attributing an asset optimization. Per-view totals and media bytes remain in the raw reports; unfinished streams are not complete traffic accounting.

The build now emits `.glb.gz` / optional `.br` siblings. The three active GLBs total 13,992,960 raw bytes or 4,510,333 gzip bytes. Compression does not change triangles, materials, decoded data or FPS. An actual local built-site negotiation fixture (`node tools/check-build-loading.mjs`) verifies correct `Content-Encoding`, model type, `Vary`, decoded lengths, and successful GLTF loading in fresh browser contexts. Across three alternating runs, built initial non-audio body transfer was **15,675,252 raw versus 5,294,452 gzip bytes** (66.2% smaller), with identical decoded totals. Local ready-time medians were about 1,004 versus 976 ms; three localhost samples are insufficient to claim a production load-latency gain. The deployed host still needs verification; simply uploading compressed siblings is insufficient.

Four proven source-only files are excluded from `dist`, saving 2,324,140 raw distribution bytes: `assets/gallery/miku-glass.png`, `defect-glass.webp`, `watcher-glass.webp`, and `assets/demo-site.html`. The active Miku WebP remains. Historical research explicitly records the retired Defect/Watcher panels; acceptance checks confirm no requests for them. Originals remain in source for editing/provenance. This exclusion changes package contents, not current initial downloads. Compressed siblings can increase total on-disk distribution size; the final build reports 153 MiB.

The build includes top-level `LICENSE`, preserves model/vendor attribution and active Markdown, and excludes tools, docs and node_modules. All 27 public music tracks are manifest-referenced; no tracks or core model assets were deleted. No shipped runtime module was proven dead. Only the unused `THREE` import and `PALE` constant were removed from `world/furnish.js`.

Deployment guidance requires revalidation for mutable filenames and proper precompression negotiation; no unsafe immutable policy was introduced for unhashed assets. No global Three/model preload was added, so automatic mobile text entry remains lightweight. Existing texture atlases, cached Ori load Promise and delayed scenery load remain. The conditional marble-texture opportunity was deferred because a robust generic lazy path would require broader material/build API changes.

## Visuals, resources and protected interactions

All six final screenshots were inspected. No perceptible design change was observed. Same-pose WebGL framebuffer checks compare whole versus region rendering and double versus single portal passes at exterior, armillary, workstation, Ori and both portal sides. Initial strict comparisons intermittently found one to four differing channels; one example was a pixel's red channel changing 136 → 137. Warm-up, a frozen render-time performance clock, and unchanged-configuration repeat captures are included. Full-frame checks allow at most eight pixels out of 1.37 million, with a one-level channel difference on native rendering. SwiftShader also fluctuated on unchanged-scene repeats (up to seven 8-bit levels at isolated background pixels), so its explicit full-frame bound is eight levels at eight pixels. The maximum recorded final software batching difference is eight levels at two pixels. These bounds do not permit silhouette changes or broad color shifts.

The three portal surfaces are additionally isolated from the changing background and must match exactly between double and single passes on both backends. Actual repeat, batching, full-scene portal and isolated-portal differences, pixel examples, GPU identity and tolerance are retained in `visual-resource-invariants.json` and `visual-resource-invariants-software.json`. This is finite viewpoint coverage, not proof for every possible camera. Software raster validation is not a phone or integrated-GPU performance test.

The resource check warms both batching modes and switches them 60 times at each camera. GPU counters plateau at 84 geometries / 28 textures; each active model is requested once. Shared vertex and index buffer identities are verified separately. This checks the changed batching path for growth; it is not an exhaustive browser/process leak audit. Static inspection did not establish a separate unbounded GPU-resource leak.

The existing full acceptance covers movement, flight, collision, swimming, camera obstruction, minimap, arrival, three walking portals and return history, central armillary animation, workstation/chair/screens, Ori, outdoor decorations/statues, music and persistent 25% initial-volume behavior, GitHub guestbook embed configuration, library content and phone text-mode navigation. No live GitHub message was posted.

## Changed files in this optimization

- Geometry/runtime: `world/scenery.js`, `world/pyramid.js`, `world/portals.js`, `world/furnish.js`, `engine/main.js`, `engine/world/weather-fx.js`.
- Assets/provenance: `assets/models/newheaven-courtyard.glb`, `assets/models/newheaven-scenery.glb`, `assets/models/provenance.json`.
- Build/hosting: `tools/build.sh`, `docs/deploy.md`.
- Measurement/verification: `tools/benchmark-scene.mjs`, `tools/optimize-newheaven.mjs`, `tools/optimize-newheaven.test.mjs`, `tools/scenery.test.mjs`, `tools/weather-fx.test.mjs`, `tools/check-scenery.mjs`, `tools/check-build-loading.mjs`, `tools/check-all.mjs`.
- Documentation: `docs/superpowers/plans/2026-11-06-newheaven-performance.md`, this review and `2026-11-06-performance-data.json`.

## Validation and remaining work

- `npm run check -- http://127.0.0.1:2823/`: passed. Default opening camera still reports about 75 calls / 689k triangles; these are informational budget warnings, not the locked benchmark camera values.
- `npm run check:all -- http://127.0.0.1:2823/`: passed 89 Node tests and the 23 existing browser suites. The new scenery/resource suite was run separately and added to future `check:all` runs.
- `node tools/check-scenery.mjs http://127.0.0.1:2823/`: passed bounded pixel-rounding, exact portal-pixel, GPU-counter plateau and single-model-request assertions.
- `HOMECRAFT_SOFTWARE_GPU=1 node tools/check-scenery.mjs http://127.0.0.1:2823/`: SwiftShader passed the recorded backend-specific full-frame tolerance, exact isolated-portal pixels and resource assertions. Initial overly strict whole-frame comparisons failed on background variation; this is documented above rather than reported as a model defect or exact frame identity.
- `npm run build`: passed, minified modules produced, 153 MiB distribution. Independent artifact checks verified gzip round-trip equality, required license/active content, four explicit exclusions and development-directory exclusion.
- `node tools/check-build-loading.mjs`: passed six fresh-context built-site loads, raw/gzip negotiation and browser body-size assertions.
- `git diff --check`: no whitespace errors; existing CRLF normalization notices are unrelated worktree warnings.

The three known metadata/engine-drift warnings remain as required by AGENTS.md. No metadata was invented, engine customizations reverted, quality tier forced, commit created, publication enabled or deployment performed.

Next useful work is controlled target-device profiling: measure a real integrated-GPU session and actual phone, verify production cache/compression headers, then decide whether finer opaque regions or carefully authored distant-facade LODs justify added calls/storage. Dense window/grille silhouettes cannot safely be deleted just to reach 200k. Main glass overdraw remains a possible bottleneck requiring angle-specific visual evidence. Native-module loading waterfalls and generic lazy procedural marble generation are separate future opportunities; no benefit is claimed for them here.
