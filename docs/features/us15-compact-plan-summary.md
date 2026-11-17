# US15 – Compact plan summary

| Status  | Iteration                   | Persona               |
|---------|-----------------------------|-----------------------|
| ✅ Done | [12](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want the top of the plan column to be a compact overview of my plan with the settings collapsed
So that the timetable gets most of the space and I still see the key figures at a glance

## Before

The top of the plan column consisted of the track summary (name, distance, climb, descent, highest point), the plan
settings (start date and time, time zone, time display, tight threshold, time model, speed, climb rate) as input
fields and the totals – about 540 px on a laptop before the timetable started.

## Design decisions

Guiding idea: lead with the answer (*when do I start and finish, where is it tight?*), keep the set-once settings out
of sight without hiding their effect.

- **Title row:** plan name (renamable), distance, climb and start → finish; descent and highest point were dropped
  (they are visible in the elevation profile).
- **Collapsible plan settings below it**, as an inline section (not a popover or dialog). The toggle line carries only
  its title. The section holds start date and time, time zone, time display, tight threshold, the brevet distance
  (standard, custom distance and time limit – US16, or no fixed limit), time model and its parameters.
- **Always collapsed** when a plan is opened – nothing is remembered between plans.
- **Totals right above the timetable** (riding, stops, finish after / at, average speeds, smallest buffer), always
  visible, so the effect of every change is in view while editing the settings.
- The checkpoint hint and the waypoint import stay with the timetable; the plan name stays as the large title.

```
G – Bodensee – G (300 km sample) ✎
309.3 km · ↑ 727 m · Sat, May 1 06:00 → Sat 19:05
▸ Plan settings
──────────────────────────────────────────────────────────────────
Checkpoints & timetable
Click the track on the map …                [Import 20 GPX waypoints]
Riding  Stops  Finish after  Finish at  Moving avg.  Overall avg.  Smallest buffer
12:05   1:00   13:05         Sat 19:05  25.6 km/h    23.6 km/h     2:01 at CP1
┌ timetable …
```

## Acceptance criteria

| #    | Criterion | Verified by |
|------|-----------|-------------|
| 15.1 | The top of the plan column is a title row (wrapping only when narrow) with the plan name, distance, climb and start day and time → finish; descent and highest point are no longer shown there. | [App.test.tsx](../../src/components/App.test.tsx) – *shows the track after uploading a GPX file*, *shows start → finish in the title row and the plan settings collapsed (US15)*; [track.spec.ts](../../e2e/track.spec.ts) – *uploading a GPX file shows the track on the CyclOSM map* |
| 15.2 | Below it, a *Plan settings* toggle opens and closes the settings: start date and time, time zone, time display, tight threshold, brevet distance (with custom distance and time limit), time model and its parameters; changes apply immediately as before. | [App.test.tsx](../../src/components/App.test.tsx) – *shows start → finish in the title row and the plan settings collapsed (US15)*; [track.spec.ts](../../e2e/track.spec.ts); [start-time.spec.ts](../../e2e/start-time.spec.ts); [custom-brevet.spec.ts](../../e2e/custom-brevet.spec.ts) |
| 15.3 | The settings are collapsed whenever a plan is opened; the timetable heading then starts less than 150 px below the plan name. | [track.spec.ts](../../e2e/track.spec.ts) – *uploading a GPX file shows the track on the CyclOSM map* |
| 15.4 | The totals (riding time, stops, finish after / at, average speeds, smallest buffer) are shown outside the settings, right above the timetable, and stay visible while the settings are collapsed. | [App.test.tsx](../../src/components/App.test.tsx) – *shows start → finish in the title row and the plan settings collapsed (US15)*; [track.spec.ts](../../e2e/track.spec.ts); [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *Timetable (US4)*; [timetable.spec.ts](../../e2e/timetable.spec.ts) |
| 15.5 | The toggle is a button with `aria-expanded` / `aria-controls`, operable with the keyboard; distance and climb are labelled for screen readers. | [App.test.tsx](../../src/components/App.test.tsx) – *shows start → finish in the title row and the plan settings collapsed (US15)*, *shows the track after uploading a GPX file* |
