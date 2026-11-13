import type { TimeEstimator } from './time/TimeEstimator';
import type { Timetable } from './timetable';
import type { Track } from './track/track';

/**
 * Expected time (minutes after the start) at every track point, extrapolated from the timetable: the rider leaves a
 * control at its departure time and reaches a point within the following segment after the time the time model
 * estimates for the part of the segment up to that point. Used by overlays (US7) and the trackpoint tooltip (US8).
 */
export function minutesAlongTrack(track: Track, timetable: Timetable, estimator: TimeEstimator): Float64Array {
  const result = new Float64Array(track.points.length);
  const rows = timetable.rows;
  let s = 1; // row whose segment contains the current point
  let startAscent = 0;

  track.points.forEach((p, i) => {
    while (s < rows.length - 1 && p.distanceKm > rows[s].segment!.endKm) s++;
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
    result[i] = (previous.departureMin ?? previous.arrivalMin) + ride;
  });
  return result;
}

function ascentAtOrBefore(track: Track, from: number, distanceKm: number): number {
  let i = from;
  while (i > 0 && track.points[i].distanceKm > distanceKm) i--;
  return track.points[i].ascentM;
}
