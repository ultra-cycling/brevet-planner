# US14 – Clean timetable with edit mode

| Status                 | Iteration               | Persona               |
|------------------------|-------------------------|-----------------------|
| In progress            | [–](../plan.md#backlog) | Long-distance cyclist |

As a long distance cyclist
I want the timetable to show only the essential information by default and to edit the details of a checkpoint
only when I ask for it
So that I can read my plan at a glance without being distracted by input fields

## Current behaviour

Every row of the timetable shows all values as input fields at once (name, km, speed and climb rate, control window,
rest) plus segment, riding time, arrival, departure, buffer and status. Even with the responsive rules (columns
stacked or hidden by width) the table looks cluttered.

## Acceptance criteria

Draft – further information from the product owner will follow.

| #    | Criterion | Verified by |
|------|-----------|-------------|
| 14.0 | The timetable has no row (phone: no card) for the start: its date and time are in the title row of the plan (US15), its window is fixed by the control rules. The first row is CP1, or the finish without checkpoints. | [Checkpoints.test.tsx](../../src/components/checkpoints/Checkpoints.test.tsx) – *starts with start and finish and the ACP windows of the detected brevet*, *shows only map, profile and read-only timetable cards*; [checkpoints.spec.ts](../../e2e/checkpoints.spec.ts) – *the finish is a control with an ACP window – the start has no row*; [phone.spec.ts](../../e2e/phone.spec.ts) |
| 14.1 | By default each control is shown read-only with the essentials, e.g. name, km, arrival, control window, buffer and status – as text, not input fields.                                           | *proposed*  |
| 14.2 | An *Edit* button per checkpoint opens its details (name, km, rest, control window overrides, pace of the segment) – inline or in a dialog – and closes them again; changes are applied as today. | *proposed*  |
| 14.3 | Overridden values (control window, segment pace) stay recognisable in the read-only view.                                                                                                        | *proposed*  |
| 14.4 | Everything stays operable with the keyboard and announced to screen readers (edit button names the checkpoint, focus moves into the details and back).                                           | *proposed*  |
| 14.5 | Adding (map, profile, km, waypoints), moving and removing checkpoints keep working.                                                                                                              | *proposed*  |

First step (decided): the start row is removed. With it, the start window (one hour by the rules) can no longer be
overridden in the app; no saved plan used that.

## Open questions

- Which values belong into the default view, which only into the details?
- Inline expansion of the row or a side panel/dialog?
- Should the phone cards ([plan.md → Phone layout](../plan.md#phone-layout)) and the desktop view converge to one
  card-like design?
