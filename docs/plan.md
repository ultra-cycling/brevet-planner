# Brevet Planner – Architecture & Iteration Plan

Complements [design.md](design.md) (requirements). This document records the decisions taken during the design phase
and the plan for implementing the user stories iteratively.

## UI Design

Design canvas (proposals A, B, C and the chosen hybrid):
<https://claude.ai/artifact/CgwLYJLoNvm7oaKe827MXE>

**Chosen direction: A+B hybrid** – one planning screen, top to bottom:

1. **Header** – brand, plan switcher, language selector, *Upload GPX*, *New plan*.
2. **Plan settings bar** – start date & time (US6), time model, default speed (km/h) and climb rate (m/h), totals
   (riding + rest time, finish ETA, smallest buffer).
3. **Map + elevation profile** – CyclOSM map with the track and checkpoint markers; elevation profile directly below.
   Checkpoints can be placed by clicking the map (snaps to track) or the profile.
4. **Editable timetable** – one row per checkpoint: km, segment distance/climb, speed, climb rate, ride time, ETA,
   control window (ACP, editable), rest, departure, buffer status.

Status of a checkpoint arrival (text + icon + color, never color alone):

| Status | Rule                                            |
|--------|-------------------------------------------------|
| OK     | buffer to control close ≥ tight threshold       |
| Tight  | 0 ≤ buffer < tight threshold (configurable)     |
| Early  | ETA before control opens – waiting time is added |
| Late   | ETA after control closes                        |

Responsive behaviour:

| Device              | Behaviour                                                                     |
|---------------------|-------------------------------------------------------------------------------|
| Desktop (≥ 1200 px) | Full layout, all timetable columns                                            |
| Tablet (≥ 768 px)   | Settings bar wraps, smaller map, *Segment* and *Depart* columns hidden         |
| Phone               | Read-only timetable cards (CP, ETA, window, buffer) with a small map           |

Visual language: white panels on a light neutral ground, orange route (`#C2410C`), blue checkpoint markers
(`#1D4ED8`), Inter for text with tabular numbers, Space Grotesk for headings – implemented as a Bootstrap theme
(Sass variables), no custom component library.

## Architecture

```
src/
  config/      loading + validating config.yaml, React context
  i18n/        i18next setup, locales/<lang>.json
  domain/      pure TypeScript: plan model, ACP control rules, time estimators
  storage/     PlanRepository interface + implementations
  components/  React UI (Bootstrap via react-bootstrap)
e2e/           Playwright browser tests
```

### Exchangeable time model

```ts
interface TimeEstimator {
  id: string;                                   // e.g. "speed-climb"
  estimate(segment: SegmentInput, params: EstimatorParams): number; // minutes
}
```

- First implementation `SpeedClimbEstimator`: `time = distance / speed + climb / climbRate`.
- Estimators are registered in a registry; a plan stores the estimator id and its parameters (defaults + per-segment
  overrides), so a model trained on past ride recordings can be added later without touching the UI.

### Control rules

Control opening/closing times are pre-filled from the ACP brevet rules (relative to the start time) and can be
overridden per checkpoint. Rules sit behind an interface (`src/domain/controls/ControlRules.ts`) so RUSA/PBP/custom
rules can follow.

ACP rules as implemented (`acp.ts`): opening at the maximum and closing at the minimum speed per distance band
(0–200 km 15–34 km/h, –400 15–32, –600 15–30, –1000 11.428–28, –1300 13.333–26); start closes after 1 h; controls
within the first 60 km close at 20 km/h + 1 h; the finish closes at the fixed limit of the nominal distance
(200: 13:30, 300: 20:00, 400: 27:00, 600: 40:00, 1000: 75:00, 1200: 90:00); distances beyond the nominal distance
count as the nominal distance; times rounded to the minute.

### Storage

`PlanRepository` (async: `list`, `get`, `save`, `delete`). First implementation `LocalStoragePlanRepository`; the
backend is selected via `config.yaml` (`storage.backend`), so a REST implementation can be added later.

### Localization

All UI strings via `react-i18next` keys (`src/i18n/locales/en.json`). Dates, times and numbers are formatted with
`Intl` for the active locale; times are shown in 24 h format. Further languages = new locale file + entry in
`config.yaml`.

## Configuration – `config.yaml`

`public/config.yaml` is served with the app and fetched once at application start (before the first render). Missing
values fall back to built-in defaults; invalid values stop the start-up with an error message.

