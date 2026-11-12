import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { ConfigError, defaultConfig, parseConfig } from './schema';

describe('parseConfig', () => {
  it('returns the defaults for an empty document', () => {
    expect(parseConfig(null)).toEqual(defaultConfig);
    expect(parseConfig({})).toEqual(defaultConfig);
  });

  it('merges given values over the defaults', () => {
    const config = parseConfig({
      site: { url: 'https://brevet.example.org' },
      planning: { tightBufferMinutes: 90, timeModel: { params: { speedKmh: 25 } } },
    });
    expect(config.site.url).toBe('https://brevet.example.org');
    expect(config.planning.tightBufferMinutes).toBe(90);
    expect(config.planning.timeModel).toEqual({ id: 'speed-climb', params: { speedKmh: 25 } });
    expect(config.planning.defaultStartTime).toBe('06:00');
    expect(config.map).toEqual(defaultConfig.map);
  });

  it.each([
    ['top level is not a mapping', ['a', 'b'], /top level/],
    ['site.url is not a URL', { site: { url: 'not a url' } }, /site\.url/],
    ['tight threshold is negative', { planning: { tightBufferMinutes: -5 } }, /tightBufferMinutes/],
    ['tight threshold is a string', { planning: { tightBufferMinutes: '75' } }, /tightBufferMinutes/],
    ['start time is malformed', { planning: { defaultStartTime: '6 am' } }, /defaultStartTime/],
    ['storage backend is unknown', { storage: { backend: 'mongo' } }, /storage\.backend/],
    ['default language is not listed', { i18n: { defaultLanguage: 'de', languages: ['en'] } }, /defaultLanguage/],
    ['a model param is not a number', { planning: { timeModel: { params: { speedKmh: 'fast' } } } }, /speedKmh/],
  ])('rejects config where %s', (_, raw, message) => {
    expect(() => parseConfig(raw)).toThrow(ConfigError);
    expect(() => parseConfig(raw)).toThrow(message);
  });

  it('accepts the shipped public/config.yaml', () => {
    const raw: unknown = parse(readFileSync('public/config.yaml', 'utf8'));
    const config = parseConfig(raw);
    expect(config.site.url).toBe('https://ultra-cycling.github.io/brevet-planner');
    expect(config.planning.timeModel).toEqual({ id: 'speed-climb', params: { speedKmh: 28, climbRateMh: 700 } });
  });
});
