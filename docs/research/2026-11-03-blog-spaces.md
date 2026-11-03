# Content spaces in live Homecraft sites

Checked on 2026-11-03, approximately 14:25-14:31 Asia/Shanghai.

## Evidence and limits

This review fetched the five first-party homepages below and followed their active HTML import maps to the deployed world build and layout modules. All five homepages and those modules returned HTTP 200 with the expected HTML or JavaScript content through Python `requests`. Relevant furniture modules and embedded pages were also inspected. No browser interaction, iframe rendering, authentication, form submission, mobile performance, or article publication was tested.

The findings describe deployed markup and source-supported behavior. They do not establish how the owners edit files, whether a private CMS exists, or whether an iframe will display successfully. Some hosts return their homepage for missing paths, so an HTTP 200 alone was not treated as proof of a JavaScript module.

The web reader could open Terry and HEIKEJI, but could not open Jiang and rsliyu. For ZHAUR it returned a cached commercial homepage that differed from the current direct HTTP response. The active import map in the direct response was therefore used to identify ZHAUR's current deployed world.

## Live examples

### Jiang: a conventional blog behind a furnished reading space

The [3D homepage](https://m.134688.xyz/) declares a blog card embedding [134688.xyz](https://134688.xyz/). The separate blog has dated posts, tags, an archive entry, and RSS. The house is a presentation layer over that publication site.

The [layout](https://m.134688.xyz/world/layout.js) places a study, living room, music area, and other rooms. The [furniture source](https://m.134688.xyz/world/furnish.js) creates three colored book objects with `book-1`, `book-2`, and `book-3` hotspots. Matching homepage cards contain short writing/tool summaries. However, all three “read original” links currently point to the blog homepage, rather than distinct verified posts. A separate workbench card embeds `https://100412.xyz`.

**Useful pattern:** one study gives access to the complete blog; a few books highlight selected themes. This is evidence of curated entry points, not automatic article synchronization or one physical object per published article.

### Terry: native portfolio cards connected to recognizable furniture

The [homepage](https://terryhu.cn/) contains native HTML cards for about, works, contact, and mailbox. The work card includes BetterMapIt and Better SF Symbols entries with descriptions, images, and product links. No article archive or embedded blog card was present in the fetched markup.

The active import map overrides the build entry with [site/build.js](https://terryhu.cn/site/build.js), which wraps the [world builder](https://terryhu.cn/world/build.js). The [layout](https://terryhu.cn/world/layout.js) names a workbench, bedroom, garage, coffee bar, court, pool, and mailbox. The [furniture module](https://terryhu.cn/world/furnish.js) assigns work and about hotspots to furniture areas.

**Useful pattern:** the physical scene groups content by purpose. A workbench opens a portfolio collection; the collection can grow without adding a new sign in the room for every project. Room count is not article count, and some spatial stations have no matching content card.

### rsliyu: projects, infrastructure, and services occupy different objects

The [homepage](https://rsliyu.com/) uses native cards for a curated project workbench and infrastructure information. Separate cards embed local service, terminal, and computer pages. The latter includes an owner-only unlock interface; it was inspected as public HTML only, with no login attempted.

The [layout](https://rsliyu.com/world/layout.js) distinguishes workbench, computer, infrastructure room, lounge, and mailbox. The [build module](https://rsliyu.com/world/build.js) imports additional scene interactions, while [furniture](https://rsliyu.com/world/furnish.js) defines workbench and writing hotspots. The [service portal](https://rsliyu.com/assets/services-view.html) and [computer view](https://rsliyu.com/assets/pc-view.html) are independent HTML surfaces embedded by the homepage.

**Useful pattern:** use different furniture for different content types: projects at the workbench, systems at a server cabinet, external tools at a computer. These deployed pages demonstrate content organization, not independently verified service uptime or security claims.

### ZHAUR: a reading room, product workbench, and conversation area

The current direct response from the [homepage](https://zhaur.com/) contains native cards for projects, biography, systems lab, writing, conversation, and contact. The writing card links to an academy, product records, and evidence pages. It is a curated resource entrance rather than an article feed.

The active import map points under `/site-assets/20261031T171643Z-87599/studio-world/`; the root `/world/` path should not be assumed active. Its [layout](https://zhaur.com/site-assets/20261031T171643Z-87599/studio-world/world/layout.js) places the reading room upstairs, the product workbench downstairs, the systems lab in a separate area, and conversation at the coffee bar. Its [builder](https://zhaur.com/site-assets/20261031T171643Z-87599/studio-world/world/build.js) assembles the furnished scene.

**Useful pattern:** room purpose and content purpose agree. A visitor can remember where learning, products, and contact live. This source check does not establish that the reading room provides a CMS, search, or automatic post updates.

### HEIKEJI: extensive architecture can coexist with very little writing

The [homepage](https://heikeji.com/) declares a study card that embeds `assets/for-sale.html`, plus about, portal, contact, and mailbox cards. It is not currently evidence of a substantive article archive.

The active import map pins the [layout](https://heikeji.com/world/layout.js?v=14) and [builder](https://heikeji.com/world/build.js?v=14) to version 14. The layout includes a study and multiple domestic rooms; the builder delegates architecture, furniture, outdoors, music, and other interactions to separate modules. The served source is obfuscated and carries a restrictive copyright notice. No third-party source was copied into this project.

**Useful pattern:** the world can be interesting independently of content quantity. It is a weaker reference for managing a growing blog. A large room plan does not prove a mature publishing workflow.

## Recommendation for the glass pyramid

Use the pyramid as a small personal museum and reading pavilion, with an open central atrium and a few recognizable content stations around the perimeter. Avoid filling the floor with five identical sign kiosks or placing one sign per article.

Suggested configurable stations:

| Station | Physical object | Content opened | Initial state |
| --- | --- | --- | --- |
| Writing | Low bookshelf and reading desk | Article index with categories and recent posts | Empty article collection; clearly identified samples only if retained |
| Projects | Workbench or display table | Project cards with links, status, and images | Empty collection |
| Journal | Open notebook on a small desk | Chronological short updates | Empty collection |
| Photos | A small group of picture frames | Photo gallery or travel notes | Empty collection |
| About and contact | Welcome desk plus mailbox | Biography and contact links | Only user-supplied facts and working destinations |

Treat each station as a stable category entrance. An article index can contain any number of posts while the bookshelf remains the same size. If desired later, reserve three book positions for manually selected featured articles. Each featured entry should use a real post URL and distinguish an empty slot from published content.

For the immediate prototype, native HTML cards and local article pages fit the existing no-build Homecraft structure. Keep world placement independent from content records. A future data source could provide title, date, category, summary, and URL, then populate the index and optional featured slots. None of the inspected live sites proves an existing turnkey CMS or automatic sync that can simply be enabled here.

An external blog iframe is an alternative when there is already a maintained blog. Keep an explicit open-original link because framing may be blocked. Do not migrate to an external blog merely to obtain this spatial presentation.

## Interior size

A 25% increase in interior floor area is a reasonable provisional target for five distinct furniture groups and circulation. It is a design recommendation, not a measurement derived from the reference sites or a verified capacity result for the current pyramid.

Clarify the dimension being changed in implementation: 25% more floor area requires approximately 1.118 times the width and depth for a similar footprint. Multiplying both dimensions by 1.25 produces 56.25% more area. Expanding a furniture placement boundary inside the existing shell does not create extra pyramid headroom. Check furniture height and camera clearance against the sloping roof.

Prefer a clear central arrival route and perimeter furniture with space between groups. Use low furniture near the slope; keep taller shelving toward areas with enough headroom. Preserve configurable empty stations instead of inventing personal projects, journal entries, or photographs. Expand only enough to accommodate these spaces; content quantity should not directly determine the building's size.

Before calling the result usable, inspect the actual desktop and mobile views, approach each station, open its card, and check navigation, roof clearance, and the project's rendering budget. This research did not perform those prototype checks.
