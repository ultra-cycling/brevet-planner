import type { Track } from '../track/track';

/** One category of an overlay, e.g. "steep" – shown in the legend with its colour and label */
export interface OverlayClass {
  key: string;
  /** CSS colour of the route line */
  color: string;
}

/** Consecutive track points of the same class; `to` is shared with the next run's `from` so the line has no gaps. */
export interface OverlayRun {
  classKey: string;
  from: number;
  to: number;
}

/** Everything an overlay may use – computed once per change of the plan */
export interface OverlayContext {
  track: Track;
  /** Expected minutes after the start at every track point (see `minutesAlongTrack`) */
  minutesAt: Float64Array;
  /** Real instant of the start in UTC milliseconds */
  startUtcMs: number;
}

/**
 * Colours the route on the map by some property (US7). Overlays are registered in the `OverlayRegistry`; the map and
 * the legend only use this interface, so a new overlay doesn't need changes to the UI.
 * Labels are i18n keys: `overlays.<id>.name`, `overlays.<id>.classes.<classKey>`.
 */
export interface RouteOverlay {
  readonly id: string;
  /** Classes in legend order */
  readonly classes: readonly OverlayClass[];
  /** Splits the track into runs; `null` if the overlay can't be computed (i18n key `overlays.<id>.unavailable`) */
  classify(context: OverlayContext): OverlayRun[] | null;
}

/**
 * Builds runs from a class per track point. Runs shorter than `minRunKm` are merged into the previous run, so noise
 * in the data doesn't fragment the line into tiny pieces.
 */
export function runsFromClasses(track: Track, classOf: (index: number) => string, minRunKm = 0): OverlayRun[] {
  const { points } = track;
  const length = (run: OverlayRun) => points[run.to].distanceKm - points[run.from].distanceKm;

  // runs of equal class; a run ends at the first point of the next one
  const raw: OverlayRun[] = [];
  let current: OverlayRun = { classKey: classOf(0), from: 0, to: 0 };
  for (let i = 1; i < points.length; i++) {
    const key = classOf(i);
    current.to = i;
    if (key !== current.classKey) {
      raw.push(current);
      current = { classKey: key, from: i, to: i };
    }
  }
  raw.push(current);

  const runs: OverlayRun[] = [];
  for (const run of raw) {
    const last = runs.at(-1);
    if (last && (last.classKey === run.classKey || run.to === run.from || length(run) < minRunKm)) last.to = run.to;
    else runs.push({ ...run });
  }
  // a short first run can't be merged backwards – merge it into the next one instead
  if (runs.length > 1 && length(runs[0]) < minRunKm) {
    runs[1].from = 0;
    runs.shift();
  }
  return runs;
}

/** Distance in km per class (for the legend) */
export function distanceByClass(track: Track, runs: readonly OverlayRun[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const run of runs) {
    const km = track.points[run.to].distanceKm - track.points[run.from].distanceKm;
    result.set(run.classKey, (result.get(run.classKey) ?? 0) + km);
  }
  return result;
}
