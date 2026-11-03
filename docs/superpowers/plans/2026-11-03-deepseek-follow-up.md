# DeepSeek Follow-up Implementation Plan

> **For agentic workers:** Use the executing-plans workflow for this authorized continuation. Independent sign and statue tasks may run in parallel under dispatching-parallel-agents.

**Goal:** Verify the existing DeepSeek implementation and complete the two remaining documented visual changes.

**Architecture:** Preserve the existing courtyard, portal system and imported source model. Remove physical Welcome/Articles signs while retaining their reading cards; orient the complete About assembly toward the west entrance. Add an independently batched voxel angel monument at the documented mirrored scenery position without moving the imported horse.

**Tech Stack:** Three.js ES modules, BoxBatch, Node tests, Playwright, Python local preview.

**Spec:** Parent-folder `deepseek/2026-11-03-玻璃金字塔展牌朝向-工作记录.md` and `deepseek/2026-11-03-雕像与金字塔中轴.md`. The current user request authorizes proceeding with these previously deferred tasks.

## Constraints

- The original west glass opening is the only entrance; courtyard limits and swimming remain intact.
- About assembly at world (-6, 2.4), facing west, with matching support, carpet, obstacle, hotspot and light transforms.
- Welcome/Articles cards remain accessible from the Dock without obsolete physical station markers.
- Angel monument at (-62.6, -19.2), facing east, outside the walkable fence, with a 6 m base and approximately 11.4 m total height. Keep the original horse and source GLB unchanged.
- No new external services, real-time lights, deployment, push or unrelated engine changes.

## Tasks

- [x] Establish the current baseline with existing pure tests and browser checks; report verified completed work.
- [x] Implement the complete About assembly transform and remove Welcome/Articles physical stations. Verify reachability, collisions, card fallback and entrance views.
- [x] Create a procedural voxel angel monument and static inspection views. Verify its bounds, separation from the playable area and runtime batching.
- [x] Integrate both changes in world/build.js and update stale browser tests and project documentation.
- [x] Run focused pure tests, site/browser checks, swimming and portal round trips; inspect desktop/mobile screenshots.
- [x] Record actual results and remaining performance/metadata limitations. Do not represent old measurements as current success.
