import { describe, expect, it } from 'vitest';
import { formatElapsed } from '../time/duration';
import { acpControlRules as acp } from './acp';

const fmt = (distanceKm: number, brevetKm: number | null, kind: 'start' | 'control' | 'finish' = 'control') => {
  const w = acp.window(distanceKm, kind, brevetKm);
  return `${formatElapsed(w.openMin)}–${formatElapsed(w.closeMin)}`;
};

describe('ACP control rules', () => {
  it('opens the start control at the start and closes it one hour later', () => {
    expect(fmt(0, 200, 'start')).toBe('0:00–1:00');
  });

  // reference values of the ACP/RUSA control time calculator
  it.each([
    [60, 200, '1:46–4:00'], // within 60 km: 20 km/h + 1 h
    [20, 200, '0:35–2:00'],
    [120, 200, '3:32–8:00'],
    [175, 200, '5:09–11:40'],
    [350, 400, '10:34–23:20'],
    [550, 600, '17:08–36:40'],
    [890, 1000, '29:09–65:23'],
    [1100, 1200, '36:56–82:30'],
  ])('control at %i km of a %i km brevet: %s', (km, brevet, expected) => {
    expect(fmt(km, brevet)).toBe(expected);
  });

  it.each([
    [200, '5:53–13:30'],
    [300, '9:00–20:00'],
    [400, '12:08–27:00'],
    [600, '18:48–40:00'],
    [1000, '33:05–75:00'],
    [1200, '40:47–90:00'],
  ])('finish of a %i km brevet: %s', (brevet, expected) => {
    expect(fmt(brevet, brevet, 'finish')).toBe(expected);
  });

  it('computes controls beyond the nominal distance at the nominal distance', () => {
    expect(fmt(209, 200, 'finish')).toBe('5:53–13:30');
    expect(fmt(205, 200)).toBe('5:53–13:20'); // an intermediate control never closes after the time limit
  });

  it('without a nominal distance the finish is computed like any control', () => {
    expect(fmt(100, null, 'finish')).toBe('2:56–6:40');
  });

  it('infers the brevet distance from the track length', () => {
    expect(acp.inferBrevetKm(212)).toBe(200);
    expect(acp.inferBrevetKm(195)).toBe(200); // slightly short GPX
    expect(acp.inferBrevetKm(305)).toBe(300);
    expect(acp.inferBrevetKm(615)).toBe(600);
    expect(acp.inferBrevetKm(1230)).toBe(1200);
    expect(acp.inferBrevetKm(102)).toBeNull();
  });

  it('knows the time limits', () => {
    expect(acp.timeLimitMin(600)).toBe(2400);
    expect(acp.timeLimitMin(250)).toBeNull();
  });
});
