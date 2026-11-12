import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from './loadConfig';
import { ConfigError, defaultConfig } from './schema';

const respond = (body: string, status = 200) => vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

describe('loadConfig', () => {
  it('fetches config.yaml relative to the base URL and parses it', async () => {
    const fetchFn = respond('planning:\n  tightBufferMinutes: 60\n');
    const config = await loadConfig(fetchFn, '/brevet-planner/');
    expect(fetchFn).toHaveBeenCalledWith('/brevet-planner/config.yaml', { cache: 'no-cache' });
    expect(config.planning.tightBufferMinutes).toBe(60);
  });

  it('falls back to defaults when the file is missing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(loadConfig(respond('', 404), '/')).resolves.toEqual(defaultConfig);
  });

  it('fails on server errors', async () => {
    await expect(loadConfig(respond('', 500), '/')).rejects.toThrow(/HTTP 500/);
  });

  it('fails on invalid YAML', async () => {
    await expect(loadConfig(respond('planning: [unclosed', 200), '/')).rejects.toThrow(ConfigError);
  });
});
