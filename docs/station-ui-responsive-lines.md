# V50.2: station interaction and transit hierarchy

This update continues the real product from main `c599eb4fc5ad67a303f88a65493ecec2d582caca` on `feat/station-ui-responsive-lines`. The relevant V41.1 material, search and platform changes were already transferred in V50.1; see [station-sheet-polish.md](station-sheet-polish.md). No historical version metadata or competing CSS overrides are imported.

## Original sources consulted online

Downloaded and read the original repositories over the network:

- [Chrome/web.dev: Optimize long tasks](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/optimize-long-tasks/index.md): visible input and paint must run before background work; Promise microtasks alone do not yield to the browser. Station loading now yields to a new task, prepares geometry in a dedicated worker, and draws incremental frame-budgeted batches.
- [Chrome/web.dev: Rendering performance](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/rendering-performance/index.md): reduce repeated layout, paint and main-thread work. Existing map lines survive subsequent batches instead of being rebuilt.
- [Material Web tabs](https://github.com/material-components/material-web/blob/main/docs/components/tabs.md), [progress](https://github.com/material-components/material-web/blob/main/docs/components/progress.md), and [text fields](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md): quiet secondary navigation, explicit loading progress and a clear input hierarchy. These inform the fine active indicator, shared list surface and compact station switcher; no Material component library was added.
- [W3C tabs](https://github.com/w3c/aria-practices/blob/main/content/patterns/tabs/tabs-pattern.html) and [combobox](https://github.com/w3c/aria-practices/blob/main/content/patterns/combobox/combobox-pattern.html): retain keyboard selection, accessible names, Enter/Escape behavior and fast mounted tab content.
- [Leaflet 1.9.4 Polyline source](https://github.com/Leaflet/Leaflet/blob/v1.9.4/src/layer/vector/Polyline.js): every source point is projected before Leaflet simplifies it. Canvas alone cannot remove this preparation cost.

Direct Apple HIG and web.dev website requests were denied by the cloud network policy. No conclusions are attributed to unread pages, and no AI mockups are used.

## Changes

The top header becomes a compact station switcher on mobile when a station is open. Closed labels use the existing station normalization. Focus selects the input, suggestions and Enter open a real station. Destinations and times form a clear scan hierarchy; badges are smaller, dividers are inset, and inactive tabs are quieter. Line rows use the same shared glass surface, compact destinations, a right time anchor and details on tap. The line toolbar reports partial/missing geometry honestly and shows determinate progress.

The joint station header and clipped sibling scroller from V50.1 remain intact. The budget before the first departure is still 130 px: 52 px title/drag, 36 px subnavigation, 40 px board controls and 2 px boundaries. V50 before the structural sheet fix used 269 px. At 390 x 844 the half sheet shows four complete departures and the expanded sheet seven. Normal rows are approximately 73.4 px (70.8 px at 320); title, navigation and toolbar share one material instead of separate cards.

## Loading path

A closed search previously ranked every station after a map selection, including a full edit-distance calculation for every name. Ranking now only happens while open, typing is deferred and typo distance exits early. Live suggestion requests also stop when closed.

Trip decoding, repeated-stop trimming, geometry validation and preview simplification happen in `station-trip-worker.ts`. Source geometry and stops stay intact for the selected-trip view. Only the automatic overview uses a conservative five-metre simplification, per already validated segment. Endpoints, source gaps and separate legs remain separate. The geometry audit verifies the error bound and repeated-loop segmentation.

`StationMapRenderer` adds only new previews within small animation-frame budgets. Station marker creation also yields before the sheet paints and runs in small batches. All reported lines and directions continue to load automatically; no hard-coded line cap, duplicate detail fetch or static fallback hides services. Station changes and closing abort requests, reject pending worker work and remove previews.

## Validation

Production browser screenshots are in `work/station-ui-final`, with 320/360/390/430/768/1024/1440/1920 widths, Light and Dark, half/expanded/scrolled sheets, filters and long station names. The existing full interaction matrix and content-layout checks exercise the actual product. Screenshots use deterministic timetable fixtures; they are not evidence of provider availability. Map tiles are blocked in this cloud environment, so local screenshots cannot establish final glass appearance over a loaded street map.

The station performance scenario clicks a real Berlin Hbf map marker at 4x Chromium CPU slowdown, loads all 18 lines with 12,000 source geometry points per trip, and records long tasks and the first sheet animation frame. The follow-up scenario switches station while requests are active, closes the sheet and checks that neither old routes nor the sheet reappear. These measurements describe this controlled workload, not physical-device INP or real network latency.


| Controlled 4x CPU workload | V50.1 baseline (dev) | V50.2 (production) |
| --- | ---: | ---: |
| Click to first sheet animation frame | 461 ms | 135 ms |
| Longest main-thread task | 518 ms | 131 ms |
| Total time beyond 50 ms per long task | 2,164 ms | 167 ms |
| Long tasks | 13 | 3 |
| Automatically rendered lines / requests | 18 / 18 | 18 / 18 |

The same fixture and 4x slowdown were used, but the final production build also removes development overhead. The intermediate V50.2 dev run measured 204 ms to the sheet frame, 204 ms maximum task and 564 ms blocking time, so the improvement is also present in the development comparison. These are single-run regression measurements, not a statistical device benchmark. Report JSONs are `work/station-loading-before/station-loading-report.json`, `work/station-loading-after/station-loading-report.json` and `work/station-loading-final/station-loading-report.json`.

Local validation passed: TypeScript, ESLint, realtime/UI/board/map/transport/billing audits, production build, 165 content-layout assertions and 108 responsive interaction states. Closing during a subsequent station load passed without resurrecting the sheet or routes. Focused-search QA additionally verifies that underlying brand, header actions and location controls cannot show through.
