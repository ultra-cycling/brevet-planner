import type { Track } from '../track/track';
import { runsFromClasses, type RouteOverlay } from './RouteOverlay';

/** Gradient is measured over this distance around each point – single GPS elevations are too noisy */
const WINDOW_KM = 0.2;
/** Upper bounds in % of descent, flat, moderate, steep; above: very steep */
export const GRADIENT_LIMITS = [-2, 2, 5, 8] as const;

/** Gradient in % at every track point, averaged over ±100 m; `null` without elevation data */
export function gradientsPercent(track: Track): Float64Array | null {
  const { points } = track;
  if (points.some((p) => p.ele === null)) return null;
  const result = new Float64Array(points.length);
  const eleAt = (km: number, hint: number) => {
    let i = hint;
    while (i < points.length - 1 && points[i + 1].distanceKm < km) i++;
    while (i > 0 && points[i].distanceKm > km) i--;
    const a = points[i];
    const b = points[Math.min(i + 1, points.length - 1)];
    const f = b.distanceKm > a.distanceKm ? (km - a.distanceKm) / (b.distanceKm - a.distanceKm) : 0;
    return { ele: a.ele! + (b.ele! - a.ele!) * Math.min(Math.max(f, 0), 1), index: i };
  };
  let lo = 0;
  let hi = 0;
  const total = track.distanceKm;
  points.forEach((p, i) => {
    const fromKm = Math.max(0, p.distanceKm - WINDOW_KM / 2);
    const toKm = Math.min(total, p.distanceKm + WINDOW_KM / 2);
    const a = eleAt(fromKm, lo);
    const b = eleAt(toKm, Math.max(hi, i));
    lo = a.index;
    hi = b.index;
    result[i] = toKm > fromKm ? ((b.ele - a.ele) / ((toKm - fromKm) * 1000)) * 100 : 0;
  });
  return result;
}

const CLASSES = ['descent', 'flat', 'moderate', 'steep', 'verySteep'] as const;

export const gradientOverlay: RouteOverlay = {
  id: 'gradient',
  // sequential light → dark for climbing, blue for descents; lightness differs between neighbours (colour-blind safe)
  classes: [
    { key: 'descent', color: '#2C7BB6' },
    { key: 'flat', color: '#9CA3AF' },
    { key: 'moderate', color: '#F4A259' },
    { key: 'steep', color: '#D7301F' },
    { key: 'verySteep', color: '#67000D' },
  ],
  classify({ track }) {
    const gradients = gradientsPercent(track);
    if (!gradients) return null;
    return runsFromClasses(
      track,
      (i) => {
        const index = GRADIENT_LIMITS.findIndex((limit) => gradients[i] < limit);
        return CLASSES[index === -1 ? CLASSES.length - 1 : index];
      },
      0.1,
    );
  },
};
