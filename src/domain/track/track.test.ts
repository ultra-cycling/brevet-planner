import { describe, expect, it } from 'vitest';
import { buildTrack, nearestPointIndex } from './track';

const raw = [
  { lat: 48.0, lon: 11.0, ele: 500 },
  { lat: 48.1, lon: 11.0, ele: 560 },
  { lat: 48.1, lon: 11.2, ele: 520 },
  { lat: 48.0, lon: 11.2, ele: null },
];

describe('buildTrack', () => {
  const track = buildTrack('Test', raw);

  it('computes cumulative distances', () => {
    expect(track.points[0].distanceKm).toBe(0);
    expect(track.points[1].distanceKm).toBeCloseTo(11.12, 2);
    expect(track.points.at(-1)!.distanceKm).toBe(track.distanceKm);
    expect(track.distanceKm).toBeCloseTo(11.12 + 14.87 + 11.12, 0);
  });

  it('computes climb, descent and elevation range', () => {
    expect(track.climbM).toBe(60);
    expect(track.descentM).toBe(40);
    expect(track.minEleM).toBe(500);
    expect(track.maxEleM).toBe(560);
  });

  it('computes the bounding box', () => {
    expect(track.bounds).toEqual([
      [48.0, 11.0],
      [48.1, 11.2],
    ]);
  });

  it('reports missing elevation data', () => {
    const flat = buildTrack('No ele', raw.map((p) => ({ ...p, ele: null })));
    expect(flat.minEleM).toBeNull();
    expect(flat.climbM).toBe(0);
  });

  it('needs at least two points', () => {
    expect(() => buildTrack('x', [raw[0]])).toThrow(RangeError);
  });
});

describe('nearestPointIndex', () => {
  const { points } = buildTrack('Test', raw);

  it.each([
    [-5, 0],
    [0, 0],
    [5, 0],
    [6, 1],
    [11.12, 1],
    [1000, 3],
  ])('km %d → index %d', (km, index) => {
    expect(nearestPointIndex(points, km)).toBe(index);
  });
});
