# BahnConnections V49 · Mega Prompt

You are redesigning and refactoring the existing BahnConnections product in the repository `Cola968/BahnConnections`.

Do not build a concept mockup. Work in the real codebase. Preserve transport logic, realtime behavior, routes, data sources, accessibility, PWA behavior and existing QA coverage. The goal is to make the current product feel like one coherent, premium, native-feeling transport product rather than a collection of good individual screens.

## Repository reality

Current stack:
- Next 16 / React 19 / TypeScript 5.9
- vinext/Vite runtime
- Leaflet map
- responsive web/PWA
- current redesign lives on `design/app-designer-v48`
- current visual layers are split across `tokens.css`, `liquid-glass.css`, `workspace.css`, `controls.css`, `transport.css`, `profile.css`, `content-layout.css`, `designer-v48.css`
- `app/page.tsx` is currently very large and coordinates map, planner, station, journey, trip, menus and settings
- mobile QA already covers 320/360/390/430/768/1024 plus desktop widths, light/dark, board, planner, journey, settings and accessibility modes

## Product direction

BahnConnections should feel:
- precise
- spatial
- calm
- fast
- premium without looking decorative
- distinctly rail/transit, not generic SaaS
- native-feeling on mobile
- map-first

The map is the visual ground. Navigation/search/sheets are the floating material layer. Timetable/journey content is the information layer. Do not put glass on every card.

## Mandatory design principles

1. One visual hero per state.
2. Hierarchy must be obvious within one second.
3. Reduce repeated boxes, borders and helper text.
4. Use spacing and typography before adding containers.
5. Use red only for action, selection, disruption or critical state.
6. Use service colours only for real service identity.
7. Scheduled and realtime values must remain readable and tabular.
8. Every mobile interaction must work at 320 px.
9. Never rely on colour alone for state.
10. Preserve 44 px touch targets.
11. Respect safe areas, browser keyboard and dynamic viewport height.
12. Dark mode is designed, not inverted.
13. Reduced Motion and Reduced Transparency must remain first-class.
14. No decorative fake map lines or AI-looking gradients.
15. No generic dashboard KPI cards unless the data genuinely requires comparison.

## Current problems that must be fixed

### Mobile navigation
- bottom nav still reads as a floating white bar rather than one convincing glass material
- state changes are not visually expressive enough
- animation must be obvious but restrained
- the active glass lens should glide between items, not flash or swap
- icon and label should have a subtle spring response
- secondary views should keep More selected
- pressing an item should feel tactile
- no animation may break Reduced Motion

### Mobile sheets
- planner/station/journey sheets feel like variants of the same white rectangle rather than intentional product states
- sheet entry, state changes and content changes need coordinated motion
- collapsed/half/expanded states need different density
- expanded content should feel grounded, partial states should feel lighter/more transparent
- sheet title/chrome should remain visible without wasting vertical space
- remove empty visual zones
- dragging must remain stable

### Planner
- currently too form-like
- origin and destination should read as one route-building object
- visually connect From and To
- swap must feel integrated
- departure/arrival mode should read as a segmented control, not another unrelated box
- primary action must dominate
- advanced options must stay secondary
- saved commute actions should not compete with planning

### Journey
- current journey view is technically correct but visually flat
- departure/arrival time range should be the hero
- service identity and route endpoints need stronger hierarchy
- legs/stops should become a clear vertical journey timeline
- transfers need visible separation and warning hierarchy
- platform/realtime data must remain compact and scannable
- avoid giant cards around each leg

### Station
- current station sheet wastes vertical space before useful content
- station title, tab switcher and board should form one compact header region
- Tafel / Linien / Info should be a real segmented/glass control with animated selection
- the active station tab should move, not just change an underline
- board rows should feel denser and more like a premium departures board
- Info should prioritise passenger-relevant information and hide technical details by default
- remove or collapse duplicate station naming

### Settings
- mobile settings should feel like a native settings sheet, not a desktop modal scaled down
- fewer explanatory paragraphs
- clearer sections
- consistent moving glass tab control
- stronger switches and status rows
- destructive/local-storage actions hidden behind disclosure
- Plus should be concise and product-like, not implementation-focused
- settings should animate between tabs and sections without feeling busy

