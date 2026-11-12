import i18next, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { AppConfig } from '../config/schema';
import { ConfigError } from '../config/schema';
import en from './locales/en.json';

/** Bundled translations. Adding a language = new locale file + entry here + entry in config.yaml. */
export const resources = {
  en: { translation: en },
} as const;

export type Language = keyof typeof resources;

export function availableLanguages(): string[] {
  return Object.keys(resources);
}

/** Creates and initialises an i18next instance for the configured languages. */
export async function initI18n(config: AppConfig['i18n']): Promise<I18n> {
  const missing = config.languages.filter((lng) => !(lng in resources));
  if (missing.length > 0) {
    throw new ConfigError(
      `"i18n.languages" contains languages without translations: ${missing.join(', ')} ` +
        `(available: ${availableLanguages().join(', ')})`,
    );
  }

  const instance = i18next.createInstance();
  instance.on('languageChanged', (lng) => {
    if (typeof document !== 'undefined') document.documentElement.lang = lng;
  });
  await instance.use(initReactI18next).init({
    resources,
    lng: config.defaultLanguage,
    fallbackLng: config.defaultLanguage,
    supportedLngs: config.languages,
    interpolation: { escapeValue: false }, // React escapes already
  });
  return instance;
}
