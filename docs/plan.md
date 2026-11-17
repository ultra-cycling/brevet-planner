# Brevet Planner – Architecture & Iteration Plan

How the requirements are built: iterations, UI decisions, architecture and configuration.

| Document               | Content                                                                                                   |
|------------------------|-----------------------------------------------------------------------------------------------------------|
| [design.md](design.md) | Requirements: personas, user stories (overview), cross-functional requirements, technology, terminology   |
| [features/](features)  | One file per user story: story, acceptance criteria with the tests that verify them, implementation notes |
| plan.md (this file)    | Iterations, UI design, architecture, configuration, testing                                               |

## Iterations

An iteration is done when the acceptance criteria of its user stories are verified by unit tests (Vitest + Testing
Library) and browser tests (Playwright), the feature file links these tests, and the CI workflow is green. Criteria of
stories that aren't built yet are marked *proposed* and are refined at the start of their iteration.

| #  | Status | Scope                                                                                                                                                                                                   |
|----|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0  | ✅      | Scaffold (Vite, React, TypeScript, Bootstrap theme), [`config.yaml`](#configuration--configyaml) loading, i18n (en), storage and time-model interfaces, test setup, GitHub workflows (CI, Pages deploy) |
| 1  | ✅      | [US1 – Show a track on a map](features/us01-show-track-on-map.md): upload GPX, CyclOSM map, elevation profile linked to the map                                                                         |
| 2  | ✅      | [US2 – Mark checkpoints](features/us02-mark-checkpoints.md): add on map / profile / by km / from GPX waypoints; ACP control windows, editable                                                           |
| 3  | ✅      | [US3 – Segments](features/us03-segments.md): distance, climb and descent between checkpoints; segment strip and highlighting                                                                            |
| 4  | ✅      | [US4 – Ride and rest times](features/us04-ride-and-rest-times.md): speed + climb-rate model, per-segment overrides, rest times, timetable and totals                                                    |
| –  | ✅      | [Planner layout](#layout): plan column scrolling next to a fixed map (cross-cutting, after iteration 4)                                                                                                 |
| 5  | ✅      | [US6 – Start time](features/us06-start-time.md): start date/time, clock times, live recalculation, OK/Tight/Early/Late status                                                                           |
| 6  | ✅      | [US7 – Route overlays](features/us07-route-overlays.md): overlay mechanism, road gradient, daylight (with time zone of the start)                                                                       |
| 7  | ✅      | [Phone layout](#phone-layout) – read-only timetable cards, small map (cross-functional requirement in [design.md](design.md#cross-functional-requirements))                                             |
| 8  | ✅      | [US9 – Move checkpoints](features/us09-move-checkpoints.md): drag and drop on map and profile                                                                                                           |
| 9  | ✅      | [US8 – Trackpoint tooltip](features/us08-trackpoint-tooltip.md): distance and expected times when hovering the route                                                                                    |
| 10 | ✅      | [US5 – Manage multiple route plans](features/us05-multiple-route-plans.md): plan files in `public/plans/`, start screen, plan menu, download, URL per plan                                              |
| 11 | ✅      | [US16 – Custom brevet](features/us16-custom-brevet.md): custom distance and time limit, closing times scaled to the limit                                                                               |

US5 stores plans as files in the repository for now; a database/backend storage is a later story (the storage
interface is prepared for it).

### Backlog

Stories captured but not yet scheduled; their acceptance criteria are proposals to be refined with the product owner
(open questions are listed in each feature file).

| Story                                                                                    | Scope                                                                                       | Kind                      |
|------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|---------------------------|
| [US13 – Fix the phone layout on iPhone](features/us13-phone-layout-fixes.md)             | elevation profile overlaps other content on iPhone; test the phone layout in WebKit         | bug, details open         |
| [US15 – Compact plan summary](features/us15-compact-plan-summary.md)                     | one-line overview at the top of the plan column, settings behind an *Edit* button           | improvement, details open |
| [US14 – Clean timetable with edit mode](features/us14-clean-timetable.md)                | read-only timetable by default, details of a checkpoint behind an *Edit* button             | improvement, details open |
| [US12 – Realistic climb from terrain data](features/us12-elevation-from-terrain-data.md) | elevations from a digital elevation model, climb comparable to other planners               | feature                   |
| [US11 – Overlapping track sections](features/us11-overlapping-track-sections.md)         | parallel lines and direction arrows where the track runs along itself; unambiguous clicking | feature                   |
| [US10 – PDF export of the legs](features/us10-pdf-export.md)                             | PDF with overview and one section per leg: profile, distances, times                        | feature                   |

Suggested order (top to bottom): the iPhone bug first; US15 and US14 change the plan column, which the PDF export
and later features build on; US12 corrects the numbers everything else is calculated from.

## UI design

Design canvas (proposals A, B, C and the chosen hybrid): <https://claude.ai/artifact/CgwLYJLoNvm7oaKe827MXE>

**Chosen direction: A+B hybrid**, arranged like a map application.

### Layout

1. **Header** – brand (→ start screen), plan menu (saved plans, *New plan from GPX…*, *All plans*), *Not saved*
   badge, *Download plan*, language selector (US5). Without an open plan: the **start screen** with *New plan*
   (upload/drop a GPX) next to *Saved plans* and *Tracks without plan*.
2. **Plan column (left, scrolls on its own)** – track summary; plan settings (start date & time, time zone (US7),
   clock time / since start, tight threshold (US6); time model, speed and climb rate; totals: riding, stops, finish
   after / at, average
   speeds, smallest buffer); the editable timetable with
   one row per control: name, km, segment (distance, ↑climb ↓descent), pace (speed, climb rate), ride time, arrival,
   control window (ACP, editable), rest, departure, buffer with status (US6).
3. **Map pane (right, fixed)** – CyclOSM map with the track and checkpoint markers filling the remaining space, the
   route overlay selection and legend (US7) in its top right corner; elevation profile with the segment strip docked
   below it.

Once a track is loaded the page itself never scrolls – only the plan column does, so the map stays in view while
working through the timetable. Verified by [layout.spec.ts](../e2e/layout.spec.ts): plan column next to (desktop) or
below (tablet) the map, list scrolls while the map stays in place, clicking a marker scrolls its checkpoint into view,
the profile fits the map pane, no page scrolling.

### Responsive behaviour

| Device              | Behaviour                                                                           |
|---------------------|-------------------------------------------------------------------------------------|
| Desktop (≥ 1200 px) | Plan column (50 % of the width, 640–1040 px) left, map pane right                   |
| Tablet (≥ 768 px)   | Map pane on top (half the height, fixed), plan column below                         |
| Phone (< 768 px)    | Read-only: map, elevation profile and timetable cards; the page scrolls (see below) |

The timetable adapts to the width of the plan column (CSS container queries), not to the viewport. The *Segment*
column is always shown:

| Plan column width | Timetable                                                           |
|-------------------|---------------------------------------------------------------------|
| ≥ 1000 px         | All columns; speed/climb rate and opening/closing time side by side |
| < 1000 px         | Speed/climb rate and opening/closing time stacked in their cell     |
| < 900 px          | *Depart* hidden when times carry a weekday (ride across midnight)   |
| < 780 px          | *Depart* hidden                                                     |
| < 760 px          | *Ride* hidden (riding time in the segment strip's tooltip)          |

### Phone layout

A read-only timetable for the road (cross-functional requirement). Below 768 px the page scrolls as a whole and shows
only:

1. the map with the track and the checkpoint markers (about 40 % of the screen height),
2. the elevation profile with the segment strip,
3. track name, distance, climb and start, followed by one card per control: name, km, arrival (large), status and
   buffer, control window, rest, departure, segment (distance, climb/descent, riding time).

Plan settings, the editable table, the route overlays and all editing are left out; tapping the map or the profile
doesn't add checkpoints. Plans are opened from the start screen or the plan
menu ([US5](features/us05-multiple-route-plans.md)),
which on phones spans the screen below the header; *Download plan* is shown as icon. A plan prepared on a wider screen
keeps its state when the window
gets narrow (and is editable again when it gets wide); the map re-fits the track whenever its size changes.

Verified by [phone.spec.ts](../e2e/phone.spec.ts) (390 × 844, touch): *shows only the map, the elevation profile and
the timetable, without horizontal scrolling*, *tapping the map or the profile does not add checkpoints*, *a plan
prepared on a wider screen is shown as cards with arrival, status, window and buffer*; and
[Checkpoints.test.tsx](../src/components/checkpoints/Checkpoints.test.tsx) – *shows only map, profile and read-only
timetable cards*.

### Times (US6)

Points in time (arrival, departure, control windows) are shown as clock times (24 h, with the weekday when the ride
spans midnight) or – switchable in the plan settings – as hours:minutes since the start. Durations (riding time,
buffer, totals) are always hours:minutes.

### Status of an arrival (US6)

Shown in the *Buffer* column as text + icon + colour, never colour alone:

| Status | Rule                                                     |
|--------|----------------------------------------------------------|
| OK     | buffer to control close ≥ tight threshold                |
| Tight  | 0 ≤ buffer < tight threshold (configurable)              |
| Early  | arrival before the control opens – waiting time is added |
| Late   | arrival after the control closes                         |

### Visual language

White panels on a light neutral ground, orange route (`#C2410C`), blue checkpoint markers (`#1D4ED8`), Inter for
text with tabular numbers, Space Grotesk for headings – implemented as a Bootstrap theme (Sass variables in
`src/styles/theme.scss`), no custom component library.

## Architecture

```
src/
  app/         start-up (config → i18n → services), service context
  config/      loading + validating config.yaml, site URL / base path
  i18n/        i18next setup, locales/<lang>.json, formatting helpers
  domain/      pure TypeScript, no React:
    track/       GPX parsing, track statistics, snapping, elevation profile
    controls/    control rules (ACP)
    time/        time models (estimators) and their registry, durations, clock times, time zones
    overlays/    route overlays (US7) and their registry
    checkpoints.ts, segments.ts, timetable.ts, status.ts, timeAlongTrack.ts, sun.ts
  storage/     PlanRepository interface + implementations (plans folder, in memory), plans index format
  components/  React UI (Bootstrap via react-bootstrap)
e2e/           Playwright browser tests
tooling/       build helpers (site URL, test fixture generator)
```

Data flow: track + checkpoint state → control rows (rules) → segments → timetable (time model). Everything after the
state is derived on each change; nothing derived is stored.

### Exchangeable time model

```ts
interface TimeEstimator {
    id: string;                          // e.g. "speed-climb", stored with the plan
    labelKey: string;                    // i18n key of the name
    params: EstimatorParamDef[];         // key, label, unit, default, min, max – the UI renders inputs from these
    estimateMinutes(segment: SegmentInput, params: EstimatorParams): number;
}
```

- First implementation `speedClimbEstimator`: `time = distance / speed + climb / climbRate`.
- Estimators are registered in an `EstimatorRegistry`; a plan stores the estimator id and its parameters (plan values
    + per-segment overrides), so a model trained on past ride recordings can be added later without touching the UI.

### Route overlays

```ts
interface RouteOverlay {
    id: string;                          // i18n: overlays.<id>.name / .classes.<key> / .note / .unavailable
    classes: OverlayClass[];             // key + colour, in legend order
    classify(context: OverlayContext): OverlayRun[] | null;   // runs of track points with the same class
}

// context: track, expected minutes after the start at every track point, real start instant (UTC)
```

Overlays are registered in the `OverlayRegistry` (an app service, like the time models); the map draws the runs and
the panel renders selection and legend from this interface only. First overlays: road gradient, daylight.

### Control rules

Control opening/closing times are pre-filled from the ACP brevet rules (relative to the start) and can be overridden
per checkpoint. Rules sit behind an interface (`src/domain/controls/ControlRules.ts`) so RUSA/PBP/custom rules can
follow.

ACP rules as implemented (`acp.ts`): opening at the maximum and closing at the minimum speed per distance band
(0–200 km 15–34 km/h, –400 15–32, –600 15–30, –1000 11.428–28, –1300 13.333–26); the start closes after 1 h;
controls within the first 60 km close at 20 km/h + 1 h; the finish closes at the fixed limit of the nominal distance
(200: 13:30, 300: 20:00, 400: 27:00, 600: 40:00, 1000: 75:00, 1200: 90:00); distances beyond the nominal distance
count as the nominal distance; times are rounded to the minute.

Custom brevets ([US16](features/us16-custom-brevet.md)): distance and time limit set by the rider; openings as above,
the finish closes at the custom limit, all other closing times are scaled by custom limit ÷ formula limit of the
custom distance (`defaultTimeLimitMin`, also the proposal when choosing *Custom distance…*); the start window stays
one hour.

### Storage

Plans are files in the repository for now ([US5](features/us05-multiple-route-plans.md)):
`public/plans/<name>.plan.json`
next to its GPX. `PlanRepository` (async: `capabilities`, `list`, `load`, `loadTrack`, `save`) hides where they come
from:

- `StaticFilePlanRepository` (backend `files`) reads `plans/index.json`, the plan files and the GPX tracks from the
  site; read-only – the UI offers *Download plan* instead of saving. The index (static hosting can't list folders) is
  generated by the Vite plugin in `tooling/plansIndex.ts`: by the dev server on every request, into the build as a file.
- `InMemoryPlanRepository` is writable – used by the tests and the model for a database/backend implementation.

The backend is selected via `config.yaml` (`storage.backend`). Every implementation runs the shared contract tests
(`planRepositoryContract.ts`). The plan file format (`src/domain/planFile.ts`) has a format name and a version;
newer versions are rejected, older ones migrated.

### Localization

All UI strings via `react-i18next` keys (`src/i18n/locales/en.json`). Dates, times and numbers are formatted with
`Intl` for the active locale; times are shown in 24 h format. Further languages = new locale file + entry in
`config.yaml`.

## Configuration – `config.yaml`

`public/config.yaml` is served with the app and fetched once at application start (before the first render). Missing
values fall back to built-in defaults; invalid values stop the start-up with an error message.

| Key                           | Default                                             | Read at       |
|-------------------------------|-----------------------------------------------------|---------------|
| `site.url`                    | `https://ultra-cycling.github.io/brevet-planner`    | build + start |
| `i18n.defaultLanguage`        | `en`                                                | start         |
| `i18n.languages`              | `[en]`                                              | start         |
| `map.tileUrl` / `attribution` | CyclOSM                                             | start         |
| `storage.backend`             | `files`                                             | start         |
| `planning.defaultStartTime`   | `06:00`                                             | start         |
| `planning.tightBufferMinutes` | `75`                                                | start         |
| `planning.defaultRestMinutes` | `15`                                                | start         |
| `planning.timeModel.id`       | `speed-climb`                                       | start         |
| `planning.timeModel.params`   | model defaults (`speedKmh: 28`, `climbRateMh: 700`) | start         |

The planning values are defaults for new plans; each plan can override them. `timeModel.params` are validated against
the parameter definitions of the selected model, so a new model brings its own parameters without changes to the
config schema.

Verified by [app.spec.ts](../e2e/app.spec.ts) (loads the config, falls back to defaults when it is missing, explains
an invalid
config), [loadConfig.test.ts](../src/config/loadConfig.test.ts), [schema.test.ts](../src/config/schema.test.ts)
and [bootstrap.test.ts](../src/app/bootstrap.test.ts).

### Deployment URL and custom domain

`site.url` is the single source for the public URL. Its path becomes Vite's `base` at build time (so changing it
requires a rebuild):

- `https://ultra-cycling.github.io/brevet-planner` → base `/brevet-planner/`
- `https://brevet.example.org` (custom domain) → base `/`, and the build additionally emits a `CNAME` file for
  GitHub Pages.

The environment variable `SITE_URL` overrides `site.url` for a build (e.g. in CI). Verified by
[siteUrl.test.ts](../src/config/siteUrl.test.ts).

## Testing

- **Unit tests** (Vitest, jsdom): domain logic in isolation, components with Testing Library. Leaflet needs a real
  layout engine, so component tests replace the map with a stub; the map itself is covered by browser tests.
- **Browser tests** (Playwright): run against the production build served like on GitHub Pages, in a desktop
  (1440 × 900) and a tablet (820 × 1180) viewport; the phone layout (`phone.spec.ts`), the route plans
  (`plans.spec.ts`) and the start-up tests also run in a phone viewport (390 × 844, touch). Map tiles are stubbed; the
  GPX fixture `e2e/fixtures/sample-loop.gpx` (uploads) is generated by `node tooling/generate-sample-gpx.ts`; the plans
  tests use the committed 300 km sample route in `public/plans/`.
- Test names describe behaviour; the feature files reference them per acceptance criterion.
