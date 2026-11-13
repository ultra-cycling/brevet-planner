import { cumulativeAscentDescent, haversineKm } from './geo';

export interface TrackPoint {
  lat: number;
  lon: number;
  /** Elevation in metres, `null` if the GPX point has none */
  ele: number | null;
  /** Cumulative distance from the start in km */
  distanceKm: number;
  /** Cumulative climb and descent from the start in m (5 m hysteresis, see `cumulativeAscentDescent`) */
  ascentM: number;
  descentM: number;
}

/** Named GPS point contained in the GPX file (`<wpt>`) – candidate for checkpoints (US2). */
export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
}

export type Bounds = [[number, number], [number, number]]; // [[south, west], [north, east]]

export interface Track {
  name: string;
  points: TrackPoint[];
  waypoints: Waypoint[];
  distanceKm: number;
  climbM: number;
  descentM: number;
  /** `null` when the track has no elevation data */
  minEleM: number | null;
  maxEleM: number | null;
  bounds: Bounds;
}

export interface RawPoint {
  lat: number;
  lon: number;
  ele: number | null;
}

/** Builds a track with cumulative distances and statistics from raw coordinates. */
export function buildTrack(name: string, raw: readonly RawPoint[], waypoints: Waypoint[] = []): Track {
  if (raw.length < 2) throw new RangeError('A track needs at least two points');

  const points: TrackPoint[] = [];
  let distanceKm = 0;
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  let minEleM: number | null = null;
  let maxEleM: number | null = null;

  raw.forEach((p, i) => {
    if (i > 0) distanceKm += haversineKm(raw[i - 1].lat, raw[i - 1].lon, p.lat, p.lon);
    points.push({ lat: p.lat, lon: p.lon, ele: p.ele, distanceKm, ascentM: 0, descentM: 0 });
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lon);
    east = Math.max(east, p.lon);
    if (p.ele !== null) {
      minEleM = minEleM === null ? p.ele : Math.min(minEleM, p.ele);
      maxEleM = maxEleM === null ? p.ele : Math.max(maxEleM, p.ele);
    }
  });

  const cumulative = cumulativeAscentDescent(points.map((p) => p.ele));
  points.forEach((p, i) => {
    p.ascentM = cumulative.ascentM[i];
    p.descentM = cumulative.descentM[i];
  });
  const { ascentM, descentM } = points.at(-1)!;
  return {
    name,
    points,
    waypoints,
    distanceKm,
    climbM: ascentM,
    descentM,
    minEleM,
    maxEleM,
    bounds: [[south, west], [north, east]],
  };
}

/** Index of the track point closest to the given distance (binary search on cumulative distance). */
export function nearestPointIndex(points: readonly TrackPoint[], distanceKm: number): number {
  let lo = 0;
  let hi = points.length - 1;
  if (distanceKm <= points[lo].distanceKm) return lo;
  if (distanceKm >= points[hi].distanceKm) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].distanceKm <= distanceKm) lo = mid;
    else hi = mid;
  }
  return distanceKm - points[lo].distanceKm <= points[hi].distanceKm - distanceKm ? lo : hi;
}
