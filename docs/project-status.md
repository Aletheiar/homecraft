# Project status and next work

Updated: 2026-11-04, Asia/Shanghai.

This is a standalone local prototype based on the frozen Homecraft 0.1.1
import. The current courtyard, portals, profile, friend directory and guestbook are
implemented. Content, rendering budgets and public deployment are separate
follow-up work; functional acceptance does not certify those areas.

The 2026-11-04 hall integration includes the latest crouched Devil Room
sculpture, three-door layout and entrance buffer, central armillary, and
industrial GitHub workstation. Full local acceptance passes with 55 Node
tests and all browser suites. See the
[integration record](research/2026-11-04-hall-release.md) for scope and
validation. Earlier local-only publication notes describe their original
implementation checkpoints.

## Current implementation

- The local central exhibit follows the larger plan A armillary design: three
  graduated brass bands, a cyan crystal with an inner kernel and edge ribs, a
  bolted bed-plate with a four-arm fork, two stone tiers and restrained
  circular inlay, carrying a restrained museum glow: the crystal lights from
  its inner kernel, the plinth corners hold dim amber panes, and the floor
  emblem gains one additive catch-light. The crystal glow is a constant: a
  breathing version measured only a 2.3% swing in screen luminance, so it was
  removed rather than tuned. Each driven band also carries one baked comet arc
  (pale cyan outside, warm gold inside) that rides the band's own axle, adds a
  single draw call apiece and writes nothing per frame. It is committed locally
  but not uploaded. See the
  [implementation and checks](research/2026-11-04-armillary-plan-a.md), the
  [precision pass](research/2026-11-04-armillary-precision.md), the
  [motion pass](research/2026-11-05-armillary-motion.md), the
  [glow pass](research/2026-11-05-armillary-glow.md) and the
  [trail pass](research/2026-11-05-armillary-trails.md).

- Three matching west-facing doors lead to the library, `/friends/` directory
  and `/about/` profile: the reading room closes the hall axis from the east,
  the directory and profile doors flank the west entrance. Dock buttons approach
  doors; walking through either face enters them. Reading cards remain
  clickable. The studio has no door in the hall; its card link still opens the
  studio room directly.
- The hall is laid out as a museum foyer: a compass-and-orbit floor emblem
  under the low plinth and armillary exhibit, an industrial three-screen
  workstation in the north-east corner (the main display opens the owner's
  GitHub profile through the existing external-link path) and a two-bench
  lounge in the south-east corner. The workstation adds a ventilated PC,
  short server rack, keyboard, headphones and dark seat within its original
  corner; its terminal and hardware panels are explicitly decorative simulations.
  Precise picking rejects rays occluded by either auxiliary display housing.
  The other furniture, planters and shelves keep their walnut/travertine
  vocabulary and the walking lanes stay clear. See the scoped
  [workstation record](research/2026-11-04-netrunner-workstation.md).
  The exhibit plinth is real floor
  height (`layout.js` `floorAt`), not a collider: both low stone tiers can be
  crossed without an invisible full-height obstacle. The enlarged armillary
  replaces the former small glass pyramid: three graduated brass bands surround
  a pale cyan octahedral core. The local plan A revision adds a second stone
  tier and restrained orbital inlay; the precision pass adds the graduations,
  riveted band borders, the four-arm fork over a bolted brass bed-plate and a
  five-degree floor dial; the motion pass pins each band on a diametral axle
  carried by the next hoop out, so the outer band turns once in 20 s, the
  middle in 40 s, the inner in 60 s and the crystal in 10 s, while the mounting
  stays still. The glow pass keeps every lamp in the shader: the crystal is
  emissive with a breathing kernel, the four corner lanterns are dim emissive
  panes that light nothing, the emblem adds one static additive wire layer, and
  the brass is retuned to darker roughness with brighter rims. No light was
  added to the scene. See the scoped
  [plan A record](research/2026-11-04-armillary-plan-a.md) and
  [precision pass](research/2026-11-04-armillary-precision.md) and
  [motion pass](research/2026-11-05-armillary-motion.md).
- The violet transition uses a shared boot script. Return checkpoints preserve
  the approach side; both BFCache and reloaded browser history are checked.
- The former friend lounge is replaced by a data-driven HTML directory. Its
  three entries remain explicitly marked as samples. The profile contains the
  five supplied account destinations and an intentionally blank biography.
