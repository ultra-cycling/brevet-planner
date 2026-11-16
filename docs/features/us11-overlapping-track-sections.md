# US11 – Overlapping track sections

| Status  | Iteration               | Persona               |
|---------|-------------------------|-----------------------|
| Backlog | [–](../plan.md#backlog) | Long-distance cyclist |

As a long distance cyclist
I want parts of the route that are ridden twice (e.g. the same road out of and back into town at the start and the
end) to be drawn as two parallel lines with arrows showing the direction
So that I can see which way each part is ridden and place, move and inspect checkpoints on the right passage

## Current behaviour

The track is drawn as one polyline. Where it passes the same road twice, both passages lie on top of each other, so:

- clicking the track snaps to whichever passage happens to be nearest (`snapToTrack` searches the whole track), so a
  checkpoint can't reliably be added on the other passage;
- the hover tooltip ([US8](us08-trackpoint-tooltip.md)), dragging a marker ([US9](us09-move-checkpoints.md)) and the
  overlays ([US7](us07-route-overlays.md)) have the same ambiguity;
- the direction of travel isn't visible at all.

## Acceptance criteria

Proposed – refined at the start of the iteration.

| #    | Criterion                                                                                                                                                                          | Verified by |
|------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| 11.1 | Sections where the track runs along itself (two passages closer than ~20 m to each other over at least ~100 m) are detected, both in opposite and in the same direction.           | *proposed*  |
| 11.2 | Overlapping passages are drawn side by side as parallel lines with a fixed screen offset (independent of the zoom level), so both stay visible and clickable.                      | *proposed*  |
| 11.3 | Arrows along the route show the direction of travel – at least on overlapping sections, at a spacing that stays readable at every zoom level.                                      | *proposed*  |
| 11.4 | Clicking, hovering, tapping and dragging a checkpoint on a passage resolves to the distance on *that* passage (e.g. km 3 vs. km 297), not to the nearest point of the whole track. | *proposed*  |
| 11.5 | Checkpoint markers, the segment highlight and route overlays sit on the passage they belong to.                                                                                    | *proposed*  |
| 11.6 | Tracks without overlaps look exactly as before.                                                                                                                                    | *proposed*  |

## Open questions

- Arrows on the whole route or only on overlapping sections?
- Which side should each passage be drawn on – fixed (e.g. right-hand side in the direction of travel, like the
  traffic) or whatever keeps the lines apart best?

## Implementation notes (proposal)

- Detection in the domain (`src/domain/track/`): for every point, search nearby points far away along the track
  (grid/spatial index to stay fast for 100 000+ points); merge hits into passage pairs with their distance ranges.
- Drawing: pixel offset of polylines (e.g. the leaflet-polylineoffset approach) and direction markers along the line
  (own SVG markers or leaflet-polylinedecorator).
- Snapping with context: snap within the passage under the pointer (the clicked offset line knows its distance
  range) instead of the global nearest point.
