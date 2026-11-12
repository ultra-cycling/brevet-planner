import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppServicesProvider, type AppServices } from '../app/AppServices';
import { defaultConfig, type AppConfig } from '../config/schema';
import { createDefaultEstimatorRegistry } from '../domain/time/registry';
import { initI18n } from '../i18n';
import { LocalStoragePlanRepository } from '../storage/LocalStoragePlanRepository';

/** Renders a component with the same providers as the app, using test-friendly services. */
export async function renderWithServices(ui: ReactElement, overrides: Partial<AppServices> = {}) {
  const config: AppConfig = overrides.config ?? structuredClone(defaultConfig);
  const services: AppServices = {
    config,
    estimators: createDefaultEstimatorRegistry(),
    planRepository: new LocalStoragePlanRepository(localStorage, 'test'),
    ...overrides,
  };
  const i18n = await initI18n(config.i18n);
  return {
    services,
    ...render(
      <I18nextProvider i18n={i18n}>
        <AppServicesProvider services={services}>{ui}</AppServicesProvider>
      </I18nextProvider>,
    ),
  };
}
