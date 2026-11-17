# US16 – Custom brevet distance and time limit

| Status  | Iteration                   | Persona               |
|---------|-----------------------------|-----------------------|
| ✅ Done | [11](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to set a custom distance and time limit for the brevet I am planning
So that I can plan events that don't fall into the ACP standard distances.

## Acceptance criteria

| #     | Criterion | Verified by |
|-------|-----------|-------------|
| 16.1  | The brevet distance select offers *Custom distance…* next to the standard distances and *No fixed time limit*; choosing it shows the fields *Distance (km)* and *Time limit (h:mm)*. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *proposes the track distance and the formula limit, and closes the finish at the custom limit*; [custom-brevet.spec.ts](../../e2e/custom-brevet.spec.ts) |
| 16.2  | The fields are pre-filled with the track's distance (rounded to the km) and the time limit the ACP closing formula gives for it (e.g. 250 km → 16:40). | [acp.test.ts](../../src/domain/controls/acp.test.ts) – *proposes the limit of the closing formula for any distance*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx); [custom-brevet.spec.ts](../../e2e/custom-brevet.spec.ts) – *a custom distance and limit set the control windows and are saved with the plan* |
| 16.3  | The finish closes at the custom limit; the closing times of the other controls are scaled by custom limit ÷ formula limit of the custom distance; openings and the one-hour start window stay as in the rules. | [acp.test.ts](../../src/domain/controls/acp.test.ts) – *closes the finish at the custom limit, openings stay as in the rules*, *scales the closing times of the other controls to the custom limit*, *keeps the start window*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *scales the closing times of the controls to a changed limit* |
| 16.4  | Changing distance or limit recalculates all windows and the timetable immediately; invalid values are rejected with a message. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *scales the closing times of the controls to a changed limit*, *rejects invalid distances and limits* |
| 16.5  | Choosing a standard distance again uses the standard rules. | [checkpoints.test.ts](../../src/domain/checkpoints.test.ts) – *goes back to the standard rules when a standard distance is chosen*; [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *goes back to a standard distance* |
| 16.6  | The custom brevet is saved with the plan (plan file version 2; version 1 plans are migrated) and shown on the plan's card on the start screen (e.g. "309 km brevet, limit 18:00"). | [planFile.test.ts](../../src/domain/planFile.test.ts) – *saves and restores a custom brevet (US16)*, *migrates version 1 plans (before custom brevets) to the current version*; [App.test.tsx](../../src/components/App.test.tsx) – *shows the distance and time limit of a custom brevet on its card (US16)*; [custom-brevet.spec.ts](../../e2e/custom-brevet.spec.ts) |
| 16.7  | A note below the timetable explains the custom limit and the scaled closing times. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx); [custom-brevet.spec.ts](../../e2e/custom-brevet.spec.ts) |

## Implementation notes

- Rules: `ControlRules.defaultTimeLimitMin(km)` and the optional custom limit of `window()`
  (`src/domain/controls/acp.ts`); state: `customLimitMin` in the checkpoint state with the action `setCustomBrevet`.
- Example (scaling): 250 km with a 15:00 limit instead of the formula's 16:40 → factor 0.9; a control at 100 km closes
  at 6:40 × 0.9 = 6:00.
- Individual windows can still be overridden per control (route sheet), see [US2](us02-mark-checkpoints.md).
