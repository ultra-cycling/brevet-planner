# US9 – Move existing checkpoints

| Status | Iteration | Persona |
|--------|-----------|---------|
| Planned | [8](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to move existing tooltips along the track
So that I can re-position them after initial creation
Therefore allow dragging-and-dropping the checkpoints both on the track in the map and in the elevation profile

## Acceptance criteria

Proposed – the tests are written with the iteration. Moving a checkpoint by editing its distance is already possible
([US2](us02-mark-checkpoints.md), criterion 2.8).

| #    | Criterion | Verified by |
|------|-----------|-------------|
| 9.1  | An intermediate checkpoint marker can be dragged along the track on the map; it stays snapped to the track while dragging. | *proposed* |
| 9.2  | A checkpoint line on the elevation profile can be dragged along the distance axis. | *proposed* |
| 9.3  | Dropping updates distance, segments, control window (unless overridden) and timetable; name, rest and overrides are kept. | *proposed* |
| 9.4  | A checkpoint can't be dropped within 100 m of another checkpoint; the order of the checkpoints is renumbered when it passes another one. | *proposed* |
| 9.5  | Start and finish can't be dragged. | *proposed* |
| 9.6  | Escape while dragging cancels the move. | *proposed* |