### Map chrome
- top-left brand and top-right map control should match the bottom navigation material
- floating search dock should visually belong to the same system
- map controls should not form unrelated white boxes
- preserve map visibility and station hierarchy
- no +/- controls on mobile

### Dark mode
- avoid muddy grey-on-grey
- glass edges should be lighter than their surfaces
- active state must remain legible
- map chrome should read as glass rather than opaque black
- semantic red/yellow/green must retain contrast

### Desktop
- desktop should not simply be mobile stretched wide
- keep map dominant
- use left planner / right inspector as instrument panes
- reduce form density in planner
- stronger journey inspector hierarchy
- consistent glass chrome with mobile
- no giant empty side areas

## Motion system

Define a small motion vocabulary and use it everywhere.

### Durations
- press: 120–160 ms
- small state change: 180–240 ms
- tab/lens travel: 320–440 ms
- sheet state transition: 360–480 ms
- modal/sheet entrance: 320–440 ms

### Curves
Use spring-like cubic bezier curves. Avoid linear/ease defaults.

### Required motion
- mobile nav lens glides between items
- active nav icon pops very slightly
- settings tab lens glides
- station tab lens glides
- planner mode selector glides
- sheet mount: fade + translate + tiny scale
- sheet collapse/expand: coordinated radius/opacity/material transition
- content switch: 6–10 px directional motion + fade
- search suggestions: scale/fade from anchor
- board rows: no constant animation; only subtle state-change highlight
- primary button press: scale to ~0.98, return with spring
- toggles: thumb spring, track colour transition

### Reduced motion
When reduced motion is active:
- disable springs and translated entrances
- keep only instant/very short opacity/state changes
- never remove functional feedback

## Architecture goals

- stop adding unrelated overrides to `designer-v48.css`
- create a dedicated V49 visual layer
- consolidate new V49 tokens and motion variables there
- where practical, add semantic wrapper classes rather than selector hacks
- do not rewrite transport logic
- do not split files merely for aesthetics, but start reducing pressure on `page.tsx`
- prefer small reusable presentational helpers for repeated segmented controls/status rows
- preserve current API contracts

## Required implementation passes

### Pass 1 — navigation/material
Unify bottom nav, search dock, top brand/control and sheet chrome.

### Pass 2 — planner
Recompose route inputs, time mode, primary action and saved routes.

### Pass 3 — journey
Recompose journey hero, timeline, leg spacing and transfer hierarchy.

### Pass 4 — station
Remove dead space, redesign station tabs, board density and info hierarchy.

### Pass 5 — settings
Turn mobile settings into a native sheet and simplify copy.

### Pass 6 — desktop
Apply the same hierarchy to planner and right inspector without copying mobile geometry.

### Pass 7 — dark/accessibility
Audit contrast, reduced motion, transparency and large type.

### Pass 8 — cleanup
Remove V48/V36/V35 overrides made obsolete by V49 when safe. Do not leave duplicate conflicting rules.

## Acceptance criteria

The work is not done until:
- 320, 360, 390 and 430 px have no horizontal overflow
- 768 and 1024 layouts are intentional, not stretched phone UI
- 1440 and 1920 desktop preserve map dominance
- light and dark mode are both visually designed
- planner, journey, station board, station info and settings each have distinct hierarchy
- mobile bottom nav has a visible moving glass lens
- station tabs have a visible moving selector
- settings tabs have a visible moving selector
- sheet entrance/state changes are visibly animated
- Reduced Motion disables nonessential movement
- no technical station suffixes leak into primary UI
- no mobile +/- map controls
- TypeScript, lint, audits, build and responsive QA are all green
- visual screenshots are inspected, not only test output

## Final review questions

Before declaring done, answer:
1. What is the hero on this screen?
2. What can be removed?
3. Is any element boxed only because spacing/hierarchy failed?
4. Is glass being used as material or decoration?
5. Does motion communicate state change?
6. Does the mobile view still work at 320 px?
7. Is the same information repeated twice?
8. Does this look like BahnConnections rather than a generic AI-designed dashboard?
9. Does dark mode feel intentionally designed?
10. Would the user notice the improvement immediately without being told what changed?

Do not stop at token/radius changes. If a screen still looks materially similar to the old composition, redesign its structure.
