// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readSiteUrl } from './siteUrl.node';

describe('readSiteUrl', () => {
  it('reads site.url from public/config.yaml', () => {
    expect(readSiteUrl({})).toBe('https://ultra-cycling.github.io/brevet-planner');
  });

  it('lets SITE_URL override the config file', () => {
    expect(readSiteUrl({ SITE_URL: 'https://brevet.example.org' })).toBe('https://brevet.example.org');
  });

  it('ignores an empty SITE_URL (unset repository variable in CI)', () => {
    expect(readSiteUrl({ SITE_URL: '' })).toBe('https://ultra-cycling.github.io/brevet-planner');
  });
});
