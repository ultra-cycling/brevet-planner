import { parsePlanFile, PLAN_FILE_SUFFIX, type PlanFile } from '../domain/planFile';
import { buildPlansIndex } from './plansIndex';
import { PlanStorageError, type PlanListing, type PlanRepository, type StoredPlan } from './PlanRepository';

/**
 * Writable plan storage in memory – the same file layout as the plans folder. Used in tests, and the model for a
 * future database/backend implementation.
 */
export class InMemoryPlanRepository implements PlanRepository {
  readonly capabilities = { save: true };
  private readonly files: Map<string, string>;

  /** @param files file name → content, e.g. `{ 'x.plan.json': '…', 'x.gpx': '<gpx>…' }` */
  constructor(files: Record<string, string> = {}) {
    this.files = new Map(Object.entries(files));
  }

  private read(file: string): string {
    const content = this.files.get(file);
    if (content === undefined) throw new PlanStorageError('notFound', `${file} was not found.`);
    return content;
  }

  async list(): Promise<PlanListing> {
    return buildPlansIndex([...this.files].map(([name, content]) => ({ name, content })));
  }

  async load(id: string): Promise<StoredPlan> {
    const plan = parsePlanFile(this.read(`${id}${PLAN_FILE_SUFFIX}`));
    return { plan, gpx: this.read(plan.track) };
  }

  async loadTrack(file: string): Promise<string> {
    return this.read(file);
  }

  async save(id: string, plan: PlanFile, gpx: string): Promise<void> {
    this.files.set(`${id}${PLAN_FILE_SUFFIX}`, JSON.stringify(plan, null, 2));
    this.files.set(plan.track, gpx);
  }
}
