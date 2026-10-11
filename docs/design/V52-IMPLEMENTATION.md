# V52 mobile planner reconstruction — draft

Built on published `main` commit `0b7e3d06424e73e31f0abff65cccf4d5263d433a`, on `codex/v52-mobile-planner`. V52 is a draft for review, not a release or deployment. The V52 attachment asks for a draft PR and separate approval before merge/deployment. The earlier `v41.1-liquid-polish` work is already incorporated in the published history; this branch continues the actual product.

## Implemented

- Extracted the controlled `PlannerPanel` from `page.tsx`. Start and destination share a compact input group; departure/arrival and date share a row. Options and empty saved routes are disclosures. Nearby departures remain available below the primary form.
- Moved search into a fixed panel footer so it remains reachable in short windows. Form content alone scrolls; suggestions, native date input, saved routes, filters, swap, retry, and selected-journey return remain available.
- Consolidated planner and mobile-navigation ownership into `styles/planner.css` and `styles/navigation.css`; removed competing rules from historical stylesheets. Existing glass tokens remain the material system. Departures remain rows on a shared sheet, not individual glass cards.
- One active navigation view survives mobile/desktop resizing. Navigation is one bounded glass surface, 60 px high on portrait phones, with red icon/text for the active view. Short-window landscape rules now require at least 600 px width, avoiding the split layout on a narrow portrait viewport.
- Editing stations, travel time, arrival/departure mode, or filters aborts pending planning and invalidates its generation. An obsolete result cannot restore the old journey. Back closes the panel; a UUID-owned history entry survives reload without creating an extra Back step.
- Board averages and percentages now use only measured realtime delay samples. Missing predictions and schedule-only rows are not counted as on time; cancellations remain separate.
- Cross-provider station matching requires a normalized name and bounded distance. Equally plausible distinct stations fail closed, including when nearby platform duplicates precede an ambiguous third candidate.
- Valid train geometry before and after a gap is retained. Interpolation and trails cannot cross that gap.

## Measured before/after

Chromium, 390×844, normal text, half planner, light theme. These are DOM CSS pixels from the same fixture scenario, not screenshot-device pixels. Values rounded to one decimal.

| Element | V51 | V52 |
|---|---:|---:|
| Header | 56.0 | 56.0 |
| Start/destination group | 168.7 | 114.0 |
| Time controls | 129.4 | 65.8 |
| Search action | 54.0 | 46.2 |
| Options disclosure | 44.0 | 44.0 |
| Sum of those controls, excluding gaps | 452.1 | 326.0 |
| Navigation | 62.0 | 60.0 |
| Half-sheet height | 405.1 | 480.0 |
| Scroll content / viewport | 705 / 324 | 352 / 352 |
| Search action reachable without scrolling | No | Yes |

The primary controls save about 126 px. The taller half sheet reserves the fixed action and saved-route disclosure; it does **not** increase visible map area at this phone size. The map above the sheet decreases by approximately 61 px. At 320×568 the form body can scroll while search stays visible. In short landscape the sheet occupies the right side and navigation occupies the left; deeper form controls scroll.

## Browser evidence

The 13-size planner matrix covers 320×568, 360×740, 375×812, 390×844, 430×932, 667×375, 844×390, 768×1024, 1024×768, 1180×820, 1366×768, 1440×900, and 1920×1080 in both themes. All 26 default views have a reachable search action and no horizontal overflow. Nine additional checks cover suggestions/options, short-height keyboard simulation, pending edits, closing, Aa scaling, minimize/reopen, and reload → Back. The report contains 35 passing checks.

[Before](v52-evidence/390-before.png) · [390 light](v52-evidence/390x844-light-planner.png) · [390 dark](v52-evidence/390x844-dark-planner.png) · [320 light](v52-evidence/320x568-light-planner.png) · [320 dark](v52-evidence/320x568-dark-planner.png) · [Landscape](v52-evidence/667x375-dark-planner.png) · [Tablet](v52-evidence/768x1024-light-planner.png) · [Desktop](v52-evidence/1440x900-dark-planner.png)