- The imported courtyard, seven polygon pools, perimeter walk, artwork and
  Angel Room monument remain in place. Its opposite horse monument is now a
  matching Devil Room monument. Web-zip movement is removed.
- The pyramid slope, entry and capstone supply walking/landing surfaces.
  Low raised surfaces beside water can now hand walking movement to the pool;
  high outside ledges and airborne movement do not trigger this short dive.
- The former wind crystal is now a walnut music console with speakers, a
  turntable and an interactive sign. Its card plays a curated public playlist
  and visitor-supplied local files; no music service is contacted. Playback,
  queue and volume stay in the page.

## GitHub guestbook

The second forecourt prop is a walnut postcard board and green postbox at the
original observatory location. Clicking its sign opens the standalone
`guestbook/` page inside the existing card. Text/WebGL fallback links and the
card's pop-out link open the same page independently.

The page uses the official giscus client and the public repository
`Aletheiar/homecraft`. Discussions were enabled for this feature, and the owner
confirmed installing the giscus GitHub App for that repository. Repo/category
IDs were read from GitHub and are stored in `guestbook/config.js`. A specific,
strict mapping term (`庭院留言簿`) is shared by every local port, query string
and deployed URL; it is not derived from the page path. giscus creates the
discussion when a visitor first submits a comment. No demonstration discussion
or comment was posted during implementation.

Anyone can read the guestbook. Posting requires GitHub sign-in and the visitor's
giscus OAuth authorization. Identity, comments, replies and persistence are
handled by GitHub/giscus, not browser-only storage. The site contains no OAuth
secret, personal access token or custom authentication backend. Its inherited
email mailbox remains unconfigured and is a separate feature.

The existing iframe sandbox now allows top-page navigation after a user click
for same-origin embedded pages. This is needed because the actual giscus login
link targets `_top`. Remote embeds retain the top-navigation restriction.
The authenticated return URL goes to the standalone guestbook; its return link
leads back to the courtyard. The official client handles its login session.

Live desktop and 390 px checks showed the real zero-comment state, a
login-gated editor and the GitHub sign-in link. Clicking that real link from
both the standalone page and the nested courtyard card reached
`https://github.com/login`. No credentials were entered, so authenticated
submission, editing and another account's message are not claimed as tested.

`tools/check-guestbook.mjs` checks native sign picking, shared mapping, offline
status/retry and GitHub links, responsive layout, and trusted/remote iframe
navigation behavior. It intentionally blocks the external service to verify
failure handling; real service evidence is separate. The static build includes
`guestbook/`, and ordinary scene checks isolate the external widget network.

## Courtyard monuments and gallery

The original horse opposite the Angel Room monument has been replaced with an
original voxel interpretation of Isaac's Devil Room statue. The pair stands at
`(-62.6, -19.2)` and `(-62.6, 19.2)`, faces the pyramid, shares matching bases
and one opaque furniture batch, and stays outside the playable fence. Combined
procedural geometry is 6,552 triangles. The source scenery GLB is unchanged;
runtime removal excludes 3,035 triangles within the measured horse bounds.
Triangles spanning outside those bounds remain, including palace and ground.

The two abstract hanging prints now display the owner's chosen characters:
Slay the Spire 2's Defect on the left and the first game's Watcher on the right,
as seen from the western entrance. Both are generated fan illustrations with
ivory paper, restrained colors and glass geometry matching the unchanged
central Miku artwork. Existing frames, cables and dimensions remain; the Miku
panel has more than four times each side panel's area. The side prints remain
decorative and add no new interaction targets. Two 512 x 640 WebP textures add
67,382 bytes. References and measured geometry are recorded in
`docs/research/2026-11-04-courtyard-decor.md`.

The owner concurrently updated the music console and opening handoff. Those
changes were preserved. The current complete acceptance command passes 47
Node tests and all browser suites, including `check-opening`, the guestbook,
the updated music controls and `check-decor`. The static build also passes.
Existing scenery still exceeds the triangle budget; these checks do not mark
performance work complete.

## Music station

