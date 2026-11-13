const EARTH_RADIUS_KM = 6371.0088; // mean Earth radius (IUGG)

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates in kilometres (haversine formula). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Total ascent and descent of an elevation series.
 *
 * GPS/barometric elevation is noisy; summing every small up and down inflates the climb considerably.
 * Changes are therefore only counted once they exceed `thresholdM` relative to the last counted elevation
 * (hysteresis). `null` values (points without elevation) are skipped.
 */
export function ascentDescent(elevations: readonly (number | null)[], thresholdM = 5): { ascentM: number; descentM: number } {
  let ascentM = 0;
  let descentM = 0;
  let reference: number | null = null;
  for (const ele of elevations) {
    if (ele === null) continue;
    if (reference === null) {
      reference = ele;
      continue;
    }
    const diff = ele - reference;
    if (diff >= thresholdM) {
      ascentM += diff;
      reference = ele;
    } else if (diff <= -thresholdM) {
      descentM -= diff;
      reference = ele;
    }
  }
  return { ascentM, descentM };
}
