import { resolveParams, type EstimatorParams, type SegmentInput, type TimeEstimator } from './TimeEstimator';

/**
 * time = distance / speed + climb / climb rate
 *
 * `speedKmh` is the average speed on flat terrain, `climbRateMh` the vertical metres climbed per hour.
 */
export const speedClimbEstimator: TimeEstimator = {
  id: 'speed-climb',
  labelKey: 'timeModel.speedClimb.name',
  params: [
    { key: 'speedKmh', labelKey: 'timeModel.speedClimb.speed', unit: 'km/h', default: 28, min: 1, max: 80, step: 0.5 },
    { key: 'climbRateMh', labelKey: 'timeModel.speedClimb.climbRate', unit: 'm/h', default: 700, min: 50, max: 3000, step: 50 },
  ],
  estimateMinutes(segment: SegmentInput, params: EstimatorParams): number {
    if (segment.distanceKm < 0 || segment.climbM < 0) {
      throw new RangeError('speed-climb: distance and climb must not be negative');
    }
    const { speedKmh, climbRateMh } = resolveParams(speedClimbEstimator, params);
    const hours = segment.distanceKm / speedKmh + segment.climbM / climbRateMh;
    return hours * 60;
  },
};
