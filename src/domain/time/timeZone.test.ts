import { describe, expect, it } from 'vitest';
import { availableTimeZones, isValidTimeZone, startInstantUtc } from './timeZone';

describe('time zones', () => {
  it('converts the wall-clock start in a zone into a real instant', () => {
    expect(new Date(startInstantUtc({ date: '2026-06-21', time: '06:00' }, 'Europe/Paris')).toISOString()).toBe(
      '2026-06-21T04:00:00.000Z', // CEST
    );
    expect(new Date(startInstantUtc({ date: '2026-01-10', time: '06:00' }, 'Europe/Paris')).toISOString()).toBe(
      '2026-01-10T05:00:00.000Z', // CET
    );
    expect(new Date(startInstantUtc({ date: '2026-07-04', time: '22:00' }, 'America/New_York')).toISOString()).toBe(
      '2026-07-05T02:00:00.000Z',
    );
    expect(new Date(startInstantUtc({ date: '2026-07-04', time: '22:00' }, 'UTC')).toISOString()).toBe(
      '2026-07-04T22:00:00.000Z',
    );
  });

  it('lists and validates zones', () => {
    expect(availableTimeZones('Europe/Paris')).toContain('Europe/Paris');
    expect(availableTimeZones('Europe/Paris')).toContain('UTC');
    expect(availableTimeZones('Etc/Unknown-Test')).toContain('Etc/Unknown-Test');
    expect(isValidTimeZone('Europe/Berlin')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
