import type { i18n as I18n } from 'i18next';
import { loadConfig } from '../config/loadConfig';
import { ConfigError, type AppConfig } from '../config/schema';
import { createDefaultEstimatorRegistry } from '../domain/time/registry';
import { resolveParams } from '../domain/time/TimeEstimator';
import { initI18n } from '../i18n';
import { createPlanRepository } from '../storage/createPlanRepository';
import type { AppServices } from './AppServices';

export interface StartedApp {
  services: AppServices;
  i18n: I18n;
}

/** Validates parts of the config that depend on the registered time models. */
export function validateTimeModel(config: AppConfig, services: Pick<AppServices, 'estimators'>): void {
  const { id, params } = config.planning.timeModel;
  if (!services.estimators.has(id)) {
    throw new ConfigError(`"planning.timeModel.id" is unknown: ${id} (available: ${services.estimators.ids().join(', ')})`);
  }
  const estimator = services.estimators.get(id);
  const known = new Set(estimator.params.map((p) => p.key));
  const unknown = Object.keys(params).filter((key) => !known.has(key));
  if (unknown.length > 0) {
    throw new ConfigError(`"planning.timeModel.params" has unknown keys for ${id}: ${unknown.join(', ')}`);
  }
  try {
    resolveParams(estimator, params);
  } catch (error) {
    throw new ConfigError(`"planning.timeModel.params": ${(error as Error).message}`);
  }
}

/** Application start: read config.yaml, then set up i18n, storage and time models. */
export async function startApp(load: () => Promise<AppConfig> = () => loadConfig()): Promise<StartedApp> {
  const config = await load();
  const estimators = createDefaultEstimatorRegistry();
  validateTimeModel(config, { estimators });
  const i18n = await initI18n(config.i18n);
  return {
    services: { config, estimators, planRepository: createPlanRepository(config.storage) },
    i18n,
  };
}
