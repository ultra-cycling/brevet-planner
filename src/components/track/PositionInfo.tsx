import { useTranslation } from 'react-i18next';
import { formatElapsed } from '../../domain/time/duration';
import { useFormat } from '../../i18n/useFormat';
import type { TimeFormat } from '../timetable/useTimeFormat';

export interface TrackPositionInfo {
  distanceKm: number;
  /** Climb accumulated from the start up to this point in m, `null` without elevation data */
  climbM: number | null;
  /** Expected minutes after the start (riding plus stops) */
  atMin: number;
  /** Riding time up to this point */
  rideMin: number;
}

export interface PositionInfoProps {
  info: TrackPositionInfo;
  times: TimeFormat;
  /** Hint at the bottom, e.g. "Click to add a checkpoint here" */
  hint?: string;
}

/** What the rider can expect at a point of the route (US8): distance, climb so far, time of passing, riding time. */
export function PositionInfo({ info, times, hint }: PositionInfoProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const elapsed = formatElapsed(info.atMin);
  return (
    <div className="position-info tabular-nums" data-testid="position-info">
      <div className="fw-semibold" data-testid="position-distance">
        {info.climbM === null
          ? format.km(info.distanceKm)
          : t('map.position.distanceClimb', { distance: format.km(info.distanceKm), climb: format.m(info.climbM) })}
      </div>
      <div data-testid="position-expected">
        {times.mode === 'clock'
          ? t('map.position.expectedClock', { time: times.format(info.atMin), elapsed })
          : t('map.position.expectedElapsed', { elapsed })}
      </div>
      <div data-testid="position-ride">{t('map.position.ride', { time: formatElapsed(info.rideMin) })}</div>
      {hint && <div className="small text-body-secondary mt-1">{hint}</div>}
    </div>
  );
}