| Key                              | Default                                           | Read at        |
|----------------------------------|---------------------------------------------------|----------------|
| `site.url`                       | `https://ultra-cycling.github.io/brevet-planner`  | build + start  |
| `i18n.defaultLanguage`           | `en`                                              | start          |
| `i18n.languages`                 | `[en]`                                            | start          |
| `map.tileUrl` / `attribution`    | CyclOSM                                           | start          |
| `storage.backend`                | `localStorage`                                    | start          |
| `planning.defaultStartTime`      | `06:00`                                           | start          |
| `planning.tightBufferMinutes`    | `75`                                              | start          |
| `planning.timeModel.id`          | `speed-climb`                                     | start          |
| `planning.timeModel.params`      | model defaults (`speedKmh: 28`, `climbRateMh: 700`) | start        |

The planning values are defaults for new plans; each plan can override them (e.g. the tight threshold).
`timeModel.params` are validated against the parameter definitions of the selected model, so a new model brings its
own parameters without changes to the config schema.

### Deployment URL and custom domain

`site.url` is the single source for the public URL. Its path becomes Vite's `base` at build time (so changing it
requires a rebuild):

- `https://ultra-cycling.github.io/brevet-planner` → base `/brevet-planner/`
- `https://brevet.example.org` (custom domain) → base `/`, and the build additionally emits a `CNAME` file for
  GitHub Pages.

The environment variable `SITE_URL` overrides `site.url` for a build (e.g. in CI).

## Iterations

Every iteration is done when its features are covered by unit tests (Vitest + Testing Library) and browser tests
(Playwright) and the CI workflow is green.

| #  | Scope                                                                                                              |
|----|--------------------------------------------------------------------------------------------------------------------|
| 0 ✅ | Scaffold (Vite, React, TypeScript, Bootstrap theme), `config.yaml` loading, i18n (en), storage + estimator interfaces, test setup, GitHub workflows (CI, Pages deploy) |
| 1 ✅ | **US1** – upload GPX (button or drag & drop), parse track, show it on the CyclOSM map, elevation profile linked to the map |
| 2 ✅ | **US2** – checkpoints: click on map / profile (snap to track), enter km, import GPX waypoints; ACP windows, editable |
| 3 ✅ | **US3** – segments between checkpoints with distance and climb                                                     |
| 4  | **US4** – speed + climb-rate estimator, per-segment overrides, rest time per checkpoint, timetable                  |
| 5  | **US6** – start date/time, live recalculation, status (OK/Tight/Early/Late)                                        |
| 6  | **US5** – multiple plans, plan switcher, create/rename/delete                                                      |
| 7  | Phone layout – read-only timetable                                                                                 |

### Notes per iteration

- **1 (US1):** Climb/descent use a 5 m hysteresis to filter elevation noise. GPX waypoints (`<wpt>`) are already parsed
  and kept as checkpoint candidates for US2. The loaded track is held in memory only – persisting plans is part of US5.
  Browser tests use the synthetic fixture `e2e/fixtures/sample-loop.gpx` (regenerate with
  `node tooling/generate-sample-gpx.ts`) and stub map tiles.
- **2 (US2):** Start and finish are always controls; intermediate controls are added by clicking the track on the map
  (a wide transparent line on top of the route is the click target) or the elevation profile (also Enter on the
  focused profile), by entering a km value, or by importing the GPX waypoints (snapped to the nearest pass of the
  track; waypoints more than 1 km away are skipped and listed). A second checkpoint within 100 m of an existing one is
  rejected. The nominal brevet distance is inferred from the track length (largest distance ≤ track length + 5 %,
  otherwise "no fixed time limit") and can be changed. Windows are shown as H:MM after the start until the start
  date/time arrives in iteration 5; overrides are stored per checkpoint and survive moving it. Checkpoints are kept in
  memory together with the track (persisting comes with US5). Clicking a map marker focuses the checkpoint's name.
- **3 (US3):** Segments are derived from the ordered controls (start → CP1 → … → finish), never stored. Each track
  point carries the cumulative climb/descent (same 5 m hysteresis as the totals), so a segment's climb is a difference
  of two values and the segments add up exactly to the track totals. Segments are shown as a strip below the
  elevation profile (aligned with its distance axis, also on tablet) and as *Segment km* / *Climb* columns in the
  table (desktop only). Hovering or focusing a segment – chip or table row – highlights it on the map, the profile
  and in the table.
