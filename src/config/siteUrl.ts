/**
 * Helpers that derive deployment settings from the public site URL (`site.url` in config.yaml).
 * Pure functions – used by the Vite / Playwright configuration and the app.
 */

export const DEFAULT_SITE_URL = 'https://ultra-cycling.github.io/brevet-planner';

/** Base path the app is served from, always with leading and trailing slash. */
export function basePathFromSiteUrl(siteUrl: string): string {
  const path = new URL(siteUrl).pathname.replace(/\/+$/, '');
  return `${path}/`;
}

/**
 * Host name to write into a GitHub Pages CNAME file, or `null` when the site is served
 * from a github.io domain and needs no CNAME.
 */
export function cnameFromSiteUrl(siteUrl: string): string | null {
  const host = new URL(siteUrl).hostname;
  return host === 'github.io' || host.endsWith('.github.io') ? null : host;
}
