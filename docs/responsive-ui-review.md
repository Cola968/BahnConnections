# Responsive UI correction

Panels now keep the header outside the scrolling body. Times wrap inside their own grid column; narrow boards move time/platform information below the destination. All available station lines are listed without filters or expansion and their supplied geometries load automatically in batches. Missing geometry is reported rather than invented.

The shared realtime presentation uses orange for +1–9 minutes and red from +10 minutes. Transport badges and map routes preserve supplied colours, use Berlin line colours where applicable, and fall back to distinct transport colours instead of grey.

Mobile and desktop close buttons reset transient selection, journey, map geometry, sheet height, menus and tracking. Pending planner, walking and trip requests cannot restore a closed view. Failed/aborted station ID lookups remain retryable. Resizing preserves the current view; landscape separates the map and side panel.

## Validation

- Production build, TypeScript, ESLint, realtime audit, UI audit, board verification audit and transport/cache regression passed.
- `audit:layout`: 144 browser checks across 320×568, 360×640, 390×844, 768×1024, 844×390, 568×320, 1024×400, 1024×600, 1440×900 and 2560×1440. Light/dark themes, normal/large text, scroll positions, separate headers, row overlaps, overflow and actual button hit testing are covered.
- The fixture supplies 18 lines, checks automatic geometry loading and verifies station/journey close plus closing during a delayed planner response.
- The existing `audit:mobile` passed its UI interactions, realtime assertions and responsive matrix through 1920px, then stopped at the unrelated `Unconfigured billing endpoint not closed` API-status assertion in the local production server. The complete legacy suite is therefore not green; billing code was not changed.
- Browser checks use deterministic fixtures in headless Edge. They are not evidence of live provider completeness or a physical-device test. Existing screenshot capture can time out on this host; `BAHNCONNECTIONS_QA_SCREENSHOTS=0` runs interaction/layout assertions without capturing images.

Run `audit:layout` with the server URL and output directory as arguments, for example `node scripts/content-layout-qa.mjs http://127.0.0.1:3104/?station=berlin outputs/content-layout`.
