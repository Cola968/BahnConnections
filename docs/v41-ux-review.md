# V41 UI/UX review

Base: V40.0, `869bd01f934c52765eb6c15922d97dfa4f1b2962`.

## Ten observed problems and decisions

1. Direct journeys repeat train, route and endpoint times. Keep identity in the sheet header and one strong time range; start the content with the stop timeline. Multi-leg journeys retain individual leg summaries.
2. Normal on-time styling competes with real exceptions. Use normal ink for confirmed on-time values; keep amber/red, struck-through schedules, platform changes and accessible status labels.
3. The board places time beneath the row, making destinations harder to scan. Align destination with time and platform on the right; cap destinations at two lines.
4. Station metadata/KPIs compete with boarding tasks. Render these only within Info; keep Tafel/Linien/Info, departure/arrival, product filters and search in the primary view.
5. V40 header/material overrides accumulated across eight releases. Consolidate theme/material tokens and the transport/material rules instead of adding another conflicting colour layer.
6. One glass strength cannot serve every role. Clear map controls, regular half sheets, elevated menus, expanded sheets and a continuous navigation surface now have distinct materials.
7. Sticky headers can expose readable body text underneath. Use an elevated scroll-edge material; preserve opaque no-filter, reduced-transparency and forced-colour fallbacks.
8. Coarse passenger bands can demote a known major hub. Four marker classes take the strongest evidence from source bands, hub identity and network activity; no passenger counts are estimated.
9. Navigation can show two active destinations when Mehr opens. Mehr exclusively owns the active state while open; journey state remains intact.
10. Browser QA mainly samples a few widths and realtime cases. Retain those interaction tests and add a complete 320/360/390/430/768/1024/1440/1920 Light/Dark product matrix, including real scrolling and material diagnostics.

## Reference analysis

Official Apple HIG materials, layout, sheets, tab bars, accessibility, motion and maps guidance: functional materials should support navigation and content hierarchy; progressive disclosure and reliable contrast take priority over effects. Public Apple Maps emphasizes glanceable navigation; Wallet groups task-relevant information. DB Navigator emphasizes concrete travel times and operational changes. These principles inform the hierarchy without copying visual assets or branding.

Sources read during this work:

- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/sheets
- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://www.apple.com/maps/
- https://www.apple.com/wallet/
- https://www.bahn.de/service/mobile/db-navigator
- Official Leaflet CircleMarker and zoom documentation via Context7.

Flighty, Transit and Citymapper official sites returned HTTP 403 in this cloud; Google Maps returned a JavaScript shell. No visual comparison with their current interfaces is claimed.

## Material and data boundaries

Glass is a functional surface with different light/dark colour, translucency, blur/saturation and inner-edge/shadow calibration. It is not a recreation of a proprietary native rendering engine. Flat rows remain inside the shell. Motion stays at 260 ms and reduced motion disables it. OSM tiles, provider, attribution, APIs, realtime thresholds and trip geometry are unchanged. All journey provenance/operator/accessibility/occupancy information remains accessible in Reiseinformationen.

## Verification and visual gate

Screenshots come from Chromium rendering the actual application with deterministic, explicitly labelled journey/board fixtures. They are not generated imagery and do not prove live API availability. The complete matrix reports tile load counts, overflow, sheet geometry, active tab ownership and computed material values. It also captures the scrolled journey header.

This cloud's initial screenshots have no loaded OSM basemap. Therefore local layout/interaction checks alone cannot establish final map/material visual quality. Full visual approval and merge require checking actual screenshots from an environment that can load the existing OSM tiles; a passing CI status alone is insufficient. No arbitrary self-score is used to substitute for this missing evidence.
