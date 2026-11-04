# Project status and next work

Updated: 2026-11-04, Asia/Shanghai.

This is a standalone local prototype based on the frozen Homecraft 0.1.1
import. The current courtyard, portals, profile and friend directory are
implemented. Content, rendering budgets and public deployment are separate
follow-up work; functional acceptance does not certify those areas.

## Current implementation

- Four matching west-facing doors lead to the library, studio, `/friends/`
  directory and `/about/` profile. Dock buttons approach doors; walking through
  either face enters them. Reading cards remain clickable.
- The violet transition uses a shared boot script. Return checkpoints preserve
  the approach side; both BFCache and reloaded browser history are checked.
- The former friend lounge is replaced by a data-driven HTML directory. Its
  three entries remain explicitly marked as samples. The profile contains the
  five supplied account destinations and an intentionally blank biography.
- The imported courtyard, seven polygon pools, perimeter walk, artwork and
  mirrored Angel Room monument remain in place. Web-zip movement is removed.
- The pyramid slope, entry and capstone supply walking/landing surfaces.
  Low raised surfaces beside water can now hand walking movement to the pool;
  high outside ledges and airborne movement do not trigger this short dive.
- The former wind crystal is now a walnut music console with speakers, a
  turntable and an interactive sign. Its card accepts NetEase playlists and
  multiple local audio files. The observatory has not been replaced yet.

## Music station

The default playlist is the owner's `18559092586`, configured in
`world/music-source.js`. Only the playlist ID is saved; sharing tokens are
discarded. Loading the official player requires an explicit click and uses
`auto=0`. No music service is contacted on initial arrival.

Local playback uses a persistent native audio element: play/pause, seeking,
volume, a selectable queue, previous/next and automatic advance. Closing or
reopening cards preserves this element and the remote iframe. Switching
sources stops the other source, and a stop button remains available outside
the card. Files stay in the current browser tab and are not uploaded. Reloads
and portal navigations end playback; cross-page persistence is not implemented.

The record rotates only during actual local playback. The site cannot inspect
playback inside a cross-origin NetEase frame and does not claim to do so.
Live verification loaded the supplied playlist on desktop and at 390 px.
However, clicking play did not advance playback or produce a media request;
the official `st.music.163.com/browser-get/getBrowser.js` also raised a
cross-origin `device__browser_update` error in the embed. A standalone-player
probe did not establish playback either. NetEase integration is therefore
available with an original-page link, but successful NetEase audio playback is
not certified. Local audio decoding and playback were verified with real WAV
and MP3 media; other supported formats depend on the browser's codecs.

`tools/check-music.mjs` checks real local playback, queue changes, end-of-track
advance, record animation, source isolation, invalid links, persistence across
card closure, and desktop/mobile layout. The external response in this suite
is a deterministic fixture: it verifies integration, not NetEase streaming.

## Door-top descent regression

Descending above the west doorway at offsets near +/-3.8 to +/-4.6 m could
leave the player stuck. The imported surface drops from a door ledge toward
the hall floor. While falling, the player still called the ground-walking
solver using that landing floor's height, so the adjacent low glass rejected
horizontal movement even while the body was above it.

Air movement now checks collisions at the body's actual height and refreshes
the floor below after horizontal movement. This fixes the fall rather than
altering the imported model, doorway, pool geometry or shoreline rules.
`tools/check-entry-descent.mjs` reproduced 20 failures in 38 routes before the
fix. It covers both sides of the doorway, its centre and neighboring ordinary
slopes at desktop/mobile widths, plus the real W-key input path.

The 2026-11-04 acceptance passed the complete standalone suite, including 42
Node tests and 40 door-top descent checks. The added music and descent checks
also passed with software rendering. Native sign clicks open the music card,
and actual WAV/MP3 playback was verified at both viewport widths. The static
build passed. Existing scenery still exceeds the triangle budget; external
NetEase streaming retains the limitation described above.

## Shoreline regression

Walking along the pyramid's 0.4 m apron set the player's outside-surface id to
`pyramid`. The former pool-entry condition required that id to be empty, while
the ground solver refused to step onto unsupported water. As a result, the
player stopped near coordinate +/-18.66 instead of entering the nearby pool.

`engine/world/player.js` now accepts a grounded outside surface within 0.7 m
of the water level. The ordinary deck path retains its existing behavior.
`tools/check-shore.mjs` first reproduced 12 failing routes against the old
condition. Acceptance covers six apron approaches at each viewport, a high
fall that must stay airborne, and the real keyboard handler: 16 checks total.

The slope descent check stops below 5 m while still on the pyramid. Holding
the same direction beyond the base can now legitimately enter the pool; the
separate shore check verifies that continuation rather than requiring the
player to remain on the pyramid indefinitely.

