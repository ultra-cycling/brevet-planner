# US10 – PDF export of the legs

| Status  | Iteration               | Persona               |
|---------|-------------------------|-----------------------|
| Backlog | [–](../plan.md#backlog) | Long-distance cyclist |

As a long distance cyclist
I want to export the individual legs (segments) of my plan as a PDF with their elevation profile and calculated times
So that I can print them or keep them on my phone and look up the next leg during the ride without the app

## Acceptance criteria

Proposed – refined at the start of the iteration (see open questions).

| #    | Criterion                                                                                                                                                                                                              | Verified by |
|------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| 10.1 | An *Export PDF* action on desktop and tablet creates a PDF of the current plan in the browser (no server); it is downloaded as `<plan name>.pdf`.                                                                      | *proposed*  |
| 10.2 | The PDF starts with an overview: track name, date and start time, distance, climb, finish time, the timetable of all controls (arrival, control window, buffer/status, rest, departure).                               | *proposed*  |
| 10.3 | Every leg (start → CP1, CP1 → CP2, … → finish) has its own section: from/to with names and km, distance, climb/descent, riding time, departure at the start of the leg, arrival and control window at its end, status. | *proposed*  |
| 10.4 | Each leg section has an elevation profile of the leg with km and elevation axes and the climbs readable in black and white (no colour-only information).                                                               | *proposed*  |
| 10.5 | Times are shown like in the app: clock times (with weekday when the ride spans midnight) and time after the start.                                                                                                     | *proposed*  |
| 10.6 | The layout is readable when printed on A4 (portrait) and on a phone screen; text is real text (searchable, selectable), not an image.                                                                                  | *proposed*  |
| 10.7 | The PDF reflects exactly the current plan (pace, rests, overrides, start); exporting again after a change gives the updated values.                                                                                    | *proposed*  |

## Open questions

- **Page format:** A4 with one or two legs per page? Additionally a small format (A5/A6, or a narrow strip for the
  handlebar / top tube)?
- **Map excerpt per leg:** wanted? Map tiles in a PDF need the tile provider's licence/attribution and CORS-enabled
  tiles; without a map the export stays simpler and smaller.
- **Cue sheet:** should waypoints/turns along a leg be listed (only possible where the GPX contains them)?
- **Phone:** should the read-only phone view offer the export as well?

## Implementation notes (proposal)

- Generate the PDF client-side, e.g. with jsPDF (+ svg2pdf for the profiles) – deterministic output in every
  browser, fits the GitHub Pages deployment. Alternative: a print stylesheet and the browser's *Print → PDF* (no
  dependency, but the result differs between browsers).
- Reuse the domain data as it is: timetable rows, segments, `sampleProfile` limited to the leg.
- Load the PDF library lazily, only when exporting, to keep the app bundle small.
