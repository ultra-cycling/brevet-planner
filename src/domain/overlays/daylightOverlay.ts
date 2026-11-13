import { daylightAt } from '../sun';
import { runsFromClasses, type RouteOverlay } from './RouteOverlay';

/** Whether the rider is expected at each part of the route by day, in twilight or at night */
export const daylightOverlay: RouteOverlay = {
  id: 'daylight',
  // light → dark like the sky; the lightness differs strongly between the classes (colour-blind safe)
  classes: [
    { key: 'day', color: '#E9B500' },
    { key: 'twilight', color: '#8E7CC3' },
    { key: 'night', color: '#1E1B4B' },
  ],
  classify({ track, minutesAt, startUtcMs }) {
    return runsFromClasses(track, (i) => {
      const p = track.points[i];
      return daylightAt(startUtcMs + minutesAt[i] * 60_000, p.lat, p.lon);
    });
  },
};
