import { speedClimbEstimator } from './SpeedClimbEstimator';
import type { TimeEstimator } from './TimeEstimator';

/** Lookup of the available time models by id. New models are added with `register`. */
export class EstimatorRegistry {
  private readonly estimators = new Map<string, TimeEstimator>();

  constructor(estimators: TimeEstimator[] = []) {
    estimators.forEach((e) => this.register(e));
  }

  register(estimator: TimeEstimator): void {
    if (this.estimators.has(estimator.id)) {
      throw new Error(`Time model "${estimator.id}" is already registered`);
    }
    this.estimators.set(estimator.id, estimator);
  }

  has(id: string): boolean {
    return this.estimators.has(id);
  }

  get(id: string): TimeEstimator {
    const estimator = this.estimators.get(id);
    if (!estimator) {
      throw new Error(`Unknown time model "${id}". Available: ${this.ids().join(', ')}`);
    }
    return estimator;
  }

  list(): TimeEstimator[] {
    return [...this.estimators.values()];
  }

  ids(): string[] {
    return [...this.estimators.keys()];
  }
}

export function createDefaultEstimatorRegistry(): EstimatorRegistry {
  return new EstimatorRegistry([speedClimbEstimator]);
}