Full swimming acceptance also exposed automatic routes cutting through low
glass on the way to the northern and eastern pools. The navigation grid now
supports an optional layout `blockedAt(x, z, feet)` predicate; this world uses
a fixed analytic glass footprint there. A real-grid regression first
failed on the old map, then passed with low glass blocked and the original
western doorway and northern shore still reachable. Worlds without the hook
keep their former behavior. This does not remove manual roof climbing.

The A* footprint is independent of model arrival order. The first Linux CI run
exposed the difference: sampling a loaded 0.4 m step as a ground obstruction
closed dry approaches, while an earlier startup left them open. A second Node
regression reproduces that load-order case. Exact imported entry details remain
handled by movement collision, not represented triangle by triangle in A*.

## Acceptance and build

Local acceptance completed on 2026-11-04 with exit code 0:

| Check | Result |
|---|---|
| Site metadata/engine drift | Passed with the three documented warning categories |
| Node tests | 40 passed, including the subsequent load-order regression |
| Desktop/mobile startup and Dock | Passed |
| Courtyard | 40 passed |
| Space journeys and props | 10 passed |
| Pool journeys, diving, exit and manual entry | All 7 pools passed |
| Portal/profile integration | 7 passed |
| Camera | 12 passed |
| History, with and without BFCache | Both passed |
| Raised shore entry, high falls and keyboard | 16 passed |
| Static build and built-site desktop/mobile smoke | Passed |

The build smoke served `dist/` separately from source. These local results do
not assert a GitHub Actions outcome or real-phone rendering performance.

Start the loopback preview, then run:

```powershell
python tools/serve.py 8765
npm run check:all -- http://127.0.0.1:8765/
```

The full command runs site checks, all Node test files, desktop/mobile startup,
the courtyard, space journeys, all seven pools, portal/profile integration,
camera regression, both history paths, the raised-shore and door-top descent
regressions, and the music station. It
stops on any failing command. Reports and screenshots are in `tools/.check/`
and are ignored by Git.

The browser launcher uses native D3D11 on Windows, Metal on macOS and
SwiftShader on Linux. `HOMECRAFT_SOFTWARE_GPU=1` selects SwiftShader locally;
`PLAYWRIGHT_CHANNEL=chromium` selects the installed Playwright browser in CI.
Desktop viewport emulation is not a physical-phone performance test.

Opening-camera acceptance advances the actual camera controller at fixed
simulation steps and asserts that it reaches its finished state. A slow Linux
software renderer must not turn 3.5 seconds of animation into a 30-second
functional timeout. This changes only the test harness, not production timing
or the rendering budget; low rendering throughput remains a documented limit.
The desktop portal/profile page is closed before starting the mobile case, so
completed worlds do not keep consuming the same software GPU during startup.

`bash tools/build.sh` builds static files into `dist/`, including the new
friend directory. It does not deploy unless `--deploy` is explicitly supplied.

## Automation and hosting

The Checks workflow uses the standalone acceptance command and a static build.
Retired template listing, listing-policy and engine-release automation no
longer references deleted tools. The listing issue form is removed as well.

Optional GitHub Pages hosting remains available only with `DEPLOY_PAGES=true`,
including manual workflow dispatch. No deployment variable was enabled during
this closeout; the repository reported `has_pages: false` when inspected.
Updating GitHub source does not constitute deployment.

## Remaining limits

- The complete view still draws roughly 652k-656k triangles against a 200k
  budget. The 12,761,876-byte scenery GLB has not been reduced to the requested
  3 MB target. Performance work is not marked complete.
- The scenery already has only POSITION attributes on disk, with no normals,
  UVs or compression extensions. Runtime normals and vertex shading are still
  generated; the older task sheet's attribute-stripping savings need to be
  re-evaluated before implementation.
- The existing resolution governor still has absolute DPR floors and no
  recovery path. Target-device frame times and a complete comparable transfer
  measurement remain pending.
- Three articles, project displays and three friend entries remain examples;
  biography, site URL, intro and owner branding remain unfinished or blank.
- The source provenance still records unestablished third-party redistribution
  permissions. This closeout did not establish new permissions.

## Next-stage requests, recorded but not implemented

The owner supplied these requests on 2026-11-04:

- [ ] Update the spaces inside the portals, starting with the library and
  studio layouts, furnishings and content presentation. Preserve navigation,
  return behavior and mobile access.
- [ ] Add a pattern to the empty forecourt in front of the pyramid. Decide the
  artwork, coverage and palette before implementation; keep the west entrance,
  paths and pool edges clear.
- [x] Replace the crystal with the courtyard music console. NetEase streaming
  remains subject to the external-player limitation above.
- [ ] Replace the observatory with a visitor-message location. The proposed
  design is a postcard kiosk with a short message, optional nickname and date,
  plus readable previous messages. Shared messages require persistent storage
  accessible by other visitors. The current site has no such backend;
  localStorage would only show messages in the same browser. This is a proposal,
  not an implemented guestbook or a deployed service.

The room redesign, floor artwork and postcard kiosk remain future work. The
music console was implemented after the earlier shoreline closeout.
