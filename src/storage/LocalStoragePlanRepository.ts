import type { Plan, PlanSummary } from '../domain/plan';
import type { PlanRepository } from './PlanRepository';

/**
 * Stores each plan under its own key plus an index of summaries:
 *   <prefix>:index      → PlanSummary[]
 *   <prefix>:plan:<id>  → Plan
 */
export class LocalStoragePlanRepository implements PlanRepository {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly prefix = 'brevet-planner',
    private readonly now: () => Date = () => new Date(),
  ) {}

  private get indexKey() {
    return `${this.prefix}:index`;
  }

  private planKey(id: string) {
    return `${this.prefix}:plan:${id}`;
  }

  private readIndex(): PlanSummary[] {
    const raw = this.storage.getItem(this.indexKey);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PlanSummary[]) : [];
    } catch {
      return [];
    }
  }

  private writeIndex(index: PlanSummary[]) {
    this.storage.setItem(this.indexKey, JSON.stringify(index));
  }

  async list(): Promise<PlanSummary[]> {
    return this.readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Plan | undefined> {
    const raw = this.storage.getItem(this.planKey(id));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Plan;
    } catch {
      return undefined;
    }
  }

  async save(plan: Plan): Promise<Plan> {
    const stored: Plan = { ...structuredClone(plan), updatedAt: this.now().toISOString() };
    this.storage.setItem(this.planKey(stored.id), JSON.stringify(stored));
    const summary: PlanSummary = { id: stored.id, name: stored.name, updatedAt: stored.updatedAt };
    this.writeIndex([...this.readIndex().filter((s) => s.id !== stored.id), summary]);
    return structuredClone(stored);
  }

  async delete(id: string): Promise<void> {
    this.storage.removeItem(this.planKey(id));
    this.writeIndex(this.readIndex().filter((s) => s.id !== id));
  }
}
