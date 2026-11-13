# US8 – Show trackpoint tooltip

| Status | Iteration | Persona |
|--------|-----------|---------|
| Planned | [9](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to render a tooltip menu that shows whenever I hover the route track in the map
So that I can show distance, ride time and estimated time of being at that point along the route
For that feature, use the extrapolated times from the timetable

## Acceptance criteria

Proposed – the tests are written with the iteration.

| #    | Criterion | Verified by |
|------|-----------|-------------|
| 8.1  | Hovering the route on the map shows a tooltip for the nearest point of the track: distance from the start, elevation, riding time so far and the estimated time of passing (clock time once [US6](us06-start-time.md) is done). | *proposed* |
| 8.2  | Times are interpolated within the segment from the timetable (riding time proportional to the segment's estimate, including rests at earlier controls). | *proposed* |
| 8.3  | The same position is highlighted on the elevation profile while hovering the map. | *proposed* |
| 8.4  | The tooltip also offers adding a checkpoint at that position. | *proposed* |
| 8.5  | On touch devices the tooltip opens on tap without adding a checkpoint by accident. | *proposed* |
