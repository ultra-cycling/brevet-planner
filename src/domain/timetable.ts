import type { ControlRow } from './checkpoints';
import type { Segment } from './segments';
import { resolveParams, type EstimatorParams, type TimeEstimator } from './time/TimeEstimator';

/** One control in the timetable. All times are minutes after the start (fractional, round for display). */
export interface TimetableRow {
  control: ControlRow;
  /** Segment that ends at this control; `null` for the start */
  segment: Segment | null;
  /** Parameters used for that segment: plan defaults with the segment's overrides */
  params: EstimatorParams | null;
  /** Riding time of the segment; `null` for the start */
  rideMin: number | null;
  arrivalMin: number;
  restMin: number;
  /** Extra waiting because the rider would be ready to leave before the control opens */
  waitMin: number;
  /** `null` for the finish */
  departureMin: number | null;
  /** Time left at arrival until the control closes; negative = too late. `null` for the start */
  bufferMin: number | null;
}

export interface TimetableTotals {
  rideMin: number;
  /** Rest plus waiting time */
  stopMin: number;
  finishMin: number;
  /** Average speed while riding */
  movingKmh: number;
  /** Average speed including stops (what counts for the time limit) */
  overallKmh: number;
  /** Row with the smallest buffer (start excluded); `null` if there is none */
  tightest: TimetableRow | null;
}

export interface Timetable {
  rows: TimetableRow[];
  totals: TimetableTotals;
}

/**
 * Builds the timetable: ride each segment with the estimated time, rest at each control, and wait if the control
 * hasn't opened yet. The rest is spent while waiting, i.e. the rider leaves at `max(arrival + rest, opening)` –
 * controls can't be left before they open, because the stamp/receipt proves the passage.
 *
 * @param rows controls ordered along the track, `segments[i]` must end at `rows[i + 1]`
 */
export function buildTimetable(
  rows: readonly ControlRow[],
  segments: readonly Segment[],
  estimator: TimeEstimator,
  planParams: Partial<EstimatorParams>,
): Timetable {
  const result: TimetableRow[] = [];
  let clock = 0; // departure of the previous control
  let rideTotal = 0;

  rows.forEach((control, i) => {
    const cp = control.checkpoint;
    const segment = i > 0 ? segments[i - 1] : null;
    if (segment && segment.to.id !== cp.id) throw new Error(`Segment ${segment.index} does not end at ${cp.id}`);

    const params = segment ? resolveParams(estimator, { ...planParams, ...cp.segmentParams }) : null;
    const rideMin = segment ? estimator.estimateMinutes(segment, params!) : null;
    const arrivalMin = clock + (rideMin ?? 0);
    rideTotal += rideMin ?? 0;

    const isFinish = cp.kind === 'finish';
    const restMin = cp.kind === 'control' ? cp.restMin : 0;
    const departureMin = isFinish ? null : Math.max(arrivalMin + restMin, control.window.openMin);
    const waitMin = departureMin === null ? 0 : departureMin - arrivalMin - restMin;

    result.push({
      control,
      segment,
      params,
      rideMin,
      arrivalMin,
      restMin,
      waitMin,
      departureMin,
      bufferMin: cp.kind === 'start' ? null : control.window.closeMin - arrivalMin,
    });
    if (departureMin !== null) clock = departureMin;
  });

  const finishMin = result.at(-1)?.arrivalMin ?? 0;
  const distanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const tightest = result
    .filter((r) => r.bufferMin !== null)
    .reduce<TimetableRow | null>((min, r) => (min === null || r.bufferMin! < min.bufferMin! ? r : min), null);

  return {
    rows: result,
    totals: {
      rideMin: rideTotal,
      stopMin: finishMin - rideTotal,
      finishMin,
      movingKmh: rideTotal > 0 ? distanceKm / (rideTotal / 60) : 0,
      overallKmh: finishMin > 0 ? distanceKm / (finishMin / 60) : 0,
      tightest,
    },
  };
}
