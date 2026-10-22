# BahnConnections V48 · Design direction

Status: self-authored redesign brief derived from the existing product, current codebase and the App Designer process.

## Brief

BahnConnections is a map-first rail companion for people who need to understand a station, a train or a connection quickly. The core action in the first ten seconds is either searching a station/connection or reading the current rail situation directly on the map.

The product should feel **precise, calm, spatial**. Existing assets and constraints are retained: BahnConnections name and B-mark, DB-red action language, live map, journey planner, station board, station hierarchy, light/dark mode, responsive web/PWA, current data provenance and accessibility behavior.

This is a redesign, not a product rewrite. No transport data, routes, station logic, navigation destinations or accessibility modes may disappear.

## Current app audit

### Keep
- map remains the visual ground and dominant information surface
- current four-item mobile navigation
- draggable mobile sheet with expanded/half/collapsed/closed states
- desktop planner/map/inspector workflow
- live departure board, station lines, journey alternatives and realtime semantics
- station-size hierarchy and official station-name fixes from V47
- DB-red for the primary action/selection role
- system-native icon and type behavior
- reduced motion, reduced transparency, forced-colors and high-contrast fallbacks

### Lose
- nested glass-on-glass surfaces where a parent already establishes depth
- equal visual weight for chrome, content controls and data rows
- uniform small type scale that makes important travel information compete with metadata
- decorative specular gradients on every glass object
- card-like borders/shadows used merely to group content
- overly opaque mobile sheets in partial states

### Unknown / requires visual QA
- exact amount of transparency over dense map areas
- whether the mobile half-sheet should sit 8 or 10 px from the sides
- whether station and journey hero type can be increased further on 320 px devices

## Three directions explored

### A · Leitstand
**BahnConnections is a quiet railway control room with the map as the room and glass chrome as the instrument layer.**

Source family: place.  
Ground: light map / dark map.  
Type: system grotesque with strong size contrast and tabular transport numbers.  
Accent: railway red for actions and selection only.  
Richness: the real map, moving rail geometry and optical glass material.

### B · Abfahrtstafel
**BahnConnections is a departure board you can enter.**

Source family: object.  
Ground: dark.  
Type: condensed/mono-forward.  
Accent: amber.  
Richness: dense timetable typography and illuminated status rows.

Rejected because it would make the whole product feel like a board, weakening the map and journey-planning use cases.

### C · Netzplan
**BahnConnections is a living printed network atlas.**

Source family: printed.  
Ground: saturated blue field.  
Type: expanded grotesque.  
Accent: warm red/orange.  
Richness: line geometry and graphic blocks.

Rejected because the strong colour field competes with real map tiles and semantic transport colours.

## Chosen direction

**A · Leitstand**.

The map is the hero. Chrome floats above it; journey and station content is flat and legible. Liquid Glass is therefore a navigation/material system, not a decoration applied to every card.

## Category defaults refused

The redesign explicitly refuses the generic transport-app combination of white cards stacked over a pale map, blue everywhere, five equally prominent tabs, dashboard KPI tiles and a separate shadow around every group. It also refuses the opposite overcorrection: a sterile black/grey instrument panel with monospaced text everywhere.

## Design tokens

Light:
- ground: map / #eef2f4 fallback
- raised: #f8fafb
- ink: #202b32
- ink-2: #53636d
- rule: cool translucent ink
- accent/action: BahnConnections red
- positive/warning/negative remain semantic only

Dark:
- ground: neutral dark map
- raised: #1b1e21
- ink: #f4f5f7
- ink-2: #a9afb6
- glass elevation gets lighter, not darker

Type:
- UI family: native system stack
- display: 28–34 px equivalent for decisive station/journey moments
- title: 18–22 px
- body: 15–16 px
- metadata: 12–13 px
- live times and aligned figures use tabular numerals

Radius family:
- controls: 14 px
- navigation capsules: 18–24 px
- partial sheets: 28 px
- content groups use separators/spacing before containers

Spacing:
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64

## Content hierarchy

Core map screen:
1. map and station hierarchy
2. search
3. current mode/navigation
4. secondary map controls

Journey:
1. departure/arrival time range and train identity
2. origin → destination
3. disruption / transfer information
4. alternatives and secondary data

Station:
1. public station name
2. live board / lines / info tabs
3. current status and passenger context
4. technical metadata last

## Signature interaction

Trigger: select a station or journey from map/search.

Frames:
1. map remains stable and primary;
2. a partial glass sheet rises from the bottom and preserves visible map context;
3. expanding the sheet makes the material denser while content remains flat;
4. collapsing returns visual ownership to the map without losing task state.

Timing: existing native motion curve, ~260 ms.  
Haptics: not available on the web/PWA baseline.  
Reduced motion: existing preference disables animation.

## V48 implementation contract

- Do not change routing/data behavior.
- Do not add decorative map lines.
- Do not reintroduce mobile +/- zoom chrome.
- Preserve all 44 px touch targets and 16 px mobile input behavior.
- Glass is strongest on navigation/search/sheet chrome, quieter on content.
- Partial sheets float; expanded sheets attach more firmly.
- One visual hero per state.
- Test 320, 360, 390, 430, 768, 1024, 1440 and 1920 layouts through the existing QA workflow.
