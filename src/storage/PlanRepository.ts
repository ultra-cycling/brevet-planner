import type { Plan, PlanSummary } from '../domain/plan';

/**
 * Storage abstraction for route plans. All methods are async so a server backend
 * can replace the in-browser implementation without changes to callers.
 */
export interface PlanRepository {
  /** Summaries of all stored plans, most recently updated first. */
  list(): Promise<PlanSummary[]>;
  get(id: string): Promise<Plan | undefined>;
  /** Creates or replaces the plan; returns the stored version (with updated `updatedAt`). */
  save(plan: Plan): Promise<Plan>;
  /** Deleting an unknown id is not an error. */
  delete(id: string): Promise<void>;
}
