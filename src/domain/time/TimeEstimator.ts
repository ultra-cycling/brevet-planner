/** Input describing one segment of the track between two checkpoints. */
export interface SegmentInput {
  distanceKm: number;
  climbM: number;
}

/** Describes one parameter of an estimator so the UI can render an input for it generically. */
export interface EstimatorParamDef {
  key: string;
  /** i18n key of the parameter label */
  labelKey: string;
  unit: string;
  default: number;
  min: number;
  max: number;
  step?: number;
}

export type EstimatorParams = Record<string, number>;

/**
 * Exchangeable model that estimates the riding time of a segment.
 * Implementations must be pure: same input → same output.
 */
export interface TimeEstimator {
  /** Stable id, stored with each plan (e.g. "speed-climb"). */
  readonly id: string;
  /** i18n key of the model name */
  readonly labelKey: string;
  readonly params: readonly EstimatorParamDef[];
  /** Riding time in minutes. Throws RangeError for invalid parameters. */
  estimateMinutes(segment: SegmentInput, params: EstimatorParams): number;
}

/** Fills missing parameters with the estimator's defaults and checks the ranges. */
export function resolveParams(estimator: TimeEstimator, params: Partial<EstimatorParams> = {}): EstimatorParams {
  const resolved: EstimatorParams = {};
  for (const def of estimator.params) {
    const value = params[def.key] ?? def.default;
    if (!Number.isFinite(value) || value < def.min || value > def.max) {
      throw new RangeError(`${estimator.id}: parameter "${def.key}" must be between ${def.min} and ${def.max}`);
    }
    resolved[def.key] = value;
  }
  return resolved;
}
