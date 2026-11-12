import { describe, expect, it } from 'vitest';
import { createDefaultEstimatorRegistry, EstimatorRegistry } from './registry';
import type { TimeEstimator } from './TimeEstimator';

const constant: TimeEstimator = {
  id: 'constant',
  labelKey: 'x',
  params: [],
  estimateMinutes: () => 42,
};

describe('EstimatorRegistry', () => {
  it('contains the speed-climb model by default', () => {
    expect(createDefaultEstimatorRegistry().ids()).toEqual(['speed-climb']);
  });

  it('allows registering additional models', () => {
    const registry = createDefaultEstimatorRegistry();
    registry.register(constant);
    expect(registry.get('constant').estimateMinutes({ distanceKm: 1, climbM: 0 }, {})).toBe(42);
  });

  it('rejects duplicate ids and unknown lookups', () => {
    const registry = new EstimatorRegistry([constant]);
    expect(() => registry.register(constant)).toThrow(/already registered/);
    expect(() => registry.get('nope')).toThrow(/Unknown time model "nope"/);
  });
});
