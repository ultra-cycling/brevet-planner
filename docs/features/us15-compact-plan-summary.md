# US15 – Compact plan summary

| Status                 | Iteration               | Persona               |
|------------------------|-------------------------|-----------------------|
| Backlog (details open) | [–](../plan.md#backlog) | Long-distance cyclist |

As a long distance cyclist
I want the top of the plan column to be a compact one-line overview of my plan with an edit button for the settings
So that the timetable gets most of the space and I still see the key figures at a glance

## Current behaviour

The top of the plan column consists of the track summary (name, distance, climb, descent, highest point), the plan
settings (start date and time, time zone, time display, tight threshold, time model, speed, climb rate) as input
fields and the totals – together they take up a large part of the screen height before the timetable starts.

## Acceptance criteria

Draft – further information from the product owner will follow.

| #    | Criterion                                                                                                                                                                                          | Verified by |
|------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| 15.1 | The top of the plan column is a single line (wrapping only when narrow) with the key figures, e.g. track name, distance, climb, start (date and time), finish time and smallest buffer.            | *proposed*  |
| 15.2 | An *Edit* button opens the plan settings (start date and time, time zone, time display, tight threshold, time model and its parameters) and closes them again; changes apply immediately as today. | *proposed*  |
| 15.3 | Further totals (riding time, stops, average speeds) remain available, e.g. in the settings or as a tooltip.                                                                                        | *proposed*  |
| 15.4 | Keyboard and screen-reader operation as for [US14](us14-clean-timetable.md).                                                                                                                       | *proposed*  |

## Open questions

- Which figures belong into the one-line overview?
- Settings as a collapsible panel below the line, as a popover or as a dialog?
