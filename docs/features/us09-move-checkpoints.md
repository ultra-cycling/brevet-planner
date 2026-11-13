# US9 – Move existing checkpoints

| Status  | Iteration                  | Persona               |
|---------|----------------------------|-----------------------|
| ✅ Done | [8](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to move existing tooltips along the track
So that I can re-position them after initial creation
Therefore allow dragging-and-dropping the checkpoints both on the track in the map and in the elevation profile

## Acceptance criteria

| #   | Criterion | Verified by |
|-----|-----------|-------------|
| 9.1 | An intermediate checkpoint marker can be dragged on the map; it stays snapped to the track while dragging (also when dropped beside the line), and the profile shows its position meanwhile. | [move-checkpoints.spec.ts](../../e2e/move-checkpoints.spec.ts) – *a marker dragged on the map moves along the track, the control window follows*; [ElevationProfile.test.tsx](../../src/components/track/ElevationProfile.test.tsx) – *shows a checkpoint dragged on the map at its current distance* |
| 9.2 | A checkpoint line on the elevation profile can be dragged by its number along the distance axis; the line doesn't jump when grabbed beside its centre, and the drop doesn't add a checkpoint. | [ElevationProfile.test.tsx](../../src/components/track/ElevationProfile.test.tsx) – *drags a checkpoint line by its number to another distance*, *keeps the grab offset: grabbing beside the line does not make it jump*; [move-checkpoints.spec.ts](../../e2e/move-checkpoints.spec.ts) – *a checkpoint line is dragged by its number on the elevation profile* |
| 9.3 | Dropping updates distance, segments, control window (unless overridden) and timetable; name, rest and overrides are kept; the move is announced to screen readers. | [checkpoints.test.ts](../../src/domain/checkpoints.test.ts) – *keeps name, rest and overrides, takes the rule window of the new place and renumbers*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *moves a marker dropped on the map: distance, window and timetable follow, name and rest stay* |
| 9.4 | A checkpoint can't be dropped within 100 m of another checkpoint, the start or the finish – it stays in place and a message explains why; moving it past another one renumbers the controls. The same rule applies to the distance entered in the table. | [checkpoints.test.ts](../../src/domain/checkpoints.test.ts) – *is blocked within 100 m of another checkpoint, the start or the finish – but not by itself*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *renumbers the checkpoints when one is moved past another*, *keeps the checkpoint in place when it is dropped within 100 m of another one*, *applies the same rule to the distance entered in the table*; [move-checkpoints.spec.ts](../../e2e/move-checkpoints.spec.ts) – *a checkpoint can not be dropped next to another one, and moving past it renumbers* |
| 9.5 | Start and finish can't be dragged. | [move-checkpoints.spec.ts](../../e2e/move-checkpoints.spec.ts) – *start and finish stay at the ends of the track* |
| 9.6 | Escape while dragging cancels the move, on the map and on the profile. | [move-checkpoints.spec.ts](../../e2e/move-checkpoints.spec.ts) – *Escape while dragging on the map cancels the move*; [ElevationProfile.test.tsx](../../src/components/track/ElevationProfile.test.tsx) – *cancels the drag with Escape* |
| 9.7 | On phones (read-only) checkpoints can't be dragged. | [phone.spec.ts](../../e2e/phone.spec.ts) – *a plan prepared on a wider screen is shown as cards with arrival, status, window and buffer*; [ElevationProfile.test.tsx](../../src/components/track/ElevationProfile.test.tsx) – *cannot be dragged without onCheckpointMove* |

## Implementation notes

- Map: Leaflet's marker dragging; on every `drag` event the marker is snapped onto the track (`snapToTrack`). Its
  position prop is memoised – a new array on each render would make react-leaflet move it back during the drag.
  Escape disables and re-enables the marker's dragging (Leaflet has no cancel) and puts it back.
- Profile: pointer events with pointer capture on the number badge; the distance is taken from the pointer position
  (not snapped to a track point), minus the offset at which the badge was grabbed.
- All moves (map, profile, km input) go through one function in `App.tsx` that checks the 100 m rule
  (`moveConflict`) and announces the result.
- Keyboard alternative to drag and drop: the km field of the checkpoint in the timetable.
- The story text says "tooltips" – meant are the checkpoints (title of this story).
