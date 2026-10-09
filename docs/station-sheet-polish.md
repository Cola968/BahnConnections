# V50.1: station sheet review

The work starts from `main` at `13010390c0f38642dd7973e6943a202010750eaf` on
`fix/station-sheet-liquid-space`. The existing `v41.1-liquid-polish` branch ends
at `d8f32b001083ec53943e04104195971c6bd69fd5`. It has 25 commits absent from
main; main has 15 commits absent from it. Merging that historical branch wholesale
would also import obsolete version metadata and competing CSS overrides.

Relevant changes were transferred into the current product: the exact platform
change from `db3453a`, the icon search action and quieter suggestions from
`c1bbeb2`/`a3b7163`, and the half-sheet translucency/material direction from
`22f184d`/`d8f32b0`. Existing V50 station-name normalization is reused and extended
to remove redundant S/U facility prefixes. The later realtime, map geometry,
billing, responsive layout and PWA behavior remain in place.

## Reproduced defect and structural fix

The title was already outside `.panel-body`, but `.station-section-tabs` was
sticky at `top:0` **inside** that scroller. Its transparent background exposed
the moving departure text underneath. A second stationary layer/offset would
retain the competing scroll planes.

`StationSubNavigation` now belongs to `PanelTools`. Title and tabs are one fixed
flex item; only the sibling `.panel-body` scrolls. No timetable text can move
behind the header because the scroller clips it below the header. The mobile
table heading is static/hidden. No hard-coded sticky offset or JS height observer
is needed for these layers.

`BoardToolbar` owns the departure/arrival mode and filter action. Product buttons,
search and advanced controls live in a bounded glass popover. Closing, Escape,
outside press and reset work without changing sheet size. A visible dot indicates
an active filter. The timetable keeps its geometry but is hidden while the filter
surface is open, preventing a second readable text plane behind the form.
Source information is disclosed in a details element; stale or
conflicting data retains a concise visible warning. Disruptions and platform
changes still use the shared realtime components and accessible labels.

## Measured vertical budget

390 × 844 CSS px, Berlin Hbf, normal font, half sheet:

| Layer | Before (px) | After (px) |
| --- | ---: | ---: |
| Drag/title row | 56 | 52 |
| Station subnavigation | 46 | 36 |
| Space below station tabs | 4 | 0 |
| Departure/arrival controls | 42 | 40 |
| Always visible product filters | 40 | 0 |
| Always visible search + margins | 55 | 0 |
| Aggregate disruption counts | 24 | 0 |
| Boundary lines | 2 | 2 |
| **Total before first departure** | **269** | **130** |

The joint header is 88 px (8 px drag area, 44 px title/actions, 36 px subnavigation).
Chrome decreases by 139 px (52%). The station half-sheet preset changes from
48dvh to 56dvh: approximately 405 to 473 px at this viewport. Four complete rows
fit instead of one; seven fit in the expanded sheet. Normal rows are 72 px at
390 px and 68 px at 320 px. Disruption rows have an 84 px minimum. The bottom
navigation decreases from 64 to 62 px plus safe area, with one shared material
and no separate active glass card.

## Material ownership

All shared glass colors, blur, saturation, highlights and shadows are defined in
`tokens.css`. The duplicate calibration in `liquid-glass.css` is removed. Half
and expanded sheets use their existing semantic roles at 38%/62% light density
and 36%/62% blue-charcoal dark density. Blur is 30/40 px. Historical V49 aliases
reference the shared tokens rather than introducing opaque content materials.
Rows are flat on the common sheet surface. Reduced transparency, high contrast,
forced colors and missing backdrop-filter have opaque fallbacks.

## Reproduction and evidence

Run the product development server, then:

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm audit:realtime
pnpm audit:ui
pnpm audit:board
pnpm audit:transport
pnpm audit:billing
pnpm audit:map
pnpm build
node scripts/station-sheet-qa.mjs http://localhost:3000 work/station-sheet-final
pnpm audit:layout -- 'http://localhost:3000/?station=berlin' work/station-polish-layout
pnpm audit:mobile -- http://localhost:3000 work/station-polish-mobile
```

The dedicated Chromium suite checks 320, 360, 390, 430, 768, 1024, 1440 and 1920 px
in both actual app themes, half/expanded states, scrolled header hit testing,
horizontal overflow, 390 px row count/budget, popover bounds, keyboard tabs,
arrival mode and long station names selected through the real autocomplete.
`report.json` records the current run and measurements. The workflow includes
the suite and uploads its screenshots as part of `responsive-qa`.

Screenshots render the actual app with deterministic timetable fixtures. They
are not generated mockups or evidence of current live departures. In this cloud
instance, the outbound proxy blocks Transitous and map tile access; map imagery
and live-provider availability require separately activated network settings.

The onboarding instance uses pnpm at
`/workspace/.cloud-tools/node_modules/.bin/pnpm`. Chromium requires
`XDG_CONFIG_HOME=/workspace/.cache/chromium-config`,
`XDG_CACHE_HOME=/workspace/.cache/chromium`, and
`BAHNCONNECTIONS_QA_NO_SANDBOX=1` within the isolated container. A built Workers
preview runs with `pnpm exec vite preview`; `pnpm start` has an existing unrelated
Node/`cloudflare:workers` runtime mismatch.
