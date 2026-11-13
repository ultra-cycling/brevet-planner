import { describe, expect, it } from 'vitest';
import {
  checkpointReducer,
  controlRows,
  importWaypoints,
  initialCheckpointState,
  type CheckpointState,
} from './checkpoints';
import { acpControlRules } from './controls/acp';
import { positionAtDistance } from './track/snap';
import { buildTrack } from './track/track';

const DEG_PER_KM = 0.008993;
// 210 km straight north
const track = buildTrack(
  'Line',
  Array.from({ length: 211 }, (_, i) => ({ lat: 45 + i * DEG_PER_KM, lon: 7, ele: null })),
  [
    { name: 'Café', lat: 45 + 50 * DEG_PER_KM, lon: 7.001 },
    { name: 'Far away', lat: 45 + 80 * DEG_PER_KM, lon: 7.1 },
    { name: 'Start bakery', lat: 45, lon: 7 },
  ],
);

const at = (km: number) => positionAtDistance(track, km);

function withControls(...kms: number[]): CheckpointState {
  return kms.reduce(
    (state, km, i) => checkpointReducer(state, { type: 'add', id: `cp${i}`, position: at(km), source: 'km' }),
    initialCheckpointState(track, 200),
  );
}

describe('checkpoint state', () => {
  it('always contains start and finish', () => {
    const state = initialCheckpointState(track, 200);
    expect(state.checkpoints.map((cp) => [cp.kind, Math.round(cp.distanceKm)])).toEqual([
      ['start', 0],
      ['finish', 210],
    ]);
  });

  it('keeps checkpoints ordered by distance', () => {
    const state = withControls(120, 40, 80);
    expect(state.checkpoints.map((cp) => cp.id)).toEqual(['start', 'cp1', 'cp2', 'cp0', 'finish']);
  });

  it('moves, renames and removes intermediate controls', () => {
    let state = withControls(40, 80);
    state = checkpointReducer(state, { type: 'move', id: 'cp0', position: at(100) });
    state = checkpointReducer(state, { type: 'rename', id: 'cp1', name: 'Bakery' });
    expect(state.checkpoints.map((cp) => cp.name || cp.id)).toEqual(['start', 'Bakery', 'cp0', 'finish']);

    state = checkpointReducer(state, { type: 'remove', id: 'cp0' });
    expect(state.checkpoints.map((cp) => cp.id)).toEqual(['start', 'cp1', 'finish']);
  });

  it('never moves or removes start and finish', () => {
    let state = withControls();
    state = checkpointReducer(state, { type: 'move', id: 'finish', position: at(50) });
    state = checkpointReducer(state, { type: 'remove', id: 'start' });
    expect(state.checkpoints.map((cp) => [cp.id, Math.round(cp.distanceKm)])).toEqual([
      ['start', 0],
      ['finish', 210],
    ]);
  });
});

describe('control rows', () => {
  it('numbers intermediate controls and computes ACP windows', () => {
    const rows = controlRows(withControls(120, 60), acpControlRules);
    expect(rows.map((r) => r.number)).toEqual([null, 1, 2, null]);
    expect(rows.map((r) => [r.window.openMin, r.window.closeMin])).toEqual([
      [0, 60],
      [106, 240],
      [212, 480],
      [353, 810], // finish of the 200 km brevet (track is 210 km)
    ]);
  });

  it('applies overrides and flags windows that close before they open', () => {
    let state = withControls(60);
    state = checkpointReducer(state, { type: 'setWindow', id: 'cp0', closeOverrideMin: 300 });
    let row = controlRows(state, acpControlRules)[1];
    expect(row.window).toEqual({ openMin: 106, closeMin: 300 });
    expect(row.ruleWindow.closeMin).toBe(240);

    state = checkpointReducer(state, { type: 'setWindow', id: 'cp0', openOverrideMin: 400 });
    row = controlRows(state, acpControlRules)[1];
    expect(row.invalid).toBe(true);

    state = checkpointReducer(state, { type: 'setWindow', id: 'cp0', openOverrideMin: null, closeOverrideMin: null });
    expect(controlRows(state, acpControlRules)[1].window).toEqual({ openMin: 106, closeMin: 240 });
  });

  it('recomputes windows when the brevet distance changes', () => {
    const state = checkpointReducer(withControls(), { type: 'setBrevetKm', brevetKm: null });
    expect(controlRows(state, acpControlRules)[1].window.closeMin).toBe(840); // 210 km at 15 km/h
  });
});

describe('importWaypoints', () => {
  it('snaps waypoints near the track and reports the others', () => {
    const result = importWaypoints(track, initialCheckpointState(track, 200).checkpoints);
    expect(result.items.map((i) => [i.name, Math.round(i.position.distanceKm)])).toEqual([['Café', 50]]);
    expect(result.tooFar).toEqual(['Far away']);
    expect(result.duplicates).toBe(1); // "Start bakery" sits on the start control
  });

  it('does not import a waypoint twice', () => {
    const first = importWaypoints(track, []);
    const state = checkpointReducer(initialCheckpointState(track, 200), {
      type: 'addMany',
      items: first.items.map((item, i) => ({ ...item, id: `w${i}`, source: 'waypoint' })),
    });
    expect(importWaypoints(track, state.checkpoints).items).toEqual([]);
  });
});
