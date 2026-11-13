import { useTranslation } from 'react-i18next';
import type { Segment } from '../../domain/segments';
import { formatElapsed } from '../../domain/time/duration';
import { useFormat } from '../../i18n/useFormat';

export interface SegmentView {
  segment: Segment;
  /** "Start → CP1" */
  name: string;
  /** Estimated riding time of the segment */
  rideMin: number;
}

export interface SegmentStripProps {
  segments: readonly SegmentView[];
  totalKm: number;
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
}

/**
 * The segments as a band below the elevation profile, aligned with its distance axis. Each segment shows its
 * distance and climb; hovering or focusing one highlights it on the map and the profile.
 */
export function SegmentStrip({ segments, totalKm, activeIndex, onActiveIndexChange }: SegmentStripProps) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <ol className="segment-strip list-unstyled mb-0" aria-label={t('segments.label')} onMouseLeave={() => onActiveIndexChange(null)}>
      {segments.map(({ segment, name, rideMin }) => {
        const description = t('segments.description', {
          name,
          ride: formatElapsed(rideMin),
          distance: format.km(segment.distanceKm),
          climb: format.m(segment.climbM),
          descent: format.m(segment.descentM),
        });
        return (
          <li
            key={`${segment.from.id}-${segment.to.id}`}
            style={{ width: `${totalKm > 0 ? (segment.distanceKm / totalKm) * 100 : 0}%` }}
          >
            <button
              type="button"
              className={`segment-chip${activeIndex === segment.index ? ' is-active' : ''}`}
              aria-label={description}
              aria-pressed={activeIndex === segment.index}
              title={description}
              data-testid="segment-chip"
              onMouseEnter={() => onActiveIndexChange(segment.index)}
              onFocus={() => onActiveIndexChange(segment.index)}
              onBlur={() => onActiveIndexChange(null)}
              onClick={() => onActiveIndexChange(activeIndex === segment.index ? null : segment.index)}
            >
              <span className="tabular-nums" aria-hidden="true">
                {format.km(segment.distanceKm)}
                <span className="segment-climb"> ↑{format.m(segment.climbM)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
