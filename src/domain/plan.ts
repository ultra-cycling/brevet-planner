/**
 * Route plan as persisted by a PlanRepository.
 * Iteration 0 only contains the envelope – track, checkpoints and timing are added story by story.
 * Bump PLAN_SCHEMA_VERSION on incompatible changes so stored plans can be migrated.
 */
export const PLAN_SCHEMA_VERSION = 1;

export interface Plan {
  id: string;
  schemaVersion: number;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type PlanSummary = Pick<Plan, 'id' | 'name' | 'updatedAt'>;

export function createPlan(name: string, now: Date = new Date(), id: string = crypto.randomUUID()): Plan {
  const timestamp = now.toISOString();
  return { id, schemaVersion: PLAN_SCHEMA_VERSION, name, createdAt: timestamp, updatedAt: timestamp };
}
