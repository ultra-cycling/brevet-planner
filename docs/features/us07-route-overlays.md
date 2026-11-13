# US7 – Overlay for route in map

| Status  | Iteration                  | Persona               |
|---------|----------------------------|-----------------------|
| ✅ Done | [6](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to overlay the route track on the map with an color gradient overlay
So that I can highlight e.g.

- road gradient
- daytime / nighttime during expected time of riding

Therefore, provide an extendible overlay-mechnism that allows for further overlays later on.

## Acceptance criteria

| #   | Criterion | Verified by |
|-----|-----------|-------------|
| 7.1 | An overlay can be selected for the route on the map (or none, the default); the selected overlay colours the route line and shows a legend. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *shows the plain route until an overlay is selected*; [route-overlays.spec.ts](../../e2e/route-overlays.spec.ts) – *the road gradient colours the route, the legend names every class* |
| 7.2 | *Road gradient* colours each part of the route by its gradient, averaged over 200 m: descent (below −2 %), flat (−2 to 2 %), moderate (2 to 5 %), steep (5 to 8 %), very steep (8 % and more). Without elevation data the overlay explains that it isn't available. | [overlays.test.ts](../../src/domain/overlays/overlays.test.ts) – *measures the gradient in %*, *classifies the route by gradient*, *is not available without elevation data*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *colours the route by road gradient, with a legend that names every colour*; [route-overlays.spec.ts](../../e2e/route-overlays.spec.ts) |
| 7.3 | *Daylight* colours the route by whether the rider is expected there by day, at dawn/dusk (civil twilight) or at night – from the time at each point (extrapolated from the timetable), the start ([US6](us06-start-time.md)) in the selected time zone and the position of the sun at that place. It follows changes of start, time zone and pace. | [sun.test.ts](../../src/domain/sun.test.ts); [timeZone.test.ts](../../src/domain/time/timeZone.test.ts); [timeAlongTrack.test.ts](../../src/domain/timeAlongTrack.test.ts); [overlays.test.ts](../../src/domain/overlays/overlays.test.ts) – *classifies the route by the expected time and the sun at that place*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *colours the route by daylight from the timetable, the start and the time zone*; [route-overlays.spec.ts](../../e2e/route-overlays.spec.ts) – *daylight shows where the rider is expected by day, at dusk and at night* |
| 7.4 | Overlays are colour-blind safe (neighbouring classes differ in lightness) and never rely on colour alone: the legend names every class and its distance in km. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *colours the route by road gradient, with a legend that names every colour* |
| 7.5 | Overlays are registered like time models: a new overlay is added without changing the map component. | [overlays.test.ts](../../src/domain/overlays/overlays.test.ts) – *offers road gradient and daylight*, *rejects duplicate ids* |
| 7.6 | With an overlay the track can still be clicked to add a checkpoint; the panel stays inside the map, leaves the zoom buttons free and the track is fitted next to it. | [route-overlays.spec.ts](../../e2e/route-overlays.spec.ts) – *with an overlay the track can still be clicked to add a checkpoint*, *the overlay panel stays inside the map and leaves the zoom buttons free* |

## Implementation notes

- Overlays: `src/domain/overlays/` – `RouteOverlay` interface, `OverlayRegistry`, `gradientOverlay`,
  `daylightOverlay` (see [plan.md](../plan.md#route-overlays)).
- An overlay splits the track into runs of equal class; runs shorter than a minimum length (gradient: 100 m) are
  merged into their neighbour so GPS noise doesn't fragment the line. Each run is drawn as its own polyline above the
  route.
- Time at each track point: `src/domain/timeAlongTrack.ts` – departure at the previous control plus the time model's
  estimate for the part of the segment up to the point (also the basis for [US8](us08-trackpoint-tooltip.md)).
- Sun position: low-precision USNO formulas (`src/domain/sun.ts`); day above −0.833°, civil twilight down to −6°.
- The start is entered as wall-clock time; to compare it with the sun it needs the time zone of the start, chosen in
  the plan settings (default: the browser's). Elapsed time is real time, so a DST change during the ride doesn't
  matter for the overlay.
- The overlay selection is held in memory, like the rest of the plan (see [US5](us05-multiple-route-plans.md)).
