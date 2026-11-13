import { describe, expect, it } from 'vitest';
import { checkpointReducer, controlRows, initialCheckpointState } from './checkpoints';
import { acpControlRules } from './controls/acp';
import { buildSegments } from './segments';
import { speedClimbEstimator } from './time/SpeedClimbEstimator';
import { minutesAlongTrack, timesAlongTrack, timesAt } from './timeAlongTrack';
import { buildTimetable } from './timetable';
import { positionAtDistance } from './track/snap';
import { buildTrack } from './track/track';

const DEG_PER_KM = 0.008993;
// 200 km north, flat for 100 km, then climbing 7 m/km for 100 km (700 m)
const track = buildTrack(
  'Flat then hilly',
  Array.from({ length: 201 }, (_, i) => ({ lat: 45 + i * DEG_PER_KM, lon: 7, ele: i <= 100 ? 100 : 100 + (i - 100) * 7 })),
);

function timetableFor(withControl: boolean) {
  let state = initialCheckpointState(track, 200);
  if (withControl) {
    state = checkpointReducer(state, {
      type: 'add',
      id: 'cp',
      position: positionAtDistance(track, 100),
      source: 'km',
      restMin: 30,
    });
  }
  const timetable = buildTimetable(
    controlRows(state, acpControlRules),
    buildSegments(track, state.checkpoints),
    speedClimbEstimator,
    { speedKmh: 25, climbRateMh: 700 },
  );
  return timetable;
}

const minutes = (withControl: boolean) => minutesAlongTrack(track, timetableFor(withControl), speedClimbEstimator);

const near = (value: number, expected: number) => expect(value).toBeCloseTo(expected, 0);

describe('minutesAlongTrack', () => {
  it('extrapolates the time at every point from the timetable, including rests', () => {
    const m = minutes(true);
    near(m[0], 0);
    near(m[50], 120); // 50 km at 25 km/h
    near(m[100], 240); // arrival at the control
    near(m[101], 270 + 2.4 + 0.6); // left after 30 min rest: 1 km + 7 m climb
    near(m[200], 570); // finish, as in the timetable
  });

  it('grows along the track', () => {
    const m = minutes(false);
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThanOrEqual(m[i - 1]);
    near(m[200], 540);
  });
});

describe('timesAlongTrack (US8)', () => {
  const times = timesAlongTrack(track, timetableFor(true), speedClimbEstimator);

  it('separates the riding time from the rests', () => {
    near(times.rideMin[50], 120);
    near(times.rideMin[101], 240 + 3); // the 30 min rest at km 100 is not riding time
    near(times.atMin[101], 273);
    near(times.rideMin[200], 540);
  });

  it('interpolates between track points', () => {
    const at = timesAt(track, times, 50.5);
    near(at.atMin, 121.2); // 50.5 km at 25 km/h
    near(at.rideMin, 121.2);
    near(timesAt(track, times, -1).atMin, 0);
    near(timesAt(track, times, 999).atMin, 570);
  });
});
