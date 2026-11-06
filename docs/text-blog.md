# Text Blog Guide

## Entry and view choice

Phones open the text blog on their first visit. The device check uses a coarse pointer and a shortest viewport dimension of at most 700 CSS pixels, so portrait and landscape phones choose the same default. Desktop and larger tablet layouts keep the 3D default.

- The 3D page offers **文字版** (Text Version).
- The text header offers **进入 3D** (Enter 3D).
- `/?plain=1` explicitly opens reading mode on any device.
- `/?view=3d` explicitly opens the scene on any device.
- Explicit choices are remembered in sessionStorage for the current tab/session. Explicit URL parameters override that preference. Storage failure leaves the explicit URL usable and falls back to the device default for later bare URLs.

If both parameters are present, `plain` takes priority. Removing `plain` alone does not force 3D on a phone; use `view=3d` or the header's switch link. Room queries such as `?space=library&view=3d` remain usable.

Start the preview with `python tools/serve.py 8765`, or use the active address in `tools/.serve-url`. For example, `http://127.0.0.1:8765/?plain=1` opens the text blog. Change the port to match the running server.

## Reading experience

The text blog has its own responsive page layout and six sections: Home, Written, Collected, Projects, About and Friends. It uses ordinary document scrolling, a visible section navigation, keyboard focus styles and touch-sized controls.

Written and Collected support search and category filters. Search matches titles, summaries, authors where present, categories and tags. An empty result has a clear-filter action. Collection links keep their original external destinations; items without a destination are labelled as pending.

Articles open inside the reading page, without a nested 3D scene or an iframe. HTML examples and Markdown share the same article header and reading layout. The reader includes a catalog return link, a collapsible heading list and horizontally scrollable code blocks. Browser Back and Forward follow section/article history; a deep article link survives refresh.

A reading URL looks like `/?plain=1#/written/reading-room`. The three existing HTML examples and the Markdown example remain labelled as samples. They are available for layout previews while the owner prepares real articles. No biography or real publication history is filled automatically.

Missing articles show a readable pending message and a catalog return link. Failed body requests offer retry. If WebGL startup fails, the complete reading interface still opens, including its catalogs.

## Loading and music

`world/start.js` selects the entry before importing the scene. Text mode does not import the 3D engine or Three.js, load GLB scenery, create a scene canvas, or start background audio. It loads shared catalog/profile data and article text as needed.

The 3D engine and its stylesheet set load only when the visitor enters 3D. The scene retains the 25% initial music volume when no saved preference exists. In short landscape views, its mini player sits below the top controls instead of over the central exhibit target.

## Content sources

| Content | Owning file | Maintenance |
| --- | --- | --- |
| Original article index | `world/library/written.js` | Register an HTML page or a Markdown file. Set `sample: true` for demonstrations. |
| Markdown bodies | `articles/*.md` | Supply front matter for title, date, category, tags and summary, followed by the body. |
| Existing HTML bodies | `articles/*.html` | The text reader extracts the main article content and resolves its links. |
| Collections | `world/library/collected.js` | Supply the source URL, summary, tags and optional personal comment. |
| Project summary | `index.html`, station `works` | The reading page reuses the summary; scene-room links explicitly select 3D. |
| Profile and social accounts | `about/profile.js` | Supply a real biography and exact public account destinations. |
| Friends | `friends/list.js` | Update entries and sample flags. |
| Text layout and behavior | `assets/text-blog.css`, `world/text-blog.js` | Responsive reading layout, route navigation, catalogs and reader. |
| View selection | `world/view-mode.js`, `world/start.js` | Device default, explicit overrides and session preference. |

The scene's library and the text blog share the same catalog data. HTML `page` paths are relative to the site root; Markdown `file` paths are relative to `articles/`. Relative links and images in Markdown resolve against that Markdown file's URL, with protocol validation before rendering.

## Verification

- `node --test tools/text-view.test.mjs`: device/view precedence, switch URLs and article-relative Markdown destinations.
- `node tools/check-text-blog.mjs <preview-url>`: phone portrait, small-phone and landscape entry; absence of 3D/model/audio loading; catalogs, filters, article reading, deep links, explicit mode choices, desktop default, WebGL fallback and failed-request retry.
- `node tools/check-ori.mjs <preview-url>`: desktop/touch exhibit picking, including short landscape with the mini player present.
- `npm run check:all -- <preview-url>`: complete local acceptance.

Scene-specific browser suites explicitly choose 3D in their fresh test sessions. Reading-entry tests pass `viewMode: null` to the browser helper so they exercise the real device default. JavaScript is required for the searchable catalogs; the original static HTML remains the no-script fallback. Viewport emulation does not establish actual phone frame rate.
