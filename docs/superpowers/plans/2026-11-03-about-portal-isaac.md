# About Portal and Isaac Statue Revision

**Goal:** Replace the About kiosk with a consistent fourth portal leading to a readable profile page, clear the furniture between the library bookcases, and replace the generic angel silhouette with a recognizable Binding of Isaac room statue.

**Authorized requirements:** Current user screenshots and request, followed by profile details: Aletheia; leave biography empty; GitHub Aletheiar; Zhihu 今夕何夕 at https://www.zhihu.com/people/69-57-39-60; Shuiyuan URL supplied verbatim. The user explicitly selected the Angel Room statue.

**Architecture:** Keep three enclosed rooms and their existing engine. About becomes a normal independent HTML page using the same journey checkpoint/transition modules; its return link restores the original hub approach. Four identical frames face the western opening, in paired rows at x=-5/9 and z=-7/7. Profile content is configured in a small local module. Sculpture remains procedural batched geometry unless a suitable usable existing room-statue asset is found.

## Tasks

- [x] Research actual angel/devil room statue references and existing downloadable projects; record precise matches and unsuitable alternatives.
- [x] Build an accessible responsive About page using only supplied identity/account details; preserve one-shot return behavior and reduced-motion settings.
- [x] Remove the standalone About kiosk and the desk/stools between library bookcases; align four portal positions and physical stations.
- [x] Replace the generic angel with a game-reference-driven statue, inspect isolated front/side views and actual courtyard placement.
- [x] Update tests to the new specification; verify disabled F, walking-only About entry, portal effects/return, ordinary rooms, mobile profile, navigation and scene budgets.
- [x] Deliver the preview, screenshots, research findings and remaining limits; keep local changes uncommitted and unpublished.

**Steering incorporated:** Disable all keyboard interaction prompts and native world-directory controls. Dock/reading links approach a gate; only a physical crossing enters. Preserve pointer article reading and accessible text fallback. Browser Back must work with and without BFCache.
