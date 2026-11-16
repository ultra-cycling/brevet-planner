import type { PlanFile } from '../domain/planFile';
import type { PlansIndexPlan, PlansIndexTrack } from './plansIndexFormat';

/** A saved plan in the list of the start screen (with the reason if it can't be opened) */
export type PlanEntry = PlansIndexPlan;
/** A GPX track that no plan uses yet – a new plan can be started from it */
export type TrackEntry = PlansIndexTrack;

export interface PlanListing {
  plans: PlanEntry[];
  tracks: TrackEntry[];
}

export interface StoredPlan {
  plan: PlanFile;
  /** GPX file content of the plan's track */
  gpx: string;
}

export type PlanStorageErrorCode = 'notFound' | 'unavailable' | 'readOnly';

export class PlanStorageError extends Error {
  constructor(
    readonly code: PlanStorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PlanStorageError';
  }
}

/**
 * Storage of route plans and their GPX tracks (US5). The UI only uses this interface, so the files in the repository
 * (`StaticFilePlanRepository`) can later be replaced by a database or a backend service. All methods are async.
 * Errors: `PlanStorageError` (not found, storage unavailable) and `PlanFileError` (invalid plan file).
 */
export interface PlanRepository {
  /** What the backend supports – the UI offers "Download plan" when it can't save */
  readonly capabilities: { save: boolean };
  /** Saved plans and tracks without plan */
  list(): Promise<PlanListing>;
  /** A plan with the content of its GPX track */
  load(id: string): Promise<StoredPlan>;
  /** Content of a GPX track (e.g. one without plan) */
  loadTrack(file: string): Promise<string>;
  /** Creates or replaces a plan and its track – only when `capabilities.save` */
  save(id: string, plan: PlanFile, gpx: string): Promise<void>;
}
