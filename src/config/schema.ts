import { DEFAULT_SITE_URL } from './siteUrl';

export type StorageBackend = 'localStorage';

export interface TimeModelConfig {
  id: string;
  params: Record<string, number>;
}

export interface AppConfig {
  site: { url: string };
  i18n: { defaultLanguage: string; languages: string[] };
  map: { tileUrl: string; subdomains: string[]; maxZoom: number; attribution: string };
  storage: { backend: StorageBackend };
  planning: {
    defaultStartTime: string;
    tightBufferMinutes: number;
    timeModel: TimeModelConfig;
  };
}

export const STORAGE_BACKENDS: readonly StorageBackend[] = ['localStorage'];

export const defaultConfig: AppConfig = {
  site: { url: DEFAULT_SITE_URL },
  i18n: { defaultLanguage: 'en', languages: ['en'] },
  map: {
    tileUrl: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 20,
    attribution:
      '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases">CyclOSM</a> | ' +
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  storage: { backend: 'localStorage' },
  planning: {
    defaultStartTime: '06:00',
    tightBufferMinutes: 75,
    timeModel: { id: 'speed-climb', params: {} },
  },
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function section(raw: Raw, key: string, path: string): Raw {
  const value = raw[key];
  if (value === undefined || value === null) return {};
  if (!isObject(value)) throw new ConfigError(`"${path}" must be a mapping`);
  return value;
}

function str(raw: Raw, key: string, path: string, fallback: string): string {
  const value = raw[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigError(`"${path}" must be a non-empty string`);
  }
  return value.trim();
}

function num(raw: Raw, key: string, path: string, fallback: number, min: number): number {
  const value = raw[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new ConfigError(`"${path}" must be a number ≥ ${min}`);
  }
  return value;
}

function strList(raw: Raw, key: string, path: string, fallback: string[]): string[] {
  const value = raw[key];
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === 'string' && v !== '')) {
    throw new ConfigError(`"${path}" must be a non-empty list of strings`);
  }
  return value as string[];
}

function url(raw: Raw, key: string, path: string, fallback: string): string {
  const value = str(raw, key, path, fallback);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
  } catch {
    throw new ConfigError(`"${path}" must be an http(s) URL`);
  }
  return value;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Merges a parsed config.yaml document over the defaults and validates it. */
export function parseConfig(raw: unknown): AppConfig {
  if (raw === undefined || raw === null) return structuredClone(defaultConfig);
  if (!isObject(raw)) throw new ConfigError('config.yaml must contain a mapping at the top level');
  const d = defaultConfig;

  const site = section(raw, 'site', 'site');
  const i18n = section(raw, 'i18n', 'i18n');
  const map = section(raw, 'map', 'map');
  const storage = section(raw, 'storage', 'storage');
  const planning = section(raw, 'planning', 'planning');
  const timeModel = section(planning, 'timeModel', 'planning.timeModel');
  const params = section(timeModel, 'params', 'planning.timeModel.params');

  const languages = strList(i18n, 'languages', 'i18n.languages', d.i18n.languages);
  const defaultLanguage = str(i18n, 'defaultLanguage', 'i18n.defaultLanguage', d.i18n.defaultLanguage);
  if (!languages.includes(defaultLanguage)) {
    throw new ConfigError(`"i18n.defaultLanguage" (${defaultLanguage}) must be listed in "i18n.languages"`);
  }

  const backend = str(storage, 'backend', 'storage.backend', d.storage.backend);
  if (!STORAGE_BACKENDS.includes(backend as StorageBackend)) {
    throw new ConfigError(`"storage.backend" must be one of: ${STORAGE_BACKENDS.join(', ')}`);
  }

  const defaultStartTime = str(planning, 'defaultStartTime', 'planning.defaultStartTime', d.planning.defaultStartTime);
  if (!TIME_PATTERN.test(defaultStartTime)) {
    throw new ConfigError('"planning.defaultStartTime" must be a time in HH:MM format');
  }

  const parsedParams: Record<string, number> = {};
  for (const key of Object.keys(params)) {
    if (params[key] === null) continue; // empty value in YAML → use the model's default
    parsedParams[key] = num(params, key, `planning.timeModel.params.${key}`, 0, 0);
  }

  return {
    site: { url: url(site, 'url', 'site.url', d.site.url) },
    i18n: { defaultLanguage, languages },
    map: {
      tileUrl: str(map, 'tileUrl', 'map.tileUrl', d.map.tileUrl),
      subdomains: strList(map, 'subdomains', 'map.subdomains', d.map.subdomains),
      maxZoom: num(map, 'maxZoom', 'map.maxZoom', d.map.maxZoom, 1),
      attribution: str(map, 'attribution', 'map.attribution', d.map.attribution),
    },
    storage: { backend: backend as StorageBackend },
    planning: {
      defaultStartTime,
      tightBufferMinutes: num(planning, 'tightBufferMinutes', 'planning.tightBufferMinutes', d.planning.tightBufferMinutes, 0),
      timeModel: {
        id: str(timeModel, 'id', 'planning.timeModel.id', d.planning.timeModel.id),
        params: parsedParams,
      },
    },
  };
}
