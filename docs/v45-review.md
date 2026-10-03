# V45: Passenger meaning, personal settings and calmer glass

## Corrections

Marker radius previously mixed coarse passenger classes with modeled train stops, direct destinations and hub flags. Now only published daily passenger volume or the DB passenger class controls size. Network importance affects zoom visibility only. Known counts use square-root radius scaling (circle area tracks volume), bounded for legibility. Unknown stations are small and hollow; non-passenger DB operating points are excluded from the contextual layer. Selection and journey context remain visual interaction states, not passenger claims.

The legend, keyboard labels, tooltip and station information distinguish an exact published daily figure, a coarse DB class and missing data. The 20 published counts use one consistent primary source: DB InfraGO survey 2024, Bundestag paper 21/2573, page 2 (published 2025-11-04), https://dserver.bundestag.de/btd/21/025/2102573.pdf. The response distinguishes travellers from visitors; visitor estimates are not added. Matching uses curated station IDs and exact normalized published names, never a proximity guess. The raw official values are retained; no arbitrary multipliers or estimated visitor additions are applied. Historical numbers are not live measurements. Source and year remain visible.

Netzlabor and its simulation controls are no longer imported or rendered. Desktop and mobile expose Settings & Profile. Appearance, accessibility, animation preference and location opt-out persist. Settings uses a native modal dialog to trap focus, supports Escape, restores focus and fits small screens.

Glass surfaces use optical highlights and translucent backgrounds. Content rows remain flat. Entry, tab and press animations are brief; the operating system and the user's reduced-motion setting override CSS and map movement. High contrast, reduced transparency and browser fallback remain supported.

## Location behavior

Automatic location is enabled by default **only when browser permission is already granted**. Device GPS being enabled is insufficient to bypass browser permission. Unsupported permission queries leave an explicit location button. Returning to the foreground rechecks permission; background tracking is paused. Stopping location persists opt-out across reloads. Accuracy is no longer artificially capped at 2 km. The nearest station can become the journey origin, and the existing walking route is retained.

## Profile and plans

Profiles are device-local, not authenticated accounts. Free remains usable. Plus is explicitly planned, and the read-only subscription API fails closed. See `subscription-readiness.md` for the server, provider and security work needed before charging.

## Validation

The UI audit asserts that hub/network flags cannot fabricate volume and verifies count-to-area scaling. Browser QA covers profile saving, settings tabs, reduced motion, Escape, overflow at 320/390/1440 pixels, permission-granted location auto-start and persistent opt-out. It retains the existing eight-width, two-theme journey, board and map matrix and realtime scenarios. Browser geolocation and timetable fixtures do not certify real GPS hardware or upstream provider uptime.
