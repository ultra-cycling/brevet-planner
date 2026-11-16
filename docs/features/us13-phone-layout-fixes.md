# US13 – Fix the phone layout on iPhone

| Status                 | Iteration               | Persona               |
|------------------------|-------------------------|-----------------------|
| Backlog (details open) | [–](../plan.md#backlog) | Long-distance cyclist |

As a long distance cyclist
I want the phone view to display correctly on my iPhone
So that I can read the map, the elevation profile and the timetable during the ride

## Current behaviour

On the iPhone the elevation profile overlaps other content of the screen. The phone layout
([plan.md → Phone layout](../plan.md#phone-layout)) is only tested in a Chromium phone viewport (390 × 844), not in
Safari/WebKit, which handles `dvh`, fixed headers and SVG sizing differently.

## Acceptance criteria

Draft – further instructions from the product owner will follow.

| #    | Criterion                                                                                                                                 | Verified by |
|------|-------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| 13.1 | On iPhone Safari (current iOS, portrait and landscape) map, elevation profile and timetable cards never overlap each other or the header. | *proposed*  |
| 13.2 | The browser tests run the phone layout in WebKit (Playwright `iPhone` device profile) in addition to Chromium.                            | *proposed*  |
| 13.3 | Safe areas (notch, home indicator) and Safari's dynamic toolbar don't hide content.                                                       | *proposed*  |

## Open questions

- Screenshots and the iPhone/iOS version where the overlap occurs.
- Further changes to the phone view (to be provided).
