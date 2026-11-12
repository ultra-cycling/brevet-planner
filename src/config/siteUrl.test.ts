import { describe, expect, it } from 'vitest';
import { basePathFromSiteUrl, cnameFromSiteUrl, DEFAULT_SITE_URL } from './siteUrl';

describe('basePathFromSiteUrl', () => {
  it.each([
    [DEFAULT_SITE_URL, '/brevet-planner/'],
    ['https://ultra-cycling.github.io/brevet-planner/', '/brevet-planner/'],
    ['https://brevet.example.org', '/'],
    ['https://brevet.example.org/', '/'],
    ['https://example.org/tools/brevet', '/tools/brevet/'],
  ])('%s → %s', (url, base) => {
    expect(basePathFromSiteUrl(url)).toBe(base);
  });
});

describe('cnameFromSiteUrl', () => {
  it('needs no CNAME on github.io', () => {
    expect(cnameFromSiteUrl(DEFAULT_SITE_URL)).toBeNull();
  });

  it('returns the host of a custom domain', () => {
    expect(cnameFromSiteUrl('https://brevet.example.org/')).toBe('brevet.example.org');
  });
});
