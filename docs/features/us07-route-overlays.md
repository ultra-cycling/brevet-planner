# US7 – Overlay for route in map

| Status  | Iteration                  | Persona               |
|---------|----------------------------|-----------------------|
| Planned | [9](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to overlay the route track on the map with an color gradient overlay
So that I can highlight e.g.

- road gradient
- daytime / nighttime during expected time of riding

Therefore, provide an extendible overlay-mechnism that allows for further overlays later on.

## Acceptance criteria

Proposed – the tests are written with the iteration.

| #   | Criterion                                                                                                                                                                                                               | Verified by |
|-----|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| 7.1 | An overlay can be selected for the route on the map (or none); the selected overlay colours the route line and shows a legend.                                                                                          | *proposed*  |
| 7.2 | *Road gradient* colours each part of the route by its gradient in % (e.g. descent, flat, moderate, steep, very steep).                                                                                                  | *proposed*  |
| 7.3 | *Daylight* colours the route by whether the rider is expected there by day, at dusk/dawn or at night – based on the timetable, the start time ([US6](us06-start-time.md)) and sunrise/sunset at that position and date. | *proposed*  |
| 7.4 | Overlays are colour-blind safe and never rely on colour alone (legend with labels).                                                                                                                                     | *proposed*  |
| 7.5 | Overlays are registered like time models: a new overlay is added without changing the map component.                                                                                                                    | *proposed*  |
