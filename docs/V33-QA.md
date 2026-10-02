# V33 implementation and validation

Base: `main` at `f92ce16ad75ef5a1d5bbc5f7387b54fe764f003f`.

## Behaviour

- Shared pure presentation and React clock component for journey stops, endpoints, headers, alternatives, transfers, live board and board details. Leaflet uses the same presentation functions and CSS, with DOM text nodes for provider strings.
- BahnConnections thresholds: confirmed realtime +0–5 minutes green, +6–14 amber, >=15 red; earlier departures amber. Schedule-only and incomplete realtime remain neutral. Cancelled stops/legs never show an invented actual time. Journey-wide cancellations mean “Ausfall enthalten”.
- Changed platforms show planned track struck through and current track amber with a complete accessible label.
- Desktop search uses planner + map. Journey uses map + inspector. Editing replaces the inspector with the planner; returning preserves the selected journey. The mobile draggable sheet mechanism is unchanged.
- General station markers stay interactive but become smaller and less opaque beneath journey layers. Route/source colours remain distinct from brand and cancellation colours.
- No new dependency. Existing Transitous/DB requests, cache, abort and fallback handling retained. DB equal endpoint times remain conservatively schedule-only; no inference from a global source timestamp.

## Local evidence (2026-10-01 cloud session)

Executed successfully:

- `node scripts/realtime-audit.mjs`: thresholds, early departure, cancellation, incomplete timestamps, schedule-only data, invalid timestamps, midnight/DST and platforms.
- `node scripts/ui-audit.mjs`: updated search/journey invariants and existing accessibility, sheet and data-integrity checks.
- `node scripts/board-verification-audit.mjs`: existing source comparison regressions.
- Syntax checks for the expanded responsive runner and fixtures.

Full project TypeScript, ESLint, build, baseline app launch, app screenshots, mobile interaction QA, live network and API smoke checks could not run locally: there is no installed project dependency tree; registry requests are blocked and the configured cloud Git proxy is unreachable. A GitHub-backed source snapshot was used for local source/audit work. Binary assets and large station/rail datasets remain intact in the GitHub base tree.

The quality workflow runs TypeScript, ESLint, all three audits, build and the actual responsive browser script on GitHub. Results must be checked separately; creating a workflow does not establish a passing run. The browser runner covers 320, 360, 375, 390, 430, 768, 844 landscape, 1024, 1280, 1440 and 1920, both themes, all requested realtime cases, long names, platform changes, cancellation, search editing, restoration and free dragging. Screenshots are UI fixtures, not timetable validation.

The second source/layout polish pass simplified the header, removed hidden duplicate time blocks, separated brand/action/route/status colours, flattened occupancy and transfer groups, and made board times use a dedicated second row so the planned/current pair can stay together in the narrow inspector. Actual app screenshot review and real Android/iOS device validation remain pending until executable browser QA is available.
