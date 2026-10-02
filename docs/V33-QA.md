# V33 implementation and validation

Base: `main` at `f92ce16ad75ef5a1d5bbc5f7387b54fe764f003f`.

## Behaviour

- Shared pure presentation and React clock component for journey stops, endpoints, headers, alternatives, transfers, live board and board details. Leaflet uses the same presentation functions and CSS, with DOM text nodes for provider strings.
- BahnConnections thresholds: confirmed realtime +0–5 minutes green, +6–14 amber, >=15 red; earlier departures amber. Schedule-only and incomplete realtime remain neutral. Cancelled stops/legs never show an invented actual time. Journey-wide cancellations mean “Ausfall enthalten”.
- Changed platforms show planned track struck through and current track amber with a complete accessible label.
- Desktop search uses planner + map. Journey uses map + inspector. Editing replaces the inspector with the planner; returning preserves the selected journey. The mobile draggable sheet mechanism is unchanged.
- General station markers stay interactive but become smaller and less opaque beneath journey layers. Route/source colours remain distinct from brand and cancellation colours.
- No new dependency. Existing Transitous/DB requests, cache, abort and fallback handling retained. DB equal endpoint times remain conservatively schedule-only; no inference from a global source timestamp.

## Execution environment and local evidence (2026-10-02)

Executed successfully:

- `node scripts/realtime-audit.mjs`: thresholds, early departure, cancellation, incomplete timestamps, schedule-only data, invalid timestamps, midnight/DST and platforms.
- `node scripts/ui-audit.mjs`: updated search/journey invariants and existing accessibility, sheet and data-integrity checks.
- `node scripts/board-verification-audit.mjs`: existing source comparison regressions.
- Syntax checks for the expanded responsive runner and fixtures.

The managed cloud workspace contains a GitHub-backed source snapshot, rather than a complete clone with installed dependencies. Registry access and the cloud Git proxy were unavailable locally. TypeScript, ESLint, build and browser QA therefore run in GitHub Actions on Ubuntu, Node 24 and pnpm 10, using the full branch checkout and frozen lockfile. Binary assets and the large station/rail datasets are retained from the GitHub base tree.

## Browser QA and polish

The responsive runner covers 320 × 700, 360, 375, 390, 430, 768, 844 × 390 landscape, 1024, 1280, 1440 and 1920. It exercises free sheet dragging, collapse, close, restoration, alternative selection and desktop search editing. Realtime fixtures cover confirmed on-time, +3, +10, +24, +45, early departure, platform change, cancelled stop, cancelled leg, schedule-only and incomplete realtime, with long names and both themes. Theme switching uses the app's buttons. Colours, struck planned times, visible current times, status labels and overflow are checked on the actual React UI.

The fixture runner disables service-worker registration so deterministic responses cannot escape into the worker's network target; this run does not validate offline caching. Live network/API checks are separate from the fixture screenshots. Screenshots are UI evidence, not live timetable validation.

Actual screenshots of the 320px expanded journey, 1920px map + inspector, desktop search, 844px landscape, +10 light, +24 dark, cancelled stop, early departure, platform change and incomplete realtime were reviewed. A second polish pass removed the duplicate single-leg occupancy block, simplified nested information groups, corrected the landscape map fit to the side sheet's measured width, made missing realtime text visible, and reserved a second row for board times. Endpoint and transfer cancellations preserve the difference between a cancelled stop and a cancelled leg. Live train markers and trails share the central realtime status tones.

## Recorded CI evidence

[Final implementation run 37014969991](https://github.com/Cola968/BahnConnections/actions/runs/37014969991), commit `817a10c142a5d88ea7bd94d44319652d01befd42`, completed successfully. Its artifacts include screenshots, `report.json`, development-server logs and the separate live-source reports.

- TypeScript, ESLint, realtime audit, UI audit (43 checks), board verification audit and production build passed.
- Responsive browser QA passed with a clean process exit: 22 realtime checks across both themes and 45 layout snapshots, with no horizontal overflow. Desktop search/journey, landscape, dragging, collapse, close, restoration and accessibility presentation were exercised.
- Live network audit passed: nine stations, four route/connection checks and no reported warnings.
- The optional live API smoke did **not** pass. Station search and station services passed, then the existing S42 ring-loop assertion failed: `S42 wird nicht auf genau eine Ringrunde begrenzt (13/13 Halte)`. The remaining board, trip and planner checks in that script were not reached. The ring-trimming implementation and this assertion were not changed by V33. The report establishes this failed sample; it does not establish whether the cause is source data or an existing trimming limitation.

Live-source steps use `continue-on-error`; the workflow's overall success must not be read as a successful API smoke. Use the actual `api-smoke.json` and `network-audit.json` reports in the artifacts.

The earlier [run 37014282689](https://github.com/Cola968/BahnConnections/actions/runs/37014282689) completed browser assertions and wrote its report, then failed on a delayed fixture response after browser shutdown. The final runner clears delayed replies and CDP timeout timers during teardown, and the successful follow-up above verifies that fix.

## Remaining limits

No physical Android/iOS device, manual screen-reader session or offline PWA test was performed. Keyboard/focus and reduced-motion handling remain covered by source audits; browser QA exercises theme, large-font, high-contrast and reduced-motion presentation. The original V32 app could not be launched locally before implementation because dependencies were unavailable; the screenshot review compares successive V33 passes, not a claimed V32 browser baseline.
