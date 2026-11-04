# Hall integration, 2026-11-04

The owner requested that all current changes be organized into commits and
uploaded to GitHub, explicitly including the central armillary and industrial
workstation. Integration targets the repository's existing `main` branch.
The topic branch is `codex/netrunner-workstation`; integration uses a fast
forward and a normal push, without rewriting existing history.

## Commit groups

1. `feat(hall): reorganize interior and buffer entrance portals`
   (`ba3edac`): three-door hall layout, west-entrance buffer, local floor
   emblem, corner furnishings, low central-plinth support and updated routes.
2. `feat(statues): refine crouched Devil Room sculpture`
   (`bb84da0`): latest rounded face, crouched body, bent wings, procedural
   provenance and screenshot coverage.
3. `feat(hall): replace central pyramid with an armillary sphere`
   (`49b3ba1`): three bronze rings, transparent cyan core, unchanged low stone
   base, slow runtime animation and dedicated acceptance.
4. `feat(workstation): add industrial three-screen GitHub desk`: dark
   block-built workstation, simulated terminal/hardware displays, safe main
   GitHub link, precise auxiliary-housing occlusion, local colliders and tests.

The existing seven local commits above the previously fetched remote main
are retained too. They cover the rectangular E8 forecourt, random-start ordered
music playback, sculpture details, exterior bench/side-panel removal, distinct
Friends icon and their regression checks. The remote had no divergent commits
when fetched before integration.

Task-start snapshots were used to stage the hall, armillary and workstation
changes independently without replacing the working files or discarding
uncommitted changes. Earlier implementation records describe their original
local-only checkpoints; this integration supersedes those publication notes.
No generated build directory, dependency directory, local browser reports,
screenshots, private music files or parent-workspace archives are committed.

## Final local acceptance

```powershell
npm run check:all -- http://127.0.0.1:8765/
D:/Git/bin/bash.exe tools/build.sh
git diff --check
```

The complete `check:all` run passes: site checks, 55 Node tests, startup/Dock,
pyramid, rooms, swimming, follow-up interactions, camera, opening handoff,
history return, shore entry, 40 door-top descent routes, music and autoplay,
guestbook, decorations, E8 forecourt, armillary and workstation. Desktop and
narrow/touch cases run where supported by the individual suites. Both
armillary and workstation screenshots were inspected during implementation.
The local build succeeds with about 152 MB output, without a deployment flag.

Existing informational warnings remain: missing directory intro, template
logo, intentionally maintained engine drift, and the overall triangle budget.
The reference forecourt view records 60 calls, 665,240 triangles and 24
textures. Local rendering checks do not establish physical-phone performance.

## Remote verification boundary

A push to main invokes the existing Checks workflow. The optional Pages
workflow deploys only when repository variable `DEPLOY_PAGES` is `true`;
uploading source does not enable Pages. Remote branch SHA and Actions outcomes
must be checked after publication, and are reported separately from the local
acceptance recorded here. This change does not alter either workflow.
