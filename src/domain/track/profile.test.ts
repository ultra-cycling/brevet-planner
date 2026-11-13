import { describe, expect, it } from 'vitest';
import { elevationAxis, niceStep, profileAreaPath, sampleProfile, ticks } from './profile';
import { buildTrack } from './track';

const longTrack = buildTrack(
  'long',
  Array.from({ length: 5000 }, (_, i) => ({
    lat: 48 + i * 0.001,
    lon: 11,
    ele: i === 2345 ? 1500 : 500 + (i % 10), // one sharp peak
  })),
);

describe('sampleProfile', () => {
  it('keeps short tracks unchanged', () => {
    const short = buildTrack('s', [
      { lat: 48, lon: 11, ele: 1 },
      { lat: 48.1, lon: 11, ele: null },
      { lat: 48.2, lon: 11, ele: 3 },
    ]);
    expect(sampleProfile(short).map((s) => s.ele)).toEqual([1, 3]);
  });

  it('limits the number of samples and keeps peaks, start and end', () => {
    const samples = sampleProfile(longTrack, 1000);
    expect(samples.length).toBeLessThanOrEqual(1001);
    expect(Math.max(...samples.map((s) => s.ele))).toBe(1500);
    expect(samples[0].distanceKm).toBe(0);
    expect(samples.at(-1)!.distanceKm).toBe(longTrack.distanceKm);
  });

  it('returns samples in ascending distance', () => {
    const samples = sampleProfile(longTrack, 500);
    expect(samples.every((s, i) => i === 0 || s.distanceKm > samples[i - 1].distanceKm)).toBe(true);
  });
});

describe('axis ticks', () => {
  it.each([
    [300, 50],
    [100, 20],
    [1200, 200],
    [42, 10],
    [0, 1],
  ])('niceStep(%d) = %d', (span, step) => {
    expect(niceStep(span)).toBe(step);
  });

  it('creates ticks from 0 without crowding the end', () => {
    expect(ticks(300)).toEqual([0, 50, 100, 150, 200, 250]); // 300 is the end label itself
    expect(ticks(320)).toEqual([0, 100, 200]); // 300 would collide with the "320 km" end label
    expect(ticks(340)).toEqual([0, 100, 200, 300]);
  });
});

describe('elevationAxis', () => {
  it('rounds the data range outwards to nice values', () => {
    expect(elevationAxis(362, 838)).toEqual({ min: 200, max: 1000 });
    expect(elevationAxis(12, 47)).toEqual({ min: 0, max: 60 });
  });

  it('never returns an empty range', () => {
    expect(elevationAxis(500, 500)).toEqual({ min: 500, max: 510 });
    expect(elevationAxis(500, 503)).toEqual({ min: 500, max: 510 });
  });
});

describe('profileAreaPath', () => {
  it('maps samples into the box and closes the area at the bottom', () => {
    const { line, area } = profileAreaPath(
      [
        { distanceKm: 0, ele: 100 },
        { distanceKm: 50, ele: 200 },
        { distanceKm: 100, ele: 100 },
      ],
      100,
      100,
      200,
      1000,
      100,
    );
    expect(line).toBe('M0.0,100.0L500.0,0.0L1000.0,100.0');
    expect(area).toBe(`${line}L1000.0,100L0.0,100Z`);
  });

  it('handles empty input', () => {
    expect(profileAreaPath([], 0, 0, 0, 10, 10)).toEqual({ area: '', line: '' });
  });
});
