# US2 – Mark checkpoints along the track

| Status | Iteration | Persona |
|--------|-----------|---------|
| ✅ Done | [2](../plan.md#iterations) | Long-distance cyclist |

As a long-distance cyclist
I want to select POIs along the route
So that I can identify the checkpoints along the track

## Acceptance criteria

| #     | Criterion | Verified by |
|-------|-----------|-------------|
| 2.1   | Start and finish are always controls; they can't be moved or removed. | [checkpoints.test.ts](../../src/domain/checkpoints.test.ts) – *always contains start and finish*, *never moves or removes start and finish*; [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts) – *start and finish are controls with ACP windows* |
| 2.2   | Clicking the track on the map (also slightly beside the line) adds a checkpoint snapped to the nearest point of the track, shown as a numbered marker on the track. | [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts) – *clicking the track on the map adds a snapped checkpoint*; [snap.test.ts](../../src/domain/track/snap.test.ts) |
| 2.3   | Clicking the elevation profile, or pressing Enter on the focused profile, adds a checkpoint at that position. | [ElevationProfile.test.tsx](../../src/components/track/ElevationProfile.test.tsx) – *picks the clicked position…*; [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts) – *clicking the elevation profile or pressing Enter…* |
| 2.4   | A checkpoint can be added by entering its distance; distances outside (0, track length) or non-numbers are rejected with a message. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *adds a checkpoint at an entered distance*, *rejects the distance …* |
| 2.5   | A second checkpoint within 100 m of an existing one is not added; this is announced. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *…but not twice at the same place* |
| 2.6   | GPX waypoints can be imported: waypoints within 1 km of the track become named checkpoints, farther ones are skipped and listed, waypoints that already have a checkpoint aren't imported twice. On out-and-back routes the closest pass of the track is used. | [checkpoints.test.ts](../../src/domain/checkpoints.test.ts) – *importWaypoints*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *imports GPX waypoints near the track*; [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts); [snap.test.ts](../../src/domain/track/snap.test.ts) – *picks the closest pass…* |
| 2.7   | Checkpoints are numbered CP1, CP2, … in track order and stay ordered when one is moved. | [checkpoints.test.ts](../../src/domain/checkpoints.test.ts) – *keeps checkpoints ordered by distance*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *renames and moves a checkpoint and keeps the order* |
| 2.8   | A checkpoint can be renamed, moved by editing its distance, and removed. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx); [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts) – *checkpoints can be entered by distance, edited and removed* |
| 2.9   | Each control shows its ACP control window (opening and closing time after the start), matching the ACP/RUSA calculator, incl. the 60 km rule and the fixed finish limits. | [acp.test.ts](../../src/domain/controls/acp.test.ts); [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *starts with start and finish and the ACP windows…* |
| 2.10  | The brevet distance is detected from the track length and can be changed, including *No fixed time limit*; the windows are recomputed. | [acp.test.ts](../../src/domain/controls/acp.test.ts) – *infers the brevet distance…*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *removes a checkpoint and recomputes windows for another brevet distance* |
| 2.11  | Opening and closing times can be overridden (e.g. from the route sheet) as H:MM; invalid input shows a message, a window closing before it opens is flagged, and the ACP times can be restored. Moving a checkpoint recomputes its ACP window. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *overrides a control window…*; [duration.test.ts](../../src/domain/time/duration.test.ts); [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts) |
| 2.12  | Checkpoints appear as numbered lines on the elevation profile. | [ElevationProfile.test.tsx](../../src/components/track/ElevationProfile.test.tsx) – *shows checkpoints as numbered lines* |
| 2.13  | Clicking a checkpoint marker on the map focuses its name and scrolls it into view in the plan column. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *focuses the name of a checkpoint…*; [layout.spec.ts](../../e2e/layout.spec.ts) – *clicking a marker scrolls its checkpoint into view* |

## Implementation notes

- Model and reducer: `src/domain/checkpoints.ts`; snapping: `src/domain/track/snap.ts`; control rules:
  `src/domain/controls/` (ACP rules are documented in [plan.md](../plan.md#control-rules)).
- The click target on the map is a wide transparent line on top of the route.
- The nominal brevet distance is the largest standard distance ≤ track length + 5 %, otherwise "no fixed time limit".
- Windows are shown as H:MM after the start until the start date/time arrives with [US6](us06-start-time.md).
  Overrides are stored per checkpoint and survive moving it.
- Checkpoints are held in memory together with the track until plans are persisted ([US5](us05-multiple-route-plans.md)).
- Repositioning by drag and drop follows with [US9](us09-move-checkpoints.md).
