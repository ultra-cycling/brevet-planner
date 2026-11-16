import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePlanFile, planStateFromFile } from '../planFile';
import { createDefaultEstimatorRegistry } from '../time/registry';
import { parseGpx } from './gpx';

/**
 * The 300 km sample route in the plans folder (US5) – also the reference track for the climb calculation (US12):
 * a Komoot export with elevations from a terrain model; Komoot reports about 1 400 m of climb.
 */
const gpx = readFileSync('public/plans/300km-sample-route.gpx', 'utf8');
const track = parseGpx(gpx);

describe('300 km sample route', () => {
  it('is read completely', () => {
    expect(track.name).toBe('G - Bodensee - G');
    expect(track.points).toHaveLength(7079);
    expect(track.distanceKm).toBeCloseTo(309.3, 0);
    expect(track.waypoints).toHaveLength(20);
  });

  it('opens with its plan file from the plans folder', () => {
    const file = parsePlanFile(readFileSync('public/plans/300km-sample-route.plan.json', 'utf8'));
    const plan = planStateFromFile(file, track, '300km-sample-route', createDefaultEstimatorRegistry());
    expect(plan.checkpoints.checkpoints.map((cp) => cp.kind)).toEqual(['start', 'control', 'control', 'finish']);
    expect(file.summary.distanceKm).toBeCloseTo(track.distanceKm, 0);
  });

  // US12 baseline: the 5 m hysteresis drops most small climbs of the smooth terrain-model elevations
  it('has a climb of about 730 m with the current calculation (US12 baseline)', () => {
    expect(track.climbM).toBeCloseTo(727, -1);
  });

  it.fails('has a climb within ±10 % of Komoot (1 400 m) – fixed by US12', () => {
    expect(Math.abs(track.climbM - 1400) / 1400).toBeLessThanOrEqual(0.1);
  });
});
