import { describe, expect, it } from 'vitest';
import { speedClimbEstimator } from './SpeedClimbEstimator';

describe('speedClimbEstimator', () => {
  it('adds flat riding time and climbing time', () => {
    // 78 km / 28 km/h = 167.14 min, 620 m / 700 m/h = 53.14 min
    const minutes = speedClimbEstimator.estimateMinutes({ distanceKm: 78, climbM: 620 }, { speedKmh: 28, climbRateMh: 700 });
    expect(minutes).toBeCloseTo(220.29, 2);
  });

  it('uses only the speed for a flat segment', () => {
    expect(speedClimbEstimator.estimateMinutes({ distanceKm: 30, climbM: 0 }, { speedKmh: 30, climbRateMh: 700 })).toBe(60);
  });

  it('falls back to default parameters', () => {
    expect(speedClimbEstimator.estimateMinutes({ distanceKm: 28, climbM: 700 }, {})).toBeCloseTo(120);
  });

  it('rejects invalid parameters and negative input', () => {
    expect(() => speedClimbEstimator.estimateMinutes({ distanceKm: 10, climbM: 0 }, { speedKmh: 0 })).toThrow(RangeError);
    expect(() => speedClimbEstimator.estimateMinutes({ distanceKm: -1, climbM: 0 }, {})).toThrow(RangeError);
  });

  it('can be called detached from the object', () => {
    const { estimateMinutes } = speedClimbEstimator;
    expect(estimateMinutes({ distanceKm: 28, climbM: 0 }, {})).toBeCloseTo(60);
  });
});
