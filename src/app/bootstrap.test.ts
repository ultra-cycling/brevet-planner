import { describe, expect, it } from 'vitest';
import { ConfigError, defaultConfig, parseConfig } from '../config/schema';
import { startApp } from './bootstrap';

describe('startApp', () => {
  it('wires up config, i18n, storage and time models', async () => {
    const { services, i18n } = await startApp(async () => structuredClone(defaultConfig));
    expect(services.config).toEqual(defaultConfig);
    expect(services.estimators.has('speed-climb')).toBe(true);
    expect(await services.planRepository.list()).toEqual([]);
    expect(i18n.t('app.name')).toBe('Brevet Planner');
    expect(document.documentElement.lang).toBe('en');
  });

  it.each([
    ['an unknown time model', { planning: { timeModel: { id: 'magic' } } }, /timeModel\.id/],
    ['an unknown model parameter', { planning: { timeModel: { params: { watts: 200 } } } }, /unknown keys.*watts/],
    ['a parameter out of range', { planning: { timeModel: { params: { speedKmh: 500 } } } }, /speedKmh/],
    ['a language without translations', { i18n: { defaultLanguage: 'de', languages: ['de'] } }, /without translations: de/],
  ])('fails for %s', async (_, raw, message) => {
    const start = startApp(async () => parseConfig(raw));
    await expect(start).rejects.toThrow(ConfigError);
    await expect(startApp(async () => parseConfig(raw))).rejects.toThrow(message);
  });
});
