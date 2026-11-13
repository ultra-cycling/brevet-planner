import { describe, expect, it } from 'vitest';
import { ascentDescent, haversineKm } from './geo';

describe('haversineKm', () => {
  it('is 0 for identical points', () => {
    expect(haversineKm(48.1, 11.5, 48.1, 11.5)).toBe(0);
  });

  it('measures one degree of latitude as ~111.2 km', () => {
    expect(haversineKm(48, 11, 49, 11)).toBeCloseTo(111.2, 1);
  });

  it('matches a known city distance (Paris – Brest ≈ 505 km great-circle)', () => {
    expect(haversineKm(48.8566, 2.3522, 48.3904, -4.4861)).toBeCloseTo(505, -1);
  });
});

describe('ascentDescent', () => {
  it('sums climbs and descents', () => {
    expect(ascentDescent([100, 150, 120, 200])).toEqual({ ascentM: 130, descentM: 30 });
  });

  it('ignores noise below the threshold', () => {
    // oscillating ±2 m around 100 m would add 40 m of fake climb without hysteresis
    const noisy = [100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100];
    expect(ascentDescent(noisy, 5)).toEqual({ ascentM: 0, descentM: 0 });
  });

  it('accumulates slow climbs made of small steps', () => {
    const steady = Array.from({ length: 101 }, (_, i) => 100 + i); // +1 m per point
    expect(ascentDescent(steady, 5).ascentM).toBe(100);
  });

  it('skips points without elevation', () => {
    expect(ascentDescent([null, 100, null, 160, null])).toEqual({ ascentM: 60, descentM: 0 });
    expect(ascentDescent([null, null])).toEqual({ ascentM: 0, descentM: 0 });
  });
});
