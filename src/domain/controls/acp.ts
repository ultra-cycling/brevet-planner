import type { ControlKind, ControlRules, ControlWindow } from './ControlRules';

/**
 * ACP brevet control times (Brevets de Randonneurs Mondiaux), as used by the ACP/RUSA control time calculators.
 *
 * - Opening time: distance ridden at the maximum speed of each distance band.
 * - Closing time: distance ridden at the minimum speed of each distance band.
 * - Start control: opens at the start, closes one hour later.
 * - Controls within the first 60 km close at 20 km/h plus one hour, so early controls aren't closed too soon.
 * - Finish: closes at the fixed time limit of the nominal brevet distance. Controls beyond the nominal distance
 *   (brevets are often a few km longer) are computed at the nominal distance.
 * - Times are rounded to the nearest minute.
 */
const BANDS: readonly { untilKm: number; minKmh: number; maxKmh: number }[] = [
  { untilKm: 200, minKmh: 15, maxKmh: 34 },
  { untilKm: 400, minKmh: 15, maxKmh: 32 },
  { untilKm: 600, minKmh: 15, maxKmh: 30 },
  { untilKm: 1000, minKmh: 11.428, maxKmh: 28 },
  { untilKm: 1300, minKmh: 13.333, maxKmh: 26 },
];

/** Fixed overall time limits in minutes */
const TIME_LIMITS_MIN: Readonly<Record<number, number>> = {
  200: 13 * 60 + 30,
  300: 20 * 60,
  400: 27 * 60,
  600: 40 * 60,
  1000: 75 * 60,
  1200: 90 * 60,
};

const EARLY_CONTROL_KM = 60;
const EARLY_CONTROL_KMH = 20;
/** A track may be up to this much shorter than the nominal distance and still count as that brevet */
const SHORT_TOLERANCE = 0.05;

function hoursAt(distanceKm: number, speed: 'minKmh' | 'maxKmh'): number {
  let hours = 0;
  let from = 0;
  for (const band of BANDS) {
    if (distanceKm <= from) break;
    hours += (Math.min(distanceKm, band.untilKm) - from) / band[speed];
    from = band.untilKm;
  }
  const last = BANDS.at(-1)!;
  if (distanceKm > last.untilKm) hours += (distanceKm - last.untilKm) / last[speed];
  return hours;
}

const toMinutes = (hours: number) => Math.round(hours * 60);

export const acpControlRules: ControlRules = {
  id: 'acp',
  brevetDistancesKm: Object.keys(TIME_LIMITS_MIN).map(Number),

  timeLimitMin(brevetKm) {
    return TIME_LIMITS_MIN[brevetKm] ?? null;
  },

  inferBrevetKm(trackKm) {
    const fitting = this.brevetDistancesKm.filter((km) => km * (1 - SHORT_TOLERANCE) <= trackKm);
    return fitting.length > 0 ? Math.max(...fitting) : null;
  },

  window(distanceKm: number, kind: ControlKind, brevetKm: number | null): ControlWindow {
    if (kind === 'start' || distanceKm <= 0) return { openMin: 0, closeMin: 60 };

    const km = brevetKm !== null ? Math.min(distanceKm, brevetKm) : distanceKm;
    const openMin = toMinutes(hoursAt(km, 'maxKmh'));
    const limit = brevetKm !== null ? this.timeLimitMin(brevetKm) : null;

    if (kind === 'finish' && limit !== null) return { openMin, closeMin: limit };

    let closeMin =
      km <= EARLY_CONTROL_KM ? toMinutes(km / EARLY_CONTROL_KMH + 1) : toMinutes(hoursAt(km, 'minKmh'));
    if (limit !== null) closeMin = Math.min(closeMin, limit);
    return { openMin, closeMin };
  },
};
