import type { Checkpoint } from './checkpoints';
import type { Track } from './track/track';

/** The part of the track from one control to the next. */
export interface Segment {
  /** 0-based position along the track */
  index: number;
  from: Checkpoint;
  to: Checkpoint;
  startKm: number;
  endKm: number;
  distanceKm: number;
  climbM: number;
  descentM: number;
  /** Climb per distance in m/km – a rough measure of how hilly the segment is */
  climbPerKm: number;
}

/** Index of the last track point at or before `distanceKm` (binary search on cumulative distance). */
function pointIndexAtOrBefore(track: Track, distanceKm: number): number {
  const { points } = track;
  let lo = 0;
  let hi = points.length - 1;
  if (distanceKm >= points[hi].distanceKm) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceKm <= distanceKm) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Climb and descent between two distances along the track.
 * Boundaries are taken at the last track point at or before each distance, so adjacent ranges share their boundary
 * point and the segments of a track add up exactly to the track's total climb and descent.
 */
export function climbBetween(track: Track, startKm: number, endKm: number): { climbM: number; descentM: number } {
  const a = track.points[pointIndexAtOrBefore(track, startKm)];
  const b = track.points[pointIndexAtOrBefore(track, endKm)];
  return { climbM: Math.max(0, b.ascentM - a.ascentM), descentM: Math.max(0, b.descentM - a.descentM) };
}

/** Segments between consecutive controls (start → CP1 → … → finish); `checkpoints` must be ordered along the track. */
export function buildSegments(track: Track, checkpoints: readonly Checkpoint[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < checkpoints.length; i++) {
    const from = checkpoints[i - 1];
    const to = checkpoints[i];
    const distanceKm = Math.max(0, to.distanceKm - from.distanceKm);
    const { climbM, descentM } = climbBetween(track, from.distanceKm, to.distanceKm);
    segments.push({
      index: i - 1,
      from,
      to,
      startKm: from.distanceKm,
      endKm: to.distanceKm,
      distanceKm,
      climbM,
      descentM,
      climbPerKm: distanceKm > 0 ? climbM / distanceKm : 0,
    });
  }
  return segments;
}
