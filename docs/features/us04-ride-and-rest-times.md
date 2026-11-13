# US4 – Provide estimated ride times and rest times for segments

| Status | Iteration | Persona |
|--------|-----------|---------|
| ✅ Done | [4](../plan.md#iterations) | Long-distance cyclist |

As a long-distance cyclist
I want to provide an estimated average speed and vertical climb per segment
So that I can calculate estimated riding time per segment

## Acceptance criteria

| #     | Criterion | Verified by |
|-------|-----------|-------------|
| 4.1   | The plan has a speed (km/h) and climb rate (m/h), pre-filled from `config.yaml`. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *estimates the riding time with the plan speed and climb rate*; [schema.test.ts](../../src/config/schema.test.ts) |
| 4.2   | The riding time of a segment is distance / speed + climb / climb rate. | [SpeedClimbEstimator.test.ts](../../src/domain/time/SpeedClimbEstimator.test.ts); [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) |
| 4.3   | Speed and climb rate can be overridden for a single segment; an empty field uses the plan value (shown as placeholder). Only that segment's riding time changes. | [timetable.test.ts](../../src/domain/timetable.test.ts) – *uses per-segment parameters over the plan defaults*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *overrides speed or climb rate for a single segment*; [timetable.spec.ts](../../e2e/timetable.spec.ts) – *changing the pace recalculates the timetable* |
| 4.4   | Values outside the model's range are rejected with a message naming the range. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *rejects parameters outside the model range*; [SpeedClimbEstimator.test.ts](../../src/domain/time/SpeedClimbEstimator.test.ts) |
| 4.5   | Every intermediate control has a rest time in minutes, pre-filled from `planning.defaultRestMinutes`; start and finish have none. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *rests at checkpoints…*; [timetable.test.ts](../../src/domain/timetable.test.ts) – *ignores rest and segment parameters where they make no sense* |
| 4.6   | The timetable shows per control: riding time of the segment, arrival, departure and buffer (time left until the control closes; negative = late) – all as time after the start. | [timetable.test.ts](../../src/domain/timetable.test.ts); [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) |
| 4.7   | A rider can't leave a control before it opens: rest is spent while waiting, only the remainder is shown as waiting time. | [timetable.test.ts](../../src/domain/timetable.test.ts) – *waits at a control that has not opened yet…*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *waits at a control that is not open yet* |
| 4.8   | Totals show riding time, stops, finish time, moving and overall average speed and the smallest buffer with its control; riding + stops = finish. | [timetable.test.ts](../../src/domain/timetable.test.ts); [timetable.spec.ts](../../e2e/timetable.spec.ts) – *the timetable adds up riding and rest times* |
| 4.9   | Changing the plan's pace, a segment's pace or a rest time recalculates the timetable immediately. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *rests at checkpoints and recalculates when the pace changes*; [timetable.spec.ts](../../e2e/timetable.spec.ts) |
| 4.10  | The time model is exchangeable: models are registered by id and bring their own parameter definitions; unknown models or parameters in `config.yaml` stop the start-up with a message. | [registry.test.ts](../../src/domain/time/registry.test.ts); [bootstrap.test.ts](../../src/app/bootstrap.test.ts) |
| 4.11  | The essential columns (control, km, segment, arrival, control window, rest, buffer) are always visible and the timetable fits the plan column without horizontal scrolling. | [timetable.spec.ts](../../e2e/timetable.spec.ts) – *the essential columns are always visible…* |

## Implementation notes

- Calculation: `src/domain/timetable.ts`; time model: `src/domain/time/` (see
  [plan.md](../plan.md#exchangeable-time-model)).
- Departure = `max(arrival + rest, opening)`; buffer = closing time − arrival.
- The OK/Tight/Early/Late status and clock times were added with [US6](us06-start-time.md); with *Since start*
  the timetable shows the times after the start as described here.
- Time model and parameters are held in memory until plans are persisted ([US5](us05-multiple-route-plans.md)).
- Which columns are shown depends on the width of the plan column, see [plan.md](../plan.md#ui-design).
