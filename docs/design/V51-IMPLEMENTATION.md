# V51 implementation and verification

This iteration updates the real product on `codex/v51-systemic-overhaul`, based on the still-open V50.3 PR #39. PR #40 remains a draft. Main remains `ff1d93fbdc3fa4cf0b7c16f22a9a6a6c269d0c74`; no merge, deployment, billing activation or release-version bump was performed.

## Implemented and checked

| Previous problem | Change | Main files | Verification / result |
| --- | --- | --- | --- |
| Every four-second radar tick recreated markers and repeatedly traversed geometry | Persist trip markers, update coordinates/status in place, cache distance indexes and yield preparation/rendering in batches | `live-map-renderer.ts`, `live-trains.ts`, `use-live-map.ts` | 180 trains × 6,000 points; all 180 DOM identities survive, zero marker replacements; keyboard focus survives ticks |
| DB cross-check delayed the first timetable response | Optional NDJSON response sends primary rows first, then independent verification; ordinary JSON clients remain compatible | board API route, `board-stream.ts`, `live-board.tsx` | Fragmented UTF-8, early primary records, cancellation, pending/inconclusive status tested; late verification preserves expanded rows |
| Late planning responses could replace a station selected meanwhile; refresh work continued in hidden tabs | Abort planning when switching stations/views; extract Leaflet/radar lifecycle; visibility-aware, cancellable polling; explicit stale radar state | `page.tsx`, `use-leaflet-map.ts`, `use-live-radar.ts`, `visibility-poller.ts` | Lifecycle audit and browser close/switch tests pass; damaged preference IDs do not crash rendering |
| Old sticky-tab rules, duplicate component styles, tall 1024-px toolbar, overflowing radar inspector | Remove obsolete tab/last-child rules; split sheet/material CSS; move marker/detail rules out of globals; secondary board actions move inside filters; compact detail inspector | `station-sheet.css`, `material-surfaces.css`, `live-map.css`, `board-toolbar.tsx`, `live-trip-inspector.tsx` | Station tabs never share the content scroller; no overlap/overflow; 1024-px chrome falls from 216 to 164 px |
| Filters still used six minutes; unknown schedule/geometry/speed could appear precise | Shared five-minute boundary; missing planned times stay missing; no position across geometry gaps; unavailable speed is explicit; keyboard tabs and marker activation | `live-trains.ts`, `live-board.tsx`, `board-toolbar.tsx` | Realtime and lifecycle audits pass; early/schedule/unknown data do not enter the on-time filter; provider text remains text, never HTML |

## Measurements

The radar comparison uses real Chromium rendering with deliberately controlled source responses, 1440×900, fourfold CPU throttling, 180 trains, 6,000 geometry vertices per train, and a 17-second measurement window. The baseline was recorded before implementation on `22db211`. This is neither a smartphone INP measurement nor proof of live provider availability.

| Measurement | Before | After |
| --- | ---: | ---: |
| Original marker DOM elements retained | 0 / 180 | 180 / 180 |
| Marker additions/removals | 1,440 | 0 |
| Long tasks ≥50 ms | 6 | 0 |
| Largest observed long task | 560 ms | None ≥50 ms |
| Sum of task duration exceeding 50 ms | 1,926 ms | 0 ms |
| Largest animation-frame interval | 616.6 ms | 33.3 ms |

[Before report](v51-evidence/radar-before.json) · [After report](v51-evidence/radar-after.json)

The separate station-click test loads all 18 lines with 12,000 geometry points per line under fourfold CPU throttling: sheet rendered after 165 ms, largest task 161 ms, 18 route additions and 18 trip requests. Closing during the next station load does not resurrect the sheet or lines. A concurrent-build run exceeded the 250-ms task budget by 5 ms; the isolated final run passed. These figures are controlled test results, not a claimed before/after speedup for the inherited V50.3 line worker.

### Vertical budget

| View | Before | After | Result |
| --- | ---: | ---: | --- |
| 390×844 station sheet | 130 px from existing CSS budget | 130 px browser measurement | 4 complete departures in half state, 7 expanded; Light and Dark |
| 1024×768 station inspector | 216 px measured before toolbar reduction | 164 px | 52 px saved; 6 complete departures instead of 5 |

