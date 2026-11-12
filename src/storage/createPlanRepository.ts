import type { AppConfig } from '../config/schema';
import { LocalStoragePlanRepository } from './LocalStoragePlanRepository';
import type { PlanRepository } from './PlanRepository';

/** Creates the storage backend selected in config.yaml (`storage.backend`). */
export function createPlanRepository(config: AppConfig['storage']): PlanRepository {
  switch (config.backend) {
    case 'localStorage':
      return new LocalStoragePlanRepository();
  }
}
