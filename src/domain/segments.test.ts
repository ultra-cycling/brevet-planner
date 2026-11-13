import { describe, expect, it } from 'vitest';
import { checkpointReducer, initialCheckpointState } from './checkpoints';
import { buildSegments, climbBetween } from './segments';
import { cumulativeAscentDescent } from './track/geo';
import { positionAtDistance } from './track/snap';
import { buildTrack } from './track/track';

const DEG_PER_KM = 0.008993;
// 100 km north: up 10 m/km for 40 km, flat for 20 km, down 5 m/km for 40 km
const ele = (km: number) => (km <= 40 ? 200 + km * 10 : km <= 60 ? 600 : 600 - (km - 60) * 5);
const track = buildTrack(
  'Hill',
  Array.from({ length: 101 }, (_, i) => ({ lat: 45 + i * DEG_PER_KM, lon: 7, ele: ele(i) })),
);

function withControls(...kms: number[]) {
  return kms.reduce(
    (state, km, i) =>
      checkpointReducer(state, { type: 'add', id: `cp${i}`, position: positionAtDistance(track, km), source: 'km' }),
    initialCheckpointState(track, null),
  ).checkpoints;
}

describe('cumulativeAscentDescent', () => {
  it('accumulates climb and descent with hysteresis', () => {
    expect(cumulativeAscentDescent([100, 103, 110, 104, null, 90])).toEqual({
      ascentM: [0, 0, 10, 10, 10, 10],
      descentM: [0, 0, 0, 6, 6, 20],
    });
  });
});

describe('segments', () => {
  it('without intermediate controls the whole track is one segment', () => {
    const [segment] = buildSegments(track, withControls());
    expect(segment.from.kind).toBe('start');
    expect(segment.to.kind).toBe('finish');
    expect(segment.distanceKm).toBeCloseTo(track.distanceKm, 9);
    expect(segment.climbM).toBe(track.climbM);
    expect(segment.descentM).toBe(track.descentM);
  });

  it('splits the track at the controls', () => {
    const segments = buildSegments(track, withControls(60, 40));
    expect(segments.map((s) => [s.from.id, s.to.id])).toEqual([
      ['start', 'cp1'],
      ['cp1', 'cp0'],
      ['cp0', 'finish'],
    ]);
    expect(segments.map((s) => Math.round(s.distanceKm))).toEqual([40, 20, 40]);
    expect(segments.map((s) => [Math.round(s.climbM), Math.round(s.descentM)])).toEqual([
      [400, 0],
      [0, 0],
      [0, 200],
    ]);
    expect(segments[0].climbPerKm).toBeCloseTo(10, 0);
  });

  it('segments add up to the track totals', () => {
    const segments = buildSegments(track, withControls(13.7, 37.2, 55.5, 81.9));
    const sum = (key: 'distanceKm' | 'climbM' | 'descentM') => segments.reduce((total, s) => total + s[key], 0);
    expect(sum('distanceKm')).toBeCloseTo(track.distanceKm, 9);
    expect(sum('climbM')).toBe(track.climbM);
    expect(sum('descentM')).toBe(track.descentM);
  });

  it('measures climb between any two distances', () => {
    expect(climbBetween(track, 10, 30).climbM).toBe(200);
    expect(climbBetween(track, 70, 90)).toEqual({ climbM: 0, descentM: 100 });
  });
});
