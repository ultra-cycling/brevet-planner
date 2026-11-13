# US8 – Show trackpoint tooltip

| Status  | Iteration                  | Persona               |
|---------|----------------------------|-----------------------|
| ✅ Done  | [9](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to render a tooltip menu that shows whenever I hover the route track in the map
So that I can show distance, ride time and estimated time of being at that point along the route
For that feature, use the extrapolated times from the timetable

## Acceptance criteria

| #   | Criterion | Verified by |
|-----|-----------|-------------|
| 8.1 | Hovering the route on the map shows a tooltip for the point of the track under the pointer: distance from the start, climb accumulated up to there, expected time of passing (clock time and time after the start – or only the latter with *Since start*) and riding time so far. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *describes the hovered point: distance, climb so far, expected time and riding time*, *follows the selected time display*; [trackpoint-tooltip.spec.ts](../../e2e/trackpoint-tooltip.spec.ts) – *hovering the route shows distance, climb so far, expected time and riding time* |
| 8.2 | Times are extrapolated from the timetable: within a segment by the time model's estimate for the part up to the point; the expected time includes rests and waiting at earlier controls, the riding time doesn't. | [timeAlongTrack.test.ts](../../src/domain/timeAlongTrack.test.ts) – *separates the riding time from the rests*, *interpolates between track points*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *includes rests at earlier controls in the expected time, not in the riding time* |
| 8.3 | The same position is highlighted on the elevation profile (and as a point on the map) while hovering the map or while the popup is open. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *highlights the hovered position on the elevation profile*; [trackpoint-tooltip.spec.ts](../../e2e/trackpoint-tooltip.spec.ts) |
| 8.4 | The tooltip also offers adding a checkpoint at that position: "Click to add a checkpoint here" (mouse), *Add checkpoint here* button (touch). | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *describes the hovered point…*; [trackpoint-tooltip.spec.ts](../../e2e/trackpoint-tooltip.spec.ts) – *a tap shows the position in a popup and adds a checkpoint only on request* |
| 8.5 | On touch devices a tap opens the information as a popup without adding a checkpoint; adding is a second, deliberate step. On phones (read-only) the popup has no add button. | [trackpoint-tooltip.spec.ts](../../e2e/trackpoint-tooltip.spec.ts) – *a tap shows the position in a popup and adds a checkpoint only on request*; [phone.spec.ts](../../e2e/phone.spec.ts) – *tapping the map shows the expected time there but does not add checkpoints*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *has no "click to add" hint in the touch popup* |

## Implementation notes

- Times along the track: `timesAlongTrack` in `src/domain/timeAlongTrack.ts` (expected time and riding time at every
  track point, shared with the daylight overlay of [US7](us07-route-overlays.md)); `timesAt` interpolates between
  track points.
- Map: the wide transparent hit line above the route snaps the pointer onto the track (`snapToTrack`) on every
  mouse move; the tooltip content comes from `PositionInfo` via the `positionInfo` prop of `TrackMap`.
- Touch vs. mouse is decided per click by the pointer type of the event: a mouse click on a tablet still adds a
  checkpoint directly, a tap opens the popup.
