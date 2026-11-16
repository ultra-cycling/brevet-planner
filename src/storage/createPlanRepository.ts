import type { AppConfig } from '../config/schema';
import type { PlanRepository } from './PlanRepository';
import { StaticFilePlanRepository } from './StaticFilePlanRepository';

/** Folder of the plan and GPX files, relative to the site (`public/plans/` in the repository) */
export const PLANS_FOLDER = 'plans/';

/** Creates the storage backend selected in config.yaml (`storage.backend`). */
export function createPlanRepository(config: AppConfig['storage'], baseUrl: string = import.meta.env.BASE_URL): PlanRepository {
  switch (config.backend) {
    case 'files':
      return new StaticFilePlanRepository(`${baseUrl}${PLANS_FOLDER}`);
  }
}
