// Node-only helper shared by vite.config.ts and playwright.config.ts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { DEFAULT_SITE_URL } from '../src/config/siteUrl.ts';

const CONFIG_PATH = fileURLToPath(new URL('../public/config.yaml', import.meta.url));

/** Site URL for the build: env SITE_URL (if set and non-empty) → config.yaml `site.url` → default. */
export function readSiteUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.SITE_URL && env.SITE_URL.trim() !== '') return env.SITE_URL.trim();
  const config = parse(readFileSync(CONFIG_PATH, 'utf8')) as { site?: { url?: unknown } } | null;
  const url = config?.site?.url;
  return typeof url === 'string' && url.trim() !== '' ? url.trim() : DEFAULT_SITE_URL;
}
