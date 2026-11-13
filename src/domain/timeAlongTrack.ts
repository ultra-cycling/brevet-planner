import type { TimeEstimator } from './time/TimeEstimator';
import type { Timetable } from './timetable';
import type { Track } from './track/track';

/** Expected times at every track point, in minutes after the start */
export interface TrackTimes {
  /** When the rider is expected there – riding plus rests and waiting at earlier controls */
  atMin: Float64Array;
  /** Riding time up to there, without stops */
  rideMin: Float64Array;
}

/**
 * Expected times at every track point, extrapolated from the timetable: the rider leaves a control at its departure
 * time and reaches a point within the following segment after the time the time model estimates for the part of the
 * segment up to that point. Used by overlays (US7) and the trackpoint tooltip (US8).
 */
export function timesAlongTrack(track: Track, timetable: Timetable, estimator: TimeEstimator): TrackTimes {
  const atMin = new Float64Array(track.points.length);
  const rideMin = new Float64Array(track.points.length);
  const rows = timetable.rows;
  let s = 1; // row whose segment contains the current point
  let startAscent = 0;
  let rideBefore = 0; // riding time of the segments before segment s

  track.points.forEach((p, i) => {
    while (s < rows.length - 1 && p.distanceKm > rows[s].segment!.endKm) {
      rideBefore += rows[s].rideMin!;
      s++;
    }
    const row = rows[s];
    if (!row?.segment) return; // only the start – no segments
    const previous = rows[s - 1];
    const segment = row.segment;
    // climb is counted from the last track point at or before the segment start, like the segments do
    if (i === 0 || track.points[i - 1].distanceKm <= segment.startKm) startAscent = ascentAtOrBefore(track, i, segment.startKm);
    const partial = {
      distanceKm: Math.max(0, p.distanceKm - segment.startKm),
      climbM: Math.max(0, p.ascentM - startAscent),
    };
    const ride = Math.min(estimator.estimateMinutes(partial, row.params!), row.rideMin!);
    atMin[i] = (previous.departureMin ?? previous.arrivalMin) + ride;
    rideMin[i] = rideBefore + ride;
  });
  return { atMin, rideMin };
}

/** Expected minutes after the start at every track point (see `timesAlongTrack`) */
export function minutesAlongTrack(track: Track, timetable: Timetable, estimator: TimeEstimator): Float64Array {
  return timesAlongTrack(track, timetable, estimator).atMin;
}

/** Times at any distance along the track, interpolated between the neighbouring track points */
export function timesAt(track: Track, times: TrackTimes, distanceKm: number): { atMin: number; rideMin: number } {
  const { points } = track;
  let lo = 0;
  let hi = points.length - 1;
  if (distanceKm <= points[lo].distanceKm) return { atMin: times.atMin[lo], rideMin: times.rideMin[lo] };
  if (distanceKm >= points[hi].distanceKm) return { atMin: times.atMin[hi], rideMin: times.rideMin[hi] };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceKm <= distanceKm) lo = mid;
    else hi = mid;
  }
  const span = points[hi].distanceKm - points[lo].distanceKm;
  const f = span > 0 ? (distanceKm - points[lo].distanceKm) / span : 0;
  const lerp = (a: Float64Array) => a[lo] + (a[hi] - a[lo]) * f;
  return { atMin: lerp(times.atMin), rideMin: lerp(times.rideMin) };
}

function ascentAtOrBefore(track: Track, from: number, distanceKm: number): number {
  let i = from;
  while (i > 0 && track.points[i].distanceKm > distanceKm) i--;
  return track.points[i].ascentM;
}
