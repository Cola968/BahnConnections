# BahnConnections V49 · Mega Prompt

You are the senior product designer, interaction designer, frontend architect and QA engineer for **BahnConnections**.

Repository: `Cola968/BahnConnections`
Working branch: `design/v49-ui-refactor`
Stack: React 19, TypeScript 5.9, Next/vinext, Leaflet, PWA, Cloudflare runtime.
Do not replace the product with a mockup. Work in the existing application and preserve the real rail/data logic.

## Mission

Turn BahnConnections into a polished, credible, native-feeling rail companion that can compete visually and interaction-wise with top-tier transport and mapping apps.

The app must feel:
- spatial
- calm
- premium
- fast
- railway-specific
- clearly human-designed

It must **not** look like:
- an AI-generated dashboard
- stacked generic cards
- a website squeezed into a phone
- a glassmorphism demo
- an Apple clone with no railway identity
- a DB Navigator copy

The map is the visual ground. UI chrome floats above it. Data is the product.

## Current technical reality

The project has accumulated multiple visual eras:
- legacy/global rules in `app/globals.css`
- shell rules in `app/styles/workspace.css`
- transport presentation in `app/styles/transport.css`
- Liquid Glass rules in `app/styles/liquid-glass.css`
- settings/profile rules in `app/styles/profile.css`
- V48 overrides in `app/styles/designer-v48.css`

Critical components are often styled in more than one file. Examples include:
- mobile navigation
- mobile sheets
- station search
- panel tools
- settings
- station tabs

Do not solve every issue by appending another override. Reduce competing ownership where practical. New V49 rules must have a documented owner and obsolete rules should be removed or neutralized safely.

## Non-negotiable product behavior

Preserve:
- live map
- station hierarchy
- realtime departures and arrivals
- realtime delay/cancellation/platform semantics
- journey planning
- journey alternatives
- station board
- lines and station information
- saved routes
- profile/home station
- location
- dark mode
- high contrast
- large text
- reduced motion
- reduced transparency
- PWA/install behavior
- existing API routes
- Transitous/MOTIS/DB verification semantics
- current station-name sanitation
- responsive QA and live API smoke tests

Do not remove functionality merely to make the UI cleaner. Relegate secondary functions behind progressive disclosure instead.

## V49 design system

### Material model

Use four material roles only:

1. **Ground**
   - map or page background
   - never glass

2. **Navigation glass**
   - bottom navigation
   - top floating controls
   - active navigation lens
   - strongest blur/refraction

3. **Sheet glass**
   - partial mobile sheet
   - floating desktop inspector
   - settings surface
   - calmer than navigation glass

4. **Data surface**
   - timetable rows
   - journey timeline
   - search results
   - mostly flat, high legibility
   - use separators and spacing before adding cards

Glass must express depth and hierarchy, not decorate every rectangle.

### Color

- keep BahnConnections red as action/selection color
- semantic green/amber/red only for realtime meaning
- do not use color alone to communicate status
- map colors must remain readable below glass
- dark mode must be neutral and luminance-driven
- avoid random blue/purple gradients

### Typography

Create a visibly stronger hierarchy:
- hero time / decisive travel time
- route/train title
- station/title
- body
- metadata
- technical/debug information last

Use tabular numerals for times.
Avoid excessive bold text.
Avoid tiny grey metadata blocks everywhere.

### Radius

Use a small radius family only:
- controls: ~14px
- navigation: ~20–24px
- mobile sheets: ~28–30px
- avoid every nested child having its own rounded card

## Motion system

Motion is mandatory, but purposeful.

Define:
- micro: 120–180 ms
- control: 180–260 ms
- view: 260–420 ms
- sheet: 320–480 ms

Use spring-like cubic-bezier curves for:
- navigation lens movement
- sheet settle
- toggles
- active tab movement

Required interactions:
- bottom navigation active glass lens visibly glides between items
- active icon subtly lifts/scales
- labels settle with the icon
- mobile sheet animates into the viewport when panel type changes
- half/collapsed/expanded states settle smoothly
- settings tabs use the same moving-lens language
- station tabs and board mode tabs have visible active-state movement
- expanded board rows animate open/closed
- journey alternatives animate selection
- buttons have press response
- modal/sheet opening has depth, not a plain fade

Never animate:
- realtime numbers continuously
- map pan merely for decoration
- long text
- large background gradients

When reduced motion is enabled:
- preserve state clarity
- remove spring/slide movement
- keep only near-instant opacity/state changes where necessary

## Mobile architecture

### Single-scroll rule

A mobile sheet must have **one scrolling content area**.

Do not let both `.mobile-sheet-panel` and `.panel-body` scroll simultaneously.

Preferred model:
- `.mobile-sheet-panel`: flex column, overflow hidden
- `.panel-tools`: fixed/flex-none header within sheet
- `.panel-body`: the only vertical scroll container
- sticky subnavigation is allowed inside `.panel-body`

This is required to prevent:
- clipped board controls
- nested scrollbars
- sticky collisions
- strange scroll restoration
- scroll gestures fighting sheet dragging

### Map screen

- map owns most of the viewport
- top controls are small floating glass objects
- search dock floats above bottom navigation
- bottom navigation must never look like a white toolbar pasted over the map
- no mobile +/- Leaflet zoom controls
- tap targets >=44px
- attribution remains accessible but visually subordinate

### Bottom navigation

