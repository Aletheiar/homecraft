# NewHeaven Pyramid Local Preview Implementation Plan

**Goal:** Adapt Aletheiar/homecraft into a local, walkable NewHeaven glass-pyramid website with a bounded courtyard, five interior stations, and readable sample articles.

**Architecture:** Keep Homecraft's engine unchanged. Crop and recenter the archived NewHeaven geometry, load it through the matching Three.js GLTF loader, and supply navigation, collision sources, furniture and station hotspots through world modules. Render articles using Homecraft's existing HTML cards and standalone local pages.

**Tech Stack:** Three.js r180, native ES modules, Python/trimesh for offline asset preparation, Node test runner, Playwright browser checks.

**Spec:** The user's approved design in this chat: a walkable pyramid and pool courtyard, distant non-walkable landscape, horizontal and flight boundaries, and five open interior areas.

## Constraints

- Local preview only; do not push or deploy.
- Use actual NewHeaven geometry; retain the original GLB unchanged.
- Keep engine files unchanged; implement site-specific collision with world hooks.
- Mark sample articles as demonstration content and retain model attribution.
- Check desktop and mobile startup, all five stations, article links, entrance traversal, and walking/flying bounds.
- Target fewer than 200,000 rendered triangles and 60 draw calls; report measured limitations.

## Tasks

- [x] Add boundary regression tests for horizontal and vertical containment, a passable south entrance, and a solid pyramid shell.
- [x] Implement pure collision helpers in world/boundaries.js and verify the tests.
- [x] Prepare assets/models/newheaven-courtyard.glb with a documented crop, scale, entrance opening, source hash and triangle counts. Vendor the r180 GLTFLoader and its geometry utility dependency.
- [x] Implement world/layout.js, world/build.js, world/pyramid.js and world/furnish.js: ground, decorative pools, background landscape, courtyard perimeter, five stations and model loading status.
- [x] Add local sample article pages and connect index.html cards and the Dock to each station. Keep branding explicitly marked as a local preview.
- [x] Start the local server, run site checks and Playwright acceptance tests, inspect screenshots, and correct observed problems.
- [x] Serve the validated preview and provide its URL, screenshots and remaining limitations. Automatic browser opening was attempted but blocked by environment policy.
