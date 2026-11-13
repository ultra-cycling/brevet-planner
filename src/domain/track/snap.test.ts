import { describe, expect, it } from 'vitest';
import { positionAtDistance, snapToTrack, trackSlice } from './snap';
import { buildTrack } from './track';

// straight line north, 11 points ≈ 1 km apart
const DEG_PER_KM = 0.008993;
const line = buildTrack(
  'Line',
  Array.from({ length: 11 }, (_, i) => ({ lat: 48 + i * DEG_PER_KM, lon: 11, ele: null })),
);

describe('positionAtDistance', () => {
  it('interpolates between track points', () => {
    const p = positionAtDistance(line, 2.5);
    expect(p.distanceKm).toBe(2.5);
    expect(p.lat).toBeCloseTo(48 + 2.5 * DEG_PER_KM, 5);
    expect(p.lon).toBe(11);
  });

  it('clamps to start and finish', () => {
    expect(positionAtDistance(line, -3)).toMatchObject({ distanceKm: 0, lat: 48 });
    expect(positionAtDistance(line, 99).distanceKm).toBeCloseTo(line.distanceKm, 9);
  });
});

describe('snapToTrack', () => {
  it('projects a coordinate beside the track onto it', () => {
    const p = snapToTrack(line, 48 + 3.4 * DEG_PER_KM, 11.002); // ≈ 150 m east of km 3.4
    expect(p.distanceKm).toBeCloseTo(3.4, 2);
    expect(p.lon).toBe(11);
    expect(p.offTrackKm).toBeCloseTo(0.149, 2);
  });

  it('snaps beyond the ends to start or finish', () => {
    expect(snapToTrack(line, 47.99, 11).distanceKm).toBe(0);
    expect(snapToTrack(line, 48.2, 11).distanceKm).toBeCloseTo(line.distanceKm, 9);
  });

  it('picks the closest pass of an out-and-back track', () => {
    const outAndBack = buildTrack('Out and back', [
      { lat: 48, lon: 11, ele: null },
      { lat: 48 + 10 * DEG_PER_KM, lon: 11, ele: null },
      { lat: 48 + 10 * DEG_PER_KM, lon: 11.01, ele: null },
      { lat: 48, lon: 11.01, ele: null },
    ]);
    const outbound = snapToTrack(outAndBack, 48 + 4 * DEG_PER_KM, 11.001);
    const inbound = snapToTrack(outAndBack, 48 + 4 * DEG_PER_KM, 11.009);
    expect(outbound.distanceKm).toBeCloseTo(4, 1);
    expect(inbound.distanceKm).toBeGreaterThan(15);
  });
});

describe('trackSlice', () => {
  it('returns the coordinates between two distances including interpolated ends', () => {
    const slice = trackSlice(line, 2.5, 4.5);
    expect(slice).toHaveLength(4); // 2.5, 3, 4, 4.5
    expect(slice[0][0]).toBeCloseTo(48 + 2.5 * DEG_PER_KM, 5);
    expect(slice[1][0]).toBeCloseTo(48 + 3 * DEG_PER_KM, 5);
    expect(slice.at(-1)![0]).toBeCloseTo(48 + 4.5 * DEG_PER_KM, 5);
  });
});
