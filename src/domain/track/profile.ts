import type { Track } from './track';

export interface ProfileSample {
  distanceKm: number;
  ele: number;
}

/**
 * Reduces the track to at most `maxSamples` elevation samples for drawing.
 * Keeps the highest and lowest point of each bucket so peaks don't disappear.
 */
export function sampleProfile(track: Track, maxSamples = 1000): ProfileSample[] {
  const withEle = track.points.filter((p) => p.ele !== null) as { distanceKm: number; ele: number }[];
  if (withEle.length <= maxSamples) return withEle.map(({ distanceKm, ele }) => ({ distanceKm, ele }));

  const buckets = Math.max(1, Math.floor(maxSamples / 2));
  const size = withEle.length / buckets;
  const samples: ProfileSample[] = [];
  for (let b = 0; b < buckets; b++) {
    const slice = withEle.slice(Math.floor(b * size), Math.floor((b + 1) * size));
    if (slice.length === 0) continue;
    let min = slice[0], max = slice[0];
    for (const p of slice) {
      if (p.ele < min.ele) min = p;
      if (p.ele > max.ele) max = p;
    }
    const pair = min.distanceKm <= max.distanceKm ? [min, max] : [max, min];
    for (const p of pair) {
      if (samples.at(-1)?.distanceKm !== p.distanceKm) samples.push({ distanceKm: p.distanceKm, ele: p.ele });
    }
  }
  const last = withEle.at(-1)!;
  if (samples.at(-1)?.distanceKm !== last.distanceKm) samples.push({ distanceKm: last.distanceKm, ele: last.ele });
  return samples;
}

/** A "nice" axis step (1, 2, 5 × 10ⁿ) so that `span` is divided into roughly `targetTicks` parts. */
export function niceStep(span: number, targetTicks = 6): number {
  if (span <= 0) return 1;
  const raw = span / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Tick values from 0 up to (and excluding values too close to) `max`. */
export function ticks(max: number, targetTicks = 6): number[] {
  const step = niceStep(max, targetTicks);
  const result: number[] = [];
  for (let v = 0; v <= max - step * 0.4; v += step) result.push(Math.round(v * 1e6) / 1e6);
  return result;
}

/** Rounded elevation axis range around the data, e.g. 362–838 m → 200–1000 m. */
export function elevationAxis(minEle: number, maxEle: number, targetTicks = 3): { min: number; max: number } {
  const step = Math.max(niceStep(maxEle - minEle, targetTicks), 10); // at least 10 m, also for flat tracks
  const min = Math.floor(minEle / step) * step;
  const max = Math.ceil(maxEle / step) * step;
  return { min, max: max > min ? max : min + step };
}

/** SVG path data ("M … L … Z") for the filled profile area in a `width × height` box; `minEle`/`maxEle` map to bottom/top. */
export function profileAreaPath(
  samples: readonly ProfileSample[],
  distanceKm: number,
  minEle: number,
  maxEle: number,
  width: number,
  height: number,
): { area: string; line: string } {
  if (samples.length === 0) return { area: '', line: '' };
  const range = Math.max(maxEle - minEle, 1);
  const y = (ele: number) => height - ((ele - minEle) / range) * height;
  const x = (km: number) => (distanceKm > 0 ? (km / distanceKm) * width : 0);
  const coords = samples.map((s) => `${x(s.distanceKm).toFixed(1)},${y(s.ele).toFixed(1)}`);
  const line = `M${coords.join('L')}`;
  const area = `${line}L${x(samples.at(-1)!.distanceKm).toFixed(1)},${height}L${x(samples[0].distanceKm).toFixed(1)},${height}Z`;
  return { area, line };
}
