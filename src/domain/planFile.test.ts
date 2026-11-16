import { describe, expect, it } from 'vitest';
import { controlRows } from './checkpoints';
import { acpControlRules } from './controls/acp';
import {
  parsePlanFile,
  planFileId,
  planFingerprint,
  planStateFromFile,
  PlanFileError,
  PLAN_FILE_VERSION,
  toPlanFile,
} from './planFile';
import { newPlanState, planReducer, type PlanAction, type PlanState } from './planState';
import { createDefaultEstimatorRegistry } from './time/registry';
import { positionAtDistance } from './track/snap';
import { buildTrack } from './track/track';

const DEG_PER_KM = 0.008993;
// 210 km straight north, climbing 1 m per km
const track = buildTrack(
  'Line 200',
  Array.from({ length: 211 }, (_, i) => ({ lat: 45 + i * DEG_PER_KM, lon: 7, ele: 300 + i })),
);
const estimators = createDefaultEstimatorRegistry();
const defaults = {
  start: { date: '2027-05-01', time: '06:00' },
  timeZone: 'Europe/Berlin',
  tightBufferMin: 75,
  timeModel: { id: 'speed-climb', params: { speedKmh: 28, climbRateMh: 700 } },
  brevetKm: 200,
};

/** A plan with every kind of planning decision */
function plannedState(): PlanState {
  const actions: PlanAction[] = [
    { type: 'rename', name: 'Line 200 – spring' },
    { type: 'checkpoints', action: { type: 'add', id: 'cp-a', position: positionAtDistance(track, 80), name: 'Café', source: 'map', restMin: 20 } },
    { type: 'checkpoints', action: { type: 'add', id: 'cp-b', position: positionAtDistance(track, 150.25), source: 'km', restMin: 15 } },
    { type: 'checkpoints', action: { type: 'setWindow', id: 'cp-a', closeOverrideMin: 330 } },
    { type: 'checkpoints', action: { type: 'setWindow', id: 'finish', openOverrideMin: 400 } },
    { type: 'checkpoints', action: { type: 'setSegmentParam', id: 'cp-b', key: 'speedKmh', value: 22 } },
    { type: 'checkpoints', action: { type: 'setSegmentParam', id: 'finish', key: 'climbRateMh', value: 500 } },
    { type: 'setStart', start: { date: '2027-05-02', time: '21:30' } },
    { type: 'setTimeZone', timeZone: 'Europe/Paris' },
    { type: 'setTightBuffer', minutes: 60 },
    { type: 'setTimeModelParam', key: 'speedKmh', value: 26 },
  ];
  return actions.reduce(planReducer, newPlanState(track, 'line-200.gpx', defaults, new Date('2026-11-16T10:00:00Z')));
}

const roundTrip = (state: PlanState) =>
  planStateFromFile(parsePlanFile(JSON.stringify(toPlanFile(state))), track, 'line-200', estimators);