[Expanded](v52-evidence/390-expanded.png) · [Options](v52-evidence/390-options.png) · [Suggestions](v52-evidence/390-suggestions.png) · [Short-height simulation](v52-evidence/390-keyboard-height-simulation.png) · [Before measurements](v52-evidence/planner-before.json) · [Production measurements](v52-evidence/planner-after.json)

Screenshots are actual Chromium renders of product code with intercepted transport responses. They were opened for visual review. External map tiles are unavailable in this environment, so these screenshots do not establish glass quality over a loaded map. The short-height scenario is **not** an actual mobile keyboard test. No AI images were generated.

The inherited compact station sheet is preserved: at 390×844 the fixture shows four complete departures in half state and seven in expanded state, with 130 px of header/subnavigation/toolbar and no overlap. This is retained V51 behavior, not a new claimed V52 reduction.

[390 station light](v52-evidence/390-light-half-station.png) · [390 station dark](v52-evidence/390-dark-half-station.png) · [320 station light](v52-evidence/320-light-half-station.png) · [320 station dark](v52-evidence/320-dark-half-station.png)

## Design reference and independent review

The supplied App Designer ZIP was read as a design reference. Its spacing, hierarchy, shared material, and independent critique guidance informed this implementation. Separate concepts, SwiftUI examples, and rebranding were not adopted because this task changes the existing web product. Reference guidance includes [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Material bottom sheets](https://m3.material.io/components/bottom-sheets/overview), and [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); these links are reference pointers, not a claim of freshly fetched online research. Attempts to retrieve the Apple and WCAG pages through the configured network proxy failed with HTTP 403 on 2026-10-11.

The requested GitHub, Code Review, and Lovable plugin tools were not callable. GitHub operations use authenticated `gh`; code and screenshot review use one independent critic as requested by the supplied design workflow. No plugin execution or Lovable project is claimed.

Review found and fixed: ineffective Aa scaling, duplicate candidates hiding an ambiguous station, undersized planner touch targets, a clipped empty saved-route heading, a hidden landscape action, an extra Back step after reload, and an inherited collapsed rule hiding the new header. Final targeted code review has no remaining material findings, subject to required regression checks.

Final independent visual scores (1–5): concept 4, category distinctiveness 3, reference independence 3, hierarchy 4, typography 3, color 4, richness 3, rhythm 4, craft 4, native fit 4, signature 2, feature testing 3, fidelity 4. The attachment's strict editorial acceptance threshold was **not** reached. This is a functional UI improvement with honest limits, not a claim of a perfect native redesign.

## Remaining verification

- Physical iOS/Android keyboard, browser history, safe areas, and low-end-device responsiveness.
- Live provider/Workers deployment and loaded-map glass appearance.
- Unrelated historical CSS and remaining page-owned panel flags still exist; this change consolidates planner/navigation ownership, not every UI subsystem.
- App version remains V51.0 until an authorized V52 release. No V52 merge or deployment performed.

## Validation

Local TypeScript, lint, realtime/UI/board/transport/billing/radar/map/planner audits and production build pass. The production browser runs pass: planner 35 checks; content layout 165 checks; responsive mobile 120 matrix states, 24 realtime checks, 47 snapshots, 7 profile checks and 4 website checks; station sheet 28 cases; streamed board 4 cases with late verification preserving row expansion. Existing tests were updated only where selectors changed or the conservative matcher now requires a fixture name.

Fourfold CPU throttling, 18 station lines with 12,000 points each: sheet first frame 112 ms, largest task 148 ms, total blocking time 161 ms, maximum frame gap 166.8 ms. All 18 routes and requests complete; closing during loading does not resurrect the sheet. This validates the inherited batched line-loading implementation, not a new measured V52 speedup.

Fourfold CPU throttling, 180 live trains with 6,000 points each: 180 markers retained, zero marker mutations, zero observed long tasks during the measurement window, maximum frame gap 16.8 ms. Initialization is outside that tick-measurement window.

[Responsive report](v52-evidence/responsive.json) · [Layout report](v52-evidence/layout.json) · [Station sheet](v52-evidence/station-sheet.json) · [Station loading](v52-evidence/station-loading.json) · [Live map](v52-evidence/live-map.json) · [Streamed board](v52-evidence/board-stream.json)

GitHub CI runs separately on the draft PR. External network/API steps are advisory and their failures must not be mistaken for proof of provider availability.