Items:
- Karte
- Planen
- Abfahrten
- Mehr

Requirements:
- transparent/refraction-heavy nav glass
- moving active lens
- clear selected color
- selection animation must be visible, not theoretical
- More remains selected for secondary More destinations
- no giant opaque white active tile

### Planner

Rebuild the planner visually around a railway route concept:
- start and destination visually connected
- swap action integrated, not floating awkwardly
- primary action always reachable
- departure/arrival segmented control must feel intentional
- options collapsed by default
- remove redundant explanatory text
- preserve map context in half state

### Journey

Current journey must no longer look like a long white web dialog.

Create:
- a strong travel hero at top
- time range as primary hero
- train/service identity as secondary
- origin/destination as clear route context
- duration/transfers/status as compact metadata
- alternatives below hero, visually subordinate
- timeline below with clearer current structure
- endpoints visually stronger
- realtime/cancellation states integrated without overloading red

For single-leg journeys, avoid duplicating the train identity repeatedly.

### Station / Board

The station screen must feel like a live railway instrument, not a table embedded in a sheet.

Fix:
- no clipped board controls
- no nested scroll
- station tabs remain readable and stable
- departure/arrival mode visually clear
- product filters horizontally scroll if necessary
- filter/compact/open-window actions become secondary
- mobile can hide nonessential actions behind one compact control
- search remains available but does not dominate
- board rows prioritize destination + time + service + platform
- delayed/cancelled states remain readable at a glance
- expanded row animates and reveals trip path cleanly
- footer/source information stays subordinate

### More

Keep it small.
Prefer 4–5 real destinations/actions over an icon dashboard.

Possible:
- Einstellungen
- Netzreport
- Website
- App installieren
- help/about only if useful

Do not place map technical controls here if they belong to the map view button.

### Settings

Make settings feel like a native app settings surface:
- Profile
- App
- Plus

Remove:
- duplicate descriptions
- implementation/Stripe language
- explanations users can infer
- repeated “planned/not available” messaging

Keep:
- profile/name
- home station
- saved routes
- theme
- large text
- high contrast
- reduced motion
- location
- plan/pricing status

Rare/destructive actions go under disclosure.

## Tablet

640–1023px must not be a stretched phone.

- center sheets
- bound sheet width
- keep visible map context
- adapt navigation size
- avoid full-width dialogs unless content requires it
- test 768 portrait and 1024 transition boundary carefully

## Desktop

Desktop should look like a real mapping workspace:
- map remains hero
- left planner is narrow, deliberate and task-focused
- right inspector only exists when needed
- no card-on-card dashboard
- desktop navigation is compact glass chrome
- reduce dead padding
- journey inspector gets stronger hierarchy
- settings dialog remains compact and editorial
- no mobile metaphors copied blindly to desktop

## CSS / architecture requirements

1. Document selector ownership for V49.
2. Do not add another 40 KB override pile.
3. Move toward:
   - tokens = values
   - workspace = layout
   - transport = railway/data presentation
   - profile = settings-specific styles
   - one final V49 system layer for shell/motion only
4. Remove obsolete selectors when safe.
5. Reduce `!important` use.
6. Avoid duplicate media-query blocks for the same component.
7. Use consistent breakpoints:
   - mobile/tablet <=1023px
   - desktop >=1024px
   - compact phone <=359px
   - short landscape <=520px height
8. Keep 16px minimum font size for text inputs on mobile.

## Performance

- no animation libraries unless absolutely necessary
- prefer transform/opacity
- avoid animating blur/filter continuously
- do not force expensive repaint on every map frame
- no layout thrashing during sheet drag
- requestAnimationFrame for drag updates
- preserve current map performance

## Accessibility

Keep:
- keyboard navigation
- focus-visible
- 44px mobile touch targets
- aria-current
- aria-expanded
- tab semantics
- forced colors
- reduced motion
- reduced transparency

Do not hide essential focus state behind glass.

## QA

Every meaningful visual change must be validated with the existing scripts.

Required:
- TypeScript
- ESLint
- audit:realtime
- audit:ui
- audit:billing
- audit:board
- production build
- mobile visual QA
- live network audit
- API smoke

Visual matrix:
- 320
- 360
- 390
- 430
- 768
- 1024
- 1440
- 1920

Check both light/dark where available.

Explicit visual checks:
- map initial
- planner
- journey
- journey scrolled
- station board
- station info
- More
- settings Profile/App/Plus
- saved routes
- collapsed/half/expanded/closed sheet
- landscape
- reduced motion
- reduced transparency
- large text
- high contrast

## Definition of done

V49 is not done because the build passes.

It is done when:
- no obvious clipping
- no nested mobile scroll
- no horizontal overflow
- no redundant scrollbars
- no opaque “fake glass” active nav tile
- navigation movement is clearly visible
- view changes feel intentional
- journey is visually stronger than metadata around it
- board is readable at a glance
- settings feel native and concise
- tablet does not look like stretched phone
- desktop remains map-first
- light and dark feel designed, not inverted
- all automated QA passes

## Working method

1. Audit current render and code before editing.
2. List the 10 highest-value UI defects.
3. Fix architecture defects before decoration.
4. Implement one coherent visual system.
5. Render screenshots.
6. Critique them harshly.
7. Iterate.
8. Only then merge/deploy.

Do not claim perfection. Keep iterating until the screenshots and interaction model are materially better than V48.
