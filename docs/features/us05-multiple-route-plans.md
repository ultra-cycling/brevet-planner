# US5 – Manage multiple route plans

| Status  | Iteration                   | Persona               |
|---------|-----------------------------|-----------------------|
| ✅ Done | [10](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to keep several route plans and choose one on the start screen – or start a new plan from a GPX file
So that I can manage more than one route and continue planning later

For now plans are files in the git repository (`public/plans/`); a database or backend service can replace them later
without changes to the UI.

## How plans are stored

```
public/plans/
  300km-sample-route.gpx          GPX track
  300km-sample-route.plan.json    plan, refers to its track: "track": "300km-sample-route.gpx"
  new-route.gpx                   no plan refers to it → "track without plan" on the start screen
```

- The app reads the folder (dev server: on every reload; deployed site: as built) and never writes to it.
- **Saving a plan:** *Download plan* in the header → put the `.plan.json` file into `public/plans/` (next to its GPX;
  for an uploaded track also download the GPX from the dialog) → commit both files.
- The deployed GitHub Pages site shows the committed plans read-only; changes there are kept only by downloading.

## Acceptance criteria

| #    | Criterion | Verified by |
|------|-----------|-------------|
| 5.1  | The start screen shows *New plan* (upload or drop a GPX) next to *Saved plans* from the plans folder. | [App.test.tsx](../../src/components/App.test.tsx) – *shows the brand, the language selector and the start screen*, *accepts a file dropped on the start screen*; [plans.spec.ts](../../e2e/plans.spec.ts) – *the start screen lists the committed plans next to the upload* |
| 5.2  | Each saved plan shows name, start date and time, distance, climb, number of checkpoints and brevet distance; GPX files without plan are listed as *Tracks without plan*; files that can't be opened (invalid, newer format, missing track) are listed with the reason; an empty folder explains how to add plans. | [App.test.tsx](../../src/components/App.test.tsx) – *lists the saved plans next to the upload, with tracks without plan and broken files*, *explains how to add plans when the folder is empty*; [plansIndex.test.ts](../../tooling/plansIndex.test.ts) |
| 5.3  | Opening a plan restores track, checkpoints (names, rests, control window overrides, segment pace), brevet distance, start, time zone, tight threshold and time model exactly as saved. | [planFile.test.ts](../../src/domain/planFile.test.ts) – *restores exactly the same plan after saving and opening it*; [App.test.tsx](../../src/components/App.test.tsx) – *opens a saved plan with all its planning decisions and puts it into the URL*; [plans.spec.ts](../../e2e/plans.spec.ts) |
| 5.4  | A new plan – from an uploaded GPX or a track without plan – starts with start and finish only and is named after the track; the name can be changed. | [App.test.tsx](../../src/components/App.test.tsx) – *starts a new plan from a track without plan*, *downloads a new plan as plan file and offers its track, then shows it as saved* |
| 5.5  | *Download plan* saves `<name>.plan.json` (a saved plan under its file name, a new one named after its GPX); a dialog explains where to put it and offers the GPX of an uploaded track. *Not saved* shows when the plan differs from the last opened or downloaded version. | [App.test.tsx](../../src/components/App.test.tsx) – *downloads a new plan as plan file and offers its track, then shows it as saved*, *downloads a saved plan under its file name, without offering the track again*; [plans.spec.ts](../../e2e/plans.spec.ts) – *downloading a plan gives the plan file as committed* |
| 5.6  | Leaving a plan with unsaved changes (start screen, another plan, new plan) asks first: *Download plan*, *Discard changes* or *Stay*; reloading or closing the tab warns as well. | [App.test.tsx](../../src/components/App.test.tsx) – *asks before leaving a plan with unsaved changes*; [plans.spec.ts](../../e2e/plans.spec.ts) – *the plan menu starts a new plan from a GPX and asks before leaving it unsaved* |
| 5.7  | The plan menu in the header switches between saved plans (the open one marked), starts a new plan from a GPX and leads to all plans; the brand leads to the start screen. | [App.test.tsx](../../src/components/App.test.tsx) – *switches between saved plans with the plan menu*; [plans.spec.ts](../../e2e/plans.spec.ts) |
| 5.8  | Each saved plan has a URL (`?plan=<name>`): reloading keeps it, links can be shared, the browser's back button returns to the start screen; an unknown plan leads to the start screen with a message. | [App.test.tsx](../../src/components/App.test.tsx) – *opens the plan of the URL directly, and explains unknown plans*, *returns to the start screen with the browser back button*; [plans.spec.ts](../../e2e/plans.spec.ts) – *a plan opens with its checkpoints, keeps its URL on reload and back leads to the start screen*, *an unknown plan in the URL leads to the start screen with a message* |
| 5.9  | Plan files carry a format and version; invalid fields are named, files of a newer app version are rejected with a clear message, older versions are migrated (version 1 → 2: custom brevets, [US16](us16-custom-brevet.md)). | [planFile.test.ts](../../src/domain/planFile.test.ts) – *rejects a plan saved by a newer app version with a clear message*, *names the invalid field %s*, *migrates version 1 plans (before custom brevets) to the current version* |
| 5.10 | Storage is replaceable: the UI only uses the `PlanRepository` interface, all backends pass the same contract tests, the backend is selected in `config.yaml` (`storage.backend: files`). | [repositories.test.ts](../../src/storage/repositories.test.ts); [planRepositoryContract.ts](../../src/storage/planRepositoryContract.ts); [schema.test.ts](../../src/config/schema.test.ts) |
| 5.11 | Works on the phone: start screen, plan menu within the screen, read-only plan view. | [plans.spec.ts](../../e2e/plans.spec.ts) (phone viewport) |

## Implementation notes

- Plan file: `src/domain/planFile.ts` (`toPlanFile`, `parsePlanFile`, `planStateFromFile`, migration); plan state:
  `src/domain/planState.ts`. Checkpoints are stored with their distance along the track; positions, segments, windows
  and timetable are recalculated when the plan is opened.
- Storage: `src/storage/` – `PlanRepository` interface, `StaticFilePlanRepository` (fetches `plans/index.json`, the
  plan file and the GPX), `InMemoryPlanRepository` (tests, model for a backend). The folder index is generated by
  `tooling/plansIndex.ts` (Vite plugin): live by the dev server, as a file in the build.
- UI: `App.tsx` (start screen or plan, URL, unsaved-changes guard), `planner/PlannerView.tsx`, `start/StartScreen.tsx`,
  `plans/PlanMenu.tsx`, `plans/PlanDialogs.tsx`.
- The default test track `300km-sample-route` (Komoot export) is also the reference for the climb calculation
  ([US12](us12-elevation-from-terrain-data.md)); its two checkpoints are placeholders.
- A database/backend implementation needs to provide the same `PlanRepository` interface (with `capabilities.save`)
  – the UI then saves instead of downloading.
