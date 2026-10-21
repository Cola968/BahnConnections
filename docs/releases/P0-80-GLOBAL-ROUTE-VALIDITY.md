# P0 #80: shared route validity, 22 October 2026

Implementation on the existing PR #74 branch. No merge, Sites deployment, or claim that issue #80 is resolved.

## What the policy enforces

- `app/journey-validity.ts` is the common decision for all station IDs, transport regions, normalized journeys, and raw Transitous trips. A clear unresolved route-changing alert blocks use, including numeric GTFS-RT effects 1, 4, 7, and 9. Missing alerts mean **unverified**, never operator-verified.
- Attached provider alerts retain structured active periods and stop scope. Multiple intervals, epoch seconds, open intervals, inclusive starts/exclusive ends, UTC offsets, midnight, and DST are evaluated against travel events. Malformed scope cannot establish safety. No guessed replacement stops or times.
- Dresden's existing operator-backed rule remains bounded to its documented interval and now checks ordered stops and affected stop events, rather than only departure time. Available coordinates prevent applying this local rule to a different city.
- Planner candidates from all providers and optional enrichments pass the same gate. A warning-free duplicate cannot overrule a matching rejected service. Identity fallback requires line, near-equal scheduled departure, and the same ordered endpoints; this is conservative matching, not cross-feed ID resolution.
- Station boards run the gate before JSON, the first NDJSON frame, and optional source verification. `verify=0`, arrivals, timetable fallback, station call lists, and services share the decision. Filtered trips and reasons are returned separately, not fabricated as cancellations.
- Trip details distinguish a route conflict (HTTP 409, blocked `routeValidity`) from a provider/network failure (HTTP 502).
- Radar no longer fetches map geometry directly from the browser. `/api/radar` checks each unique candidate against current full-trip detail, checks ordered segment endpoints and time containment, and hides rejected/unavailable candidates. Maximum 180 IDs, six concurrent validations, shared 12-second budget. Partial coverage is explicitly returned. This adds provider traffic and can reduce visible vehicles when the budget/provider fails; performance/live coverage needs measurement before release.
- Client conflict invalidation clears matching selected routes, station details/calls, and radar selection. A late detail response started before a known conflict cannot resurrect it. Successful detail promises are no longer cached indefinitely. Ordinary network errors remain distinct from proven route conflicts.
- Calendar actions requery the planner before ICS/Google/Outlook export and require an identical scheduled stop signature. Offline, changed, absent, or blocked results prevent export. Pure calendar/text functions also apply the shared policy. Already downloaded external calendar files cannot be revoked.
- The service worker explicitly bypasses API caches. Normal JSON board responses and trip errors also use `no-store`.

## Required deterministic checks

`global-route-validity-audit.mjs`, `global-route-api-audit.mjs`, `route-response-audit.mjs`, and `radar-route-audit.mjs` are mandatory CI gates, separate from deferred radar rendering performance QA.

They exercise active/expired/future/malformed alerts, numeric and string effects, stop chronology, mixed missing evidence, Dresden sequence and reverse direction, work-window crossing, midnight, repeated DST hour, secondary-provider bypass, 215 curated station IDs and an uncatalogued stop, actual board JSON/NDJSON/arrival and services handlers, trip 409, all calendar/text formats, late responses, full radar evidence, changed radar endpoints, and fresh export comparison.

These fixtures are synthetic. Existing nationwide and Dresden audits remain; previous warning-only expectations were deliberately updated to require blocking unresolved active changes. Browser fixtures now target the application radar endpoint; they are UI fixtures, while the server handler is tested separately with controlled upstream responses.

## Unresolved acceptance criteria — keep #80 open

This change does not provide independent nationwide operator-feed ingestion, an authoritative licensed coverage/freshness registry, or complete cross-feed trip/stop/steig ID alignment. Provider-attached alerts can themselves be absent or stale. Free text is not automatically converted into an authoritative route or expiry date. Stop coordinates and replacement bus routes are not invented. No automatic claim of operator confirmation is made for matching timetables or for a successful HTTP request.

Board rows can be checked only against the route information/alerts actually present in that response and the documented local rule; complete trip-only alerts are enforced when trip details/radar are fetched. A full nationwide operator evidence index is still needed to enforce those conflicts across independent requests, workers, and providers before every board row is emitted. In particular, unknown cross-feed identity and network failures cannot prove that a route is correct.

Before production: obtain permitted sources, capture dated operator comparisons for Dresden plus another region and replacement services, verify shifted platforms/coordinates, measure radar request volume and partial coverage, run browser/real-device acceptance, and keep a reviewed rollback target. A rollback must disable unsafe recommendation paths rather than restore known-invalid route output. Do not close #80 or advertise all routes as correct on the basis of these tests.
