import { toPlanFile, type PlanFile } from '../domain/planFile';
import { newPlanState, planReducer } from '../domain/planState';
import { positionAtDistance } from '../domain/track/snap';
import { parseGpx } from '../domain/track/gpx';

const DEG_PER_KM = 0.008993;

/** GPX of a straight line north: `km` kilometres, one point per km, climbing 1 m per km */
export function lineGpx(name: string, km = 210): string {
  const points = Array.from(
    { length: km + 1 },
    (_, i) => `<trkpt lat="${(45 + i * DEG_PER_KM).toFixed(6)}" lon="7"><ele>${300 + i}</ele></trkpt>`,
  ).join('');
  return `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>${points}</trkseg></trk></gpx>`;
}

/** A plan file for a GPX with one checkpoint at `checkpointKm` (named "Café", 20 min rest) */
export function planFileFor(gpx: string, trackFile: string, options: { name?: string; checkpointKm?: number; date?: string } = {}): PlanFile {
  const track = parseGpx(gpx);
  let state = newPlanState(track, trackFile, {
    start: { date: options.date ?? '2027-05-01', time: '06:00' },
    timeZone: 'Europe/Berlin',
    tightBufferMin: 75,
    timeModel: { id: 'speed-climb', params: { speedKmh: 28, climbRateMh: 700 } },
    brevetKm: 200,
  });
  if (options.name) state = planReducer(state, { type: 'rename', name: options.name });
  state = planReducer(state, {
    type: 'checkpoints',
    action: {
      type: 'add',
      id: 'cp-cafe',
      position: positionAtDistance(track, options.checkpointKm ?? 80),
      name: 'Café',
      source: 'km',
      restMin: 20,
    },
  });
  return toPlanFile(state, new Date('2026-11-16T12:00:00Z'));
}

/** Files of a plans folder: one plan with its track and one track without plan */
export function samplePlanFiles(): Record<string, string> {
  const gpx = lineGpx('Line 200');
  return {
    'line-200.gpx': gpx,
    'line-200.plan.json': JSON.stringify(planFileFor(gpx, 'line-200.gpx', { name: 'Line 200 – spring' })),
    'unplanned.gpx': lineGpx('Unplanned route', 50),
  };
}
