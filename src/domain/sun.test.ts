import { describe, expect, it } from 'vitest';
import { daylightAt, sunAltitudeDeg } from './sun';

const PARIS = { lat: 48.8566, lon: 2.3522 };
const at = (iso: string) => Date.parse(iso);

describe('sun position', () => {
  it('matches sunrise and sunset in Paris at midsummer (05:47 and 21:58 CEST)', () => {
    expect(sunAltitudeDeg(at('2026-06-21T03:47Z'), PARIS.lat, PARIS.lon)).toBeCloseTo(-0.83, 0);
    expect(sunAltitudeDeg(at('2026-06-21T19:58Z'), PARIS.lat, PARIS.lon)).toBeCloseTo(-0.83, 0);
  });

  it('reaches 90° − latitude + 23.44° at solar noon at midsummer', () => {
    expect(sunAltitudeDeg(at('2026-06-21T11:52Z'), PARIS.lat, PARIS.lon)).toBeCloseTo(90 - PARIS.lat + 23.44, 0);
  });

  it('tells day, civil twilight and night apart', () => {
    expect(daylightAt(at('2026-06-21T12:00Z'), PARIS.lat, PARIS.lon)).toBe('day');
    expect(daylightAt(at('2026-06-21T03:30Z'), PARIS.lat, PARIS.lon)).toBe('twilight'); // dawn
    expect(daylightAt(at('2026-06-21T20:20Z'), PARIS.lat, PARIS.lon)).toBe('twilight'); // dusk
    expect(daylightAt(at('2026-06-22T00:00Z'), PARIS.lat, PARIS.lon)).toBe('night');
    expect(daylightAt(at('2026-12-21T16:30Z'), PARIS.lat, PARIS.lon)).toBe('twilight'); // sunset 16:56 CET
    expect(daylightAt(at('2026-12-21T17:30Z'), PARIS.lat, PARIS.lon)).toBe('night');
  });
});
