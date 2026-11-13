# US5 – Allow storing multiple route plans

| Status                         | Iteration                   | Persona               |
|--------------------------------|-----------------------------|-----------------------|
| Postponed (storage layer done) | [10](../plan.md#iterations) | Long-distance cyclist |

As a long distance cyclist
I want to store multiple route plans in the app
So that I can manage more than 1 track and switch between them

## Acceptance criteria

Criteria 5.1–5.3 are covered by the storage layer built in iteration 0; the others are proposed and get their tests
with the iteration.

| #   | Criterion                                                                                                                                                | Verified by                                                                                |
|-----|----------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| 5.1 | Plans are saved through an exchangeable storage interface (`PlanRepository`); saving, loading, replacing and deleting behave the same for every backend. | [planRepositoryContract.ts](../../src/storage/planRepositoryContract.ts)                   |
| 5.2 | Plans are stored in the browser's local storage, listed with the most recently changed first, and a corrupted index doesn't break the app.               | [LocalStoragePlanRepository.test.ts](../../src/storage/LocalStoragePlanRepository.test.ts) |
| 5.3 | The storage backend is selected in `config.yaml` (`storage.backend`).                                                                                    | [schema.test.ts](../../src/config/schema.test.ts)                                          |
| 5.4 | Uploading a GPX file creates a new plan named after the track; it contains the track, checkpoints, control windows, pace and rest times.                 | *proposed*                                                                                 |
| 5.5 | Every change is saved automatically; after reloading the page the last opened plan is shown unchanged.                                                   | *proposed*                                                                                 |
| 5.6 | A plan switcher in the header lists all plans (newest first) and opens the selected one.                                                                 | *proposed*                                                                                 |
| 5.7 | A plan can be renamed and deleted (after confirmation).                                                                                                  | *proposed*                                                                                 |
| 5.8 | Stored plans of an older format are migrated or a clear message explains why they can't be opened.                                                       | *proposed*                                                                                 |