describe('plan file (US5)', () => {
  it('writes the planning decisions, a summary and the format version', () => {
    const file = toPlanFile(plannedState(), new Date('2026-11-16T12:00:00Z'));
    expect(file).toMatchObject({
      format: 'brevet-planner-plan',
      version: PLAN_FILE_VERSION,
      name: 'Line 200 – spring',
      track: 'line-200.gpx',
      createdAt: '2026-11-16T10:00:00.000Z',
      updatedAt: '2026-11-16T12:00:00.000Z',
      summary: { distanceKm: 210, checkpoints: 2 },
      brevetKm: 200,
      start: { date: '2027-05-02', time: '21:30' },
      timeZone: 'Europe/Paris',
      tightBufferMin: 60,
      timeModel: { id: 'speed-climb', params: { speedKmh: 26, climbRateMh: 700 } },
    });
    expect(file.checkpoints.map((cp) => [cp.kind, cp.id, cp.distanceKm])).toEqual([
      ['start', 'start', 0],
      ['control', 'cp-a', 80],
      ['control', 'cp-b', 150.25],
      ['finish', 'finish', expect.closeTo(210, 1)],
    ]);
  });

  it('restores exactly the same plan after saving and opening it', () => {
    const state = plannedState();
    const restored = roundTrip(state);
    expect(planFingerprint(restored)).toBe(planFingerprint(state));
    expect(restored.id).toBe('line-200');

    const rows = controlRows(restored.checkpoints, acpControlRules);
    expect(rows.map((r) => [r.checkpoint.name, r.checkpoint.restMin, r.window.closeMin])).toEqual([
      ['', 0, 60],
      ['Café', 20, 330], // overridden closing time
      ['', 15, acpControlRules.window(150.25, 'control', 200).closeMin],
      ['', 0, 810],
    ]);
    expect(rows[3].window.openMin).toBe(400);
    expect(restored.checkpoints.checkpoints[2].segmentParams).toEqual({ speedKmh: 22 });
    expect(restored.checkpoints.checkpoints[3].segmentParams).toEqual({ climbRateMh: 500 });
    expect(restored.checkpoints.checkpoints[1]).toMatchObject({ lat: expect.closeTo(45 + 80 * DEG_PER_KM, 3), source: 'map' });
  });

  it('detects changes for the unsaved-changes indicator, but not mere re-saving', () => {
    const state = plannedState();
    expect(planFingerprint(roundTrip(state))).toBe(planFingerprint(state));
    expect(planFingerprint(planReducer(state, { type: 'setTightBuffer', minutes: 61 }))).not.toBe(planFingerprint(state));
  });

  it.each([
    ['{not json', 'notJson'],
    ['{"format":"something-else","version":1}', 'notAPlan'],
    ['[]', 'notAPlan'],
  ])('rejects %j (%s)', (text, code) => {
    expect(() => parsePlanFile(text)).toThrow(expect.objectContaining({ code }));
  });

  it('rejects a plan saved by a newer app version with a clear message', () => {
    const file = { ...toPlanFile(plannedState()), version: PLAN_FILE_VERSION + 1 };
    expect(() => parsePlanFile(JSON.stringify(file))).toThrow(
      expect.objectContaining({ code: 'newerVersion', message: expect.stringMatching(/newer version of the app/) }),
    );
  });

  it.each([
    ['start.date', (f: Record<string, unknown>) => ({ ...f, start: { date: '1.5.2027', time: '06:00' } })],
    ['start.time', (f: Record<string, unknown>) => ({ ...f, start: { date: '2027-05-01', time: '25:00' } })],
    ['timeZone', (f: Record<string, unknown>) => ({ ...f, timeZone: 'Mars/Olympus' })],
    ['tightBufferMin', (f: Record<string, unknown>) => ({ ...f, tightBufferMin: -5 })],
    ['checkpoints', (f: Record<string, unknown>) => ({ ...f, checkpoints: 'none' })],
    ['checkpoints[1].distanceKm', (f: Record<string, unknown>) => ({
      ...f,
      checkpoints: (f.checkpoints as object[]).map((cp, i) => (i === 1 ? { ...cp, distanceKm: 'far' } : cp)),
    })],
  ])('names the invalid field %s', (path, change) => {
    const file = change(toPlanFile(plannedState()) as unknown as Record<string, unknown>);
    expect(() => parsePlanFile(JSON.stringify(file))).toThrow(
      expect.objectContaining({ code: 'invalid', message: expect.stringContaining(`"${path}"`) }),
    );
  });

  it('rejects unknown time models and checkpoints outside the track when opening', () => {
    const file = toPlanFile(plannedState());
    expect(() => planStateFromFile({ ...file, timeModel: { id: 'magic', params: {} } }, track, 'x', estimators)).toThrow(
      /timeModel.id/,
    );
    const outside = { ...file, checkpoints: file.checkpoints.map((cp) => (cp.id === 'cp-b' ? { ...cp, distanceKm: 500 } : cp)) };
    expect(() => planStateFromFile(outside, track, 'x', estimators)).toThrow(PlanFileError);
  });

  it('derives file names from plan names', () => {
    expect(planFileId('PBP 2027 – Paris/Brest')).toBe('pbp-2027-paris-brest');
    expect(planFileId('Bodensee – Ü 300')).toBe('bodensee-u-300');
    expect(planFileId('***')).toBe('plan');
  });
});