The console has two shelves. **庭院唱片** is a curated public playlist of 27
tracks (115 minutes) served from `assets/music/` and listed in
`world/music-library.js`; every visitor can play it after the browser's required
press. **本机试听** holds audio chosen with the card's file or folder picker (or
dropped onto it) as private object URLs in the current tab. Nothing is uploaded
and no music service is contacted. Visitor files are never uploaded. Playback
was verified with real WAV and MP3 media; other formats depend on the browser's
codecs.

The public playlist is edited only in code and rebuilt with the site; the static
build copies `assets/music/` through `tools/build.sh`. Files load lazily on first
play, so opening the card does not download the collection. Visitors' local
files never appear in the public list. Browsers block audible autoplay, so the
page does not attempt to start music on load.

The card was refined with a record-sleeve hero, a grooved vinyl disc, a brass
tonearm, custom sliders, tabbed shelves with real durations and a bottom fade on
scrolling lists. It stays usable from 1280x800 down to 320x700 and 360x640: on
short screens the hero and shelf tighten, the drop hint hides and the lifetime
note becomes one line.

A persistent audio element lives beside the card body and survives closing or
reopening the card. It provides play/pause, previous/next, scrubbing, volume and
mute, shuffle, repeat (list, one, off), automatic advance and a queue shared by
both shelves. A floating pill outside the card stops the music, and the record
turns only during actual playback. Reloads and portal navigations end playback;
cross-page persistence is not implemented.

The NetEase playlist import, its iframe and `world/music-source.js` were removed
on 2026-11-04 at the owner's request. The card never requests `music.163.com`.

`tools/check-music.mjs` checks the 27-track public manifest, tab separation,
local import through both pickers, real WAV/MP3 playback, queue changes, seeking,
repeat modes, volume persistence, record animation, lifetime across card
close/reopen, desktop/mobile/short-screen layout, and the absence of NetEase
requests or markup. Public audio is stubbed during the check so CI does not
stream the collection. `tools/music.test.mjs` covers time formatting, filename
parsing and audio filtering.

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

The 2026-11-04 acceptance passed the complete standalone suite, including 47
Node tests and 40 door-top descent checks. The added music and descent checks
also passed with software rendering. Native sign clicks open the music card,
and actual WAV/MP3 playback was verified at both viewport widths. The static
build passed. Existing scenery still exceeds the triangle budget; that warning is
informational.

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
camera regression, the opening handoff, both history paths, the raised-shore and
door-top descent regressions, the music station and the GitHub guestbook. It
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
The handoff check exercises the first input: when it cuts the opening short, the
world marks the opening as introduced and never fires the deferred pyramid
overview, so the camera cannot fly back to the starting view. An untouched
opening still reaches that overview, and a click dismisses it normally.
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

## Requested follow-up work

The owner supplied these requests on 2026-11-04:

- [x] Redesign the glass pyramid hall interior: three doors, a centre floor
  emblem and exhibit, the north-east workbench and the south-east lounge. The
  studio door was removed from the hall; studio content stays reachable from
  its reading card.
- [ ] Update the spaces inside the portals, starting with the library and
  studio layouts, furnishings and content presentation. Preserve navigation,
  return behavior and mobile access.
- [ ] Add a pattern to the empty forecourt in front of the pyramid. Decide the
  artwork, coverage and palette before implementation; keep the west entrance,
  paths and pool edges clear.
- [ ] Consider an entrance surround or lintel before adding a physical door.
  Prefer a thin stone/brass frame following the existing opening, preserving
  its headroom and walking width. A physical swinging/sliding door would need
  an explicit interaction and collision design before implementation.
- [x] Replace the horse with a Devil Room statue opposite the Angel Room prop.
- [x] Replace both abstract side prints with the chosen Defect/Watcher pair.
- [x] Replace the crystal with the courtyard music console. NetEase import was
  removed on 2026-11-04; the console now serves a curated 27-track public
  playlist plus private local imports.
- [x] Fix the first-click opening handoff. A click or drag that cuts the opening
  short now marks the opening as introduced and suppresses the deferred pyramid
  overview, so the camera no longer returns to the starting view on the first
  input.
- [x] Replace the observatory with a visitor-message location. The postcard
  kiosk now embeds the GitHub-authenticated guestbook described above.

The room redesign, entrance treatment and floor artwork remain future work.
For the forecourt, a restrained geometric inlay along the entrance axis is
preferred over a full-surface pattern; pool edges and circulation stay clear.
