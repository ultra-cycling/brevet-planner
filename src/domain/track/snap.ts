import { haversineKm } from './geo';
import { nearestPointIndex, type Track } from './track';

/** A position on the track, interpolated between two track points. */
export interface TrackPosition {
  /** Distance from the start along the track in km */
  distanceKm: number;
  lat: number;
  lon: number;
}

export interface SnappedPosition extends TrackPosition {
  /** Straight-line distance between the requested coordinate and the snapped position in km */
  offTrackKm: number;
}

const KM_PER_DEG_LAT = 111.32;

/** Position at the given distance along the track (clamped to start and finish). */
export function positionAtDistance(track: Track, distanceKm: number): TrackPosition {
  const { points } = track;
  const km = Math.min(track.distanceKm, Math.max(0, distanceKm));
  let i = nearestPointIndex(points, km);
  if (points[i].distanceKm > km && i > 0) i -= 1;
  const a = points[i];
  const b = points[Math.min(i + 1, points.length - 1)];
  const span = b.distanceKm - a.distanceKm;
  const t = span > 0 ? Math.min(1, Math.max(0, (km - a.distanceKm) / span)) : 0;
  return { distanceKm: km, lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

/**
 * Projects a coordinate onto the nearest segment of the track.
 *
 * Uses a local equirectangular projection per segment – accurate enough for the short segments of a GPX track.
 * If the track passes the coordinate several times (out-and-back, loops), the closest pass wins; on a tie the
 * earlier one.
 */
export function snapToTrack(track: Track, lat: number, lon: number): SnappedPosition {
  const { points } = track;
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  let best = { d2: Infinity, index: 0, t: 0 };

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const ax = (a.lon - lon) * kmPerDegLon;
    const ay = (a.lat - lat) * KM_PER_DEG_LAT;
    const dx = (b.lon - a.lon) * kmPerDegLon;
    const dy = (b.lat - a.lat) * KM_PER_DEG_LAT;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
    const x = ax + t * dx;
    const y = ay + t * dy;
    const d2 = x * x + y * y;
    if (d2 < best.d2) best = { d2, index: i, t };
  }

  const a = points[best.index];
  const b = points[best.index + 1];
  const snapped = {
    distanceKm: a.distanceKm + (b.distanceKm - a.distanceKm) * best.t,
    lat: a.lat + (b.lat - a.lat) * best.t,
    lon: a.lon + (b.lon - a.lon) * best.t,
  };
  return { ...snapped, offTrackKm: haversineKm(lat, lon, snapped.lat, snapped.lon) };
}

/** Coordinates of the track between two distances, with interpolated end points (e.g. to draw a segment). */
export function trackSlice(track: Track, startKm: number, endKm: number): [number, number][] {
  const from = positionAtDistance(track, Math.min(startKm, endKm));
  const to = positionAtDistance(track, Math.max(startKm, endKm));
  const inner = track.points
    .filter((p) => p.distanceKm > from.distanceKm && p.distanceKm < to.distanceKm)
    .map((p) => [p.lat, p.lon] as [number, number]);
  return [[from.lat, from.lon], ...inner, [to.lat, to.lon]];
}
