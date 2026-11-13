/**
 * Position of the sun – low-precision formulas of the US Naval Observatory (accurate to about 0.1° for 1800–2200,
 * plenty for telling day, twilight and night apart).
 */
const RAD = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12);

/** Altitude of the sun's centre above the horizon in degrees (without refraction) */
export function sunAltitudeDeg(utcMs: number, lat: number, lon: number): number {
  const d = (utcMs - J2000_MS) / 86_400_000;
  const g = (357.529 + 0.98560028 * d) * RAD; // mean anomaly
  const q = 280.459 + 0.98564736 * d; // mean longitude
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * RAD; // obliquity of the ecliptic
  const ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)); // right ascension
  const dec = Math.asin(Math.sin(e) * Math.sin(l)); // declination
  const gmstDeg = (18.697374558 + 24.06570982441908 * d) * 15;
  const hourAngle = (gmstDeg + lon) * RAD - ra;
  const phi = lat * RAD;
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle)) / RAD;
}

/** Sunrise/sunset: upper limb on the horizon, incl. refraction */
export const SUNRISE_ALTITUDE_DEG = -0.833;
/** End of civil twilight */
export const CIVIL_TWILIGHT_ALTITUDE_DEG = -6;

export type Daylight = 'day' | 'twilight' | 'night';

export function daylightAt(utcMs: number, lat: number, lon: number): Daylight {
  const altitude = sunAltitudeDeg(utcMs, lat, lon);
  if (altitude > SUNRISE_ALTITUDE_DEG) return 'day';
  return altitude > CIVIL_TWILIGHT_ALTITUDE_DEG ? 'twilight' : 'night';
}
