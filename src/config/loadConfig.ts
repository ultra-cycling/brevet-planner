import { parse } from 'yaml';
import { ConfigError, defaultConfig, parseConfig, type AppConfig } from './schema';

export const CONFIG_FILE = 'config.yaml';

/**
 * Fetches and validates config.yaml from the app's base URL.
 * A missing file falls back to the defaults; an unreadable or invalid file throws a ConfigError.
 */
export async function loadConfig(
  fetchFn: typeof fetch = fetch,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<AppConfig> {
  const response = await fetchFn(`${baseUrl}${CONFIG_FILE}`, { cache: 'no-cache' });
  if (response.status === 404) {
    console.warn(`${CONFIG_FILE} not found – using default configuration`);
    return structuredClone(defaultConfig);
  }
  if (!response.ok) {
    throw new ConfigError(`Could not load ${CONFIG_FILE} (HTTP ${response.status})`);
  }

  let raw: unknown;
  try {
    raw = parse(await response.text());
  } catch (error) {
    throw new ConfigError(`${CONFIG_FILE} is not valid YAML: ${(error as Error).message}`);
  }
  return parseConfig(raw);
}
