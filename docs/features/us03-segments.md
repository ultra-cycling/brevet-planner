# US3 – Create segments from checkpoints

| Status | Iteration                  | Persona               |
|--------|----------------------------|-----------------------|
| ✅ Done | [3](../plan.md#iterations) | Long-distance cyclist |

As a long-distance cyclist
I want to create segments of the route from the checkpoints marked along the route
So that I can divide the route into multiple segments

## Acceptance criteria

| #   | Criterion                                                                                                                                                                                       | Verified by                                                                                                                                                                                                                                                                      |
|-----|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 3.1 | The controls divide the track into segments (start → CP1 → … → finish); without intermediate controls the whole track is one segment.                                                           | [segments.test.ts](../../src/domain/segments.test.ts) – *without intermediate controls…*, *splits the track at the controls*                                                                                                                                                     |
| 3.2 | Every segment has a distance, climb and descent; the segments add up exactly to the totals of the track.                                                                                        | [segments.test.ts](../../src/domain/segments.test.ts) – *segments add up to the track totals*; [segments.spec.ts](../../e2e/segments.spec.ts) – *…segments that add up to the whole track*                                                                                       |
| 3.3 | The timetable shows the segment ending at each control: distance, and below it climb and descent – at every width of the plan column.                                                           | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *shows the segment ending at each control with distance, climb and descent*; [segments.spec.ts](../../e2e/segments.spec.ts) – *the timetable shows distance, climb and descent of every segment* |
| 3.4 | A segment strip below the elevation profile is aligned with its distance axis; each segment's width matches its distance and it is described by name, distance, climb, descent and riding time. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *lists the segments below the profile…*; [segments.spec.ts](../../e2e/segments.spec.ts)                                                                                                          |
| 3.5 | Hovering or focusing a segment – in the strip or as a table row – highlights it on the map, as a range on the profile and in the table.                                                         | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *…highlights the hovered one*, *highlights a segment when hovering its table row*; [segments.spec.ts](../../e2e/segments.spec.ts) – *hovering a segment highlights it…*                          |
| 3.6 | Segments can be explored with the keyboard (Tab through the strip).                                                                                                                             | [segments.spec.ts](../../e2e/segments.spec.ts) – *segments can be explored with the keyboard*                                                                                                                                                                                    |

## Implementation notes

- Segments are derived from the ordered controls (`src/domain/segments.ts`), never stored.
- Each track point carries the cumulative climb and descent (same 5 m hysteresis as the totals), so a segment's climb
  is the difference of two values and the segments add up exactly to the track totals.
