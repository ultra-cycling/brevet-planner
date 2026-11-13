import { describe, expect, it } from 'vitest';
import { buildTrack } from '../track/track';
import { daylightOverlay } from './daylightOverlay';
import { gradientOverlay, gradientsPercent } from './gradientOverlay';
import { createDefaultOverlayRegistry, OverlayRegistry } from './registry';
import { distanceByClass, runsFromClasses } from './RouteOverlay';

const DEG_PER_KM = 0.008993;
/** Straight line north with a point every 100 m and the given elevation per km */
const line = (km: number, ele: (km: number) => number | null, lon = 7) =>
  buildTrack(
    'Line',
    Array.from({ length: km * 10 + 1 }, (_, i) => ({ lat: 45 + (i / 10) * DEG_PER_KM, lon, ele: ele(i / 10) })),
  );

describe('runsFromClasses', () => {
  const track = line(10, () => 0);
  // one class per point (101 points): a×5, b×22, c, a×72, b
  const classes = 'a'.repeat(5) + 'b'.repeat(22) + 'c' + 'a'.repeat(72) + 'b';

  it('joins equal neighbours; runs share their boundary point', () => {
    const runs = runsFromClasses(track, (i) => classes[i]);
    expect(runs.map((r) => [r.classKey, r.from, r.to])).toEqual([
      ['a', 0, 5],
      ['b', 5, 27],
      ['c', 27, 28],
      ['a', 28, 100], // the single last point can't be drawn on its own
    ]);
  });

  it('merges runs shorter than the minimum length into their neighbour', () => {
    const runs = runsFromClasses(track, (i) => classes[i], 0.3);
    expect(runs.map((r) => [r.classKey, r.from, r.to])).toEqual([
      ['a', 0, 5],
      ['b', 5, 28],
      ['a', 28, 100],
    ]);
    expect(distanceByClass(track, runs).get('a')).toBeCloseTo(0.5 + 7.2, 1);
  });

  it('merges a short first run into the next one', () => {
    const runs = runsFromClasses(track, (i) => (i < 2 ? 'x' : 'y'), 0.3);
    expect(runs.map((r) => [r.classKey, r.from, r.to])).toEqual([['y', 0, 100]]);
  });
});

describe('road gradient overlay', () => {
  // flat for 10 km, 6 % up for 10 km, 4 % down for 10 km
  const hills = line(30, (km) => (km <= 10 ? 100 : km <= 20 ? 100 + (km - 10) * 60 : 700 - (km - 20) * 40));

  it('measures the gradient in %', () => {
    const g = gradientsPercent(hills)!;
    expect(g[50]).toBeCloseTo(0, 5);
    expect(g[150]).toBeCloseTo(6, 1);
    expect(g[250]).toBeCloseTo(-4, 1);
  });

  it('classifies the route by gradient', () => {
    const runs = gradientOverlay.classify({ track: hills, minutesAt: new Float64Array(), startUtcMs: 0 })!;
    expect(runs.map((r) => r.classKey)).toEqual(['flat', 'steep', 'descent']);
    const km = distanceByClass(hills, runs);
    expect(km.get('flat')).toBeCloseTo(10, 0);
    expect(km.get('steep')).toBeCloseTo(10, 0);
    expect(km.get('descent')).toBeCloseTo(10, 0);
  });

  it('is not available without elevation data', () => {
    expect(gradientOverlay.classify({ track: line(2, () => null), minutesAt: new Float64Array(), startUtcMs: 0 })).toBeNull();
  });
});

describe('daylight overlay', () => {
  it('classifies the route by the expected time and the sun at that place', () => {
    // 30 km along the 0° meridian, riding 15:00–21:00 UTC at the equinox: sunset around 18:00 UTC
    const track = line(30, () => 0, 0);
    const minutesAt = Float64Array.from(track.points, (_, i) => (i / (track.points.length - 1)) * 360);
    const runs = daylightOverlay.classify({ track, minutesAt, startUtcMs: Date.parse('2026-03-20T15:00Z') })!;
    expect(runs.map((r) => r.classKey)).toEqual(['day', 'twilight', 'night']);
    const km = distanceByClass(track, runs);
    expect(km.get('day')).toBeCloseTo(16, 0); // sunset ~18:12 UTC (equation of time, refraction)
    expect(km.get('twilight')).toBeLessThan(2.5); // about 25 min
  });
});

describe('OverlayRegistry', () => {
  it('offers road gradient and daylight', () => {
    expect(createDefaultOverlayRegistry().list().map((o) => o.id)).toEqual(['gradient', 'daylight']);
  });

  it('rejects duplicate ids', () => {
    expect(() => new OverlayRegistry([gradientOverlay, gradientOverlay])).toThrow('already registered');
  });
});
