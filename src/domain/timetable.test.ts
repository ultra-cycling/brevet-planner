import { describe, expect, it } from 'vitest';
import { checkpointReducer, controlRows, initialCheckpointState, type CheckpointState } from './checkpoints';
import { acpControlRules } from './controls/acp';
import { buildSegments } from './segments';
import { speedClimbEstimator } from './time/SpeedClimbEstimator';
import { buildTimetable } from './timetable';
import { positionAtDistance } from './track/snap';
import { buildTrack } from './track/track';

const DEG_PER_KM = 0.008993;
// 200 km north, flat for 100 km, then climbing 7 m/km for 100 km (700 m)
const track = buildTrack(
  'Flat then hilly',
  Array.from({ length: 201 }, (_, i) => ({ lat: 45 + i * DEG_PER_KM, lon: 7, ele: i <= 100 ? 100 : 100 + (i - 100) * 7 })),
);

function plan(...controls: { km: number; rest?: number }[]): CheckpointState {
  return controls.reduce(
    (state, { km, rest = 0 }, i) =>
      checkpointReducer(state, {
        type: 'add',
        id: `cp${i}`,
        position: positionAtDistance(track, km),
        source: 'km',
        restMin: rest,
      }),
    initialCheckpointState(track, 200),
  );
}

const timetable = (state: CheckpointState, params = { speedKmh: 25, climbRateMh: 700 }) =>
  buildTimetable(
    controlRows(state, acpControlRules),
    buildSegments(track, state.checkpoints),
    speedClimbEstimator,
    params,
  );

const round = (v: number | null) => (v === null ? null : Math.round(v));

describe('buildTimetable', () => {
  it('rides each segment, rests at each control and arrives at the finish', () => {
    const { rows, totals } = timetable(plan({ km: 100, rest: 30 }));
    expect(rows.map((r) => [r.control.checkpoint.id, round(r.rideMin), round(r.arrivalMin), r.restMin, round(r.departureMin)])).toEqual([
      ['start', null, 0, 0, 0],
      ['cp0', 240, 240, 30, 270], // 100 km at 25 km/h
      ['finish', 300, 570, 0, null], // 100 km at 25 km/h + 700 m at 700 m/h
    ]);
    expect(round(totals.rideMin)).toBe(540);
    expect(round(totals.stopMin)).toBe(30);
    expect(round(totals.finishMin)).toBe(570);
    expect(totals.movingKmh).toBeCloseTo(200 / 9, 1);
    expect(totals.overallKmh).toBeCloseTo(200 / 9.5, 1);
  });

  it('computes the buffer to the closing time and finds the tightest control', () => {
    const { rows, totals } = timetable(plan({ km: 100, rest: 30 }));
    // cp0 closes at 100 km / 15 km/h = 6:40, finish at 13:30
    expect(rows.map((r) => round(r.bufferMin))).toEqual([null, 160, 240]);
    expect(totals.tightest?.control.checkpoint.id).toBe('cp0');
  });

  it('a negative buffer means arriving after the control closed', () => {
    const { rows } = timetable(plan({ km: 100 }), { speedKmh: 12, climbRateMh: 700 });
    expect(round(rows[1].bufferMin)).toBe(400 - 500);
  });

  it('waits at a control that has not opened yet – the rest is spent while waiting', () => {
    // 20 km at 40 km/h → arrival 0:30; the control opens at 20/34 h = 0:35
    const early = timetable(plan({ km: 20, rest: 0 }), { speedKmh: 40, climbRateMh: 700 }).rows[1];
    expect(round(early.arrivalMin)).toBe(30);
    expect(round(early.waitMin)).toBe(5);
    expect(round(early.departureMin)).toBe(35);

    const resting = timetable(plan({ km: 20, rest: 15 }), { speedKmh: 40, climbRateMh: 700 }).rows[1];
    expect(round(resting.waitMin)).toBe(0);
    expect(round(resting.departureMin)).toBe(45);
  });

  it('uses per-segment parameters over the plan defaults', () => {
    let state = plan({ km: 100 });
    state = checkpointReducer(state, { type: 'setSegmentParam', id: 'finish', key: 'climbRateMh', value: 350 });
    const { rows } = timetable(state);
    expect(rows[1].params).toEqual({ speedKmh: 25, climbRateMh: 700 });
    expect(rows[2].params).toEqual({ speedKmh: 25, climbRateMh: 350 });
    expect(round(rows[2].rideMin)).toBe(240 + 120);

    state = checkpointReducer(state, { type: 'setSegmentParam', id: 'finish', key: 'climbRateMh', value: null });
    expect(round(timetable(state).rows[2].rideMin)).toBe(300);
  });

  it('ignores rest and segment parameters where they make no sense', () => {
    let state = plan();
    state = checkpointReducer(state, { type: 'setRest', id: 'finish', restMin: 60 });
    state = checkpointReducer(state, { type: 'setSegmentParam', id: 'start', key: 'speedKmh', value: 10 });
    expect(state.checkpoints.map((cp) => [cp.restMin, cp.segmentParams])).toEqual([
      [0, {}],
      [0, {}],
    ]);
  });
});