The mobile budget is 8 px drag area + 44 px title + 36 px station tabs + 40 px board toolbar + 2 px boundaries. The stationary header is outside `.panel-body`; its tabs cannot compete with sticky table content. This iteration preserves the compact mobile budget rather than claiming a further height reduction.

## Browser and build evidence

TypeScript, lint (zero warnings), realtime, UI, board-verification, transport, map, billing and radar-lifecycle audits pass, as does the production build.

The production-preview browser matrix covers 320×700, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900 and 1920×1080 in Light and Dark. Its 120 scene captures include map, station board/info, planner, journey and scrolling. Additional interaction checks cover drag/restore/close, 24 realtime cases, long names, settings, large type, high contrast, reduced motion and landscape. The station-sheet script checks reduced transparency, header occlusion, filters and all 18 viewport/theme combinations. The final radar inspector was opened visually and corrected until its long-name layout and overflow policy passed.

The browser fixtures are explicitly controlled data. They exercise actual application code, not generated mockups. Map tiles are absent in this environment's browser captures, so these images cannot establish the appearance over a fully loaded live map. A direct curl probe reached Transitous geocoding, but local `workerd` API requests failed DNS resolution; the local production live-API smoke remains unsuccessful. The source checks in CI are separate, non-blocking checks.

[Full responsive report](v51-evidence/responsive.json) · [Station-sheet report](v51-evidence/station-sheet.json) · [Station-loading report](v51-evidence/station-loading.json)

Actual screenshots, inspected without editing:

- [390 Light](v51-evidence/390-light-half.png) / [390 Dark](v51-evidence/390-dark-half.png)
- [320 Light](v51-evidence/320-light-half.png) / [320 Dark](v51-evidence/320-dark-half.png)
- [Filter disclosure](v51-evidence/390-filters.png) / [1024 toolbar](v51-evidence/1024-toolbar.png)
- [Radar inspector with deliberate hostile source-name fixture](v51-evidence/1440-trip-details.png)

## Implemented, not established by these tests

Production Workers streaming and source availability over a real deployment, physical-device frame pacing/INP, long-session memory stability and live-map material readability need deployment/device evidence. The local fixture passes do not settle these questions.

## Not implemented / follow-up risks

| Priority | Remaining work | Risk / scope |
| --- | --- | --- |
| P1 | Physical low-end smartphone and live-provider/deployed Workers verification | CPU emulation does not establish device responsiveness or provider availability |
| P2 | Finish stylesheet and panel-state consolidation | Unrelated V48/V49 rules and several page-owned panel flags still exist; this is a focused extraction, not a complete state rewrite |
| P2 | Reconcile every 44-px touch target with the compact sheet budget | Station tabs remain 36 px and mode controls 40 px; close/collapse controls are 44 px. Map glyph hit areas also need separate review |
| P2 | App-specific browser Back history and all in-flight planner-input changes | Navigation abort is covered here; a complete history/state machine and every input-change race are not implemented |
| P2 | Complete radar trip details beyond the supplied segment | Radar details truthfully show an estimated section; full available stop lists remain in board/journey details |
| P2 | Finish release/billing/provider-terms readiness separately | No payments or public release were activated in this draft |

## Internet references used

- [Leaflet 1.9.4 Marker source](https://github.com/Leaflet/Leaflet/blob/v1.9.4/src/layer/marker/Marker.js): `setLatLng` updates an existing marker; `setIcon` reinitializes the icon. The renderer preserves marker/DOM identity.
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): visible dashboards can suspend polling in hidden tabs. Original MDN source was fetched and read.
- [MDN ARIA tab role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tab_role): coordinate selection and roving tabindex; arrow/Home/End keyboard behavior.

GitHub was accessed through the authenticated `gh` CLI. The UI UX Designer skill guided hierarchy, states and visual review. No callable Composio capability was available in this session. No image generation was used.

[Draft PR #40](https://github.com/Cola968/BahnConnections/pull/40) · [Code commit](https://github.com/Cola968/BahnConnections/commit/58fb45b) · [QA commit](https://github.com/Cola968/BahnConnections/commit/6521f3c) · [CI run for code/QA](https://github.com/Cola968/BahnConnections/actions/runs/38142360683)
