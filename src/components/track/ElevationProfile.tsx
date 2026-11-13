import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { elevationAxis, profileAreaPath, sampleProfile, ticks } from '../../domain/track/profile';
import { nearestPointIndex, type Track } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';

const WIDTH = 1000;
const HEIGHT = 140;

export interface ElevationProfileProps {
  track: Track;
  /** Index of the highlighted track point (shared with the map) */
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
}

export function ElevationProfile({ track, activeIndex, onActiveIndexChange }: ElevationProfileProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const plotRef = useRef<HTMLDivElement>(null);

  const hasElevation = track.minEleM !== null && track.maxEleM !== null;
  const axis = useMemo(() => elevationAxis(track.minEleM ?? 0, track.maxEleM ?? 0), [track]);

  const paths = useMemo(
    () => profileAreaPath(sampleProfile(track), track.distanceKm, axis.min, axis.max, WIDTH, HEIGHT),
    [track, axis],
  );
  const kmTicks = useMemo(() => ticks(track.distanceKm), [track.distanceKm]);

  if (!hasElevation) {
    return (
      <section className="p-3" aria-label={t('profile.label')}>
        <p className="text-body-secondary mb-0">{t('profile.noElevation')}</p>
      </section>
    );
  }

  const active = activeIndex !== null ? track.points[activeIndex] : null;
  const pct = (km: number) => (track.distanceKm > 0 ? (km / track.distanceKm) * 100 : 0);

  const indexAt = (clientX: number) => {
    const rect = plotRef.current!.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return nearestPointIndex(track.points, fraction * track.distanceKm);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => onActiveIndexChange(indexAt(e.clientX));

  // Keyboard: move the cursor along the track in 1 % (Shift: 10 %) steps
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentKm = active?.distanceKm ?? 0;
    const step = track.distanceKm * (e.shiftKey ? 0.1 : 0.01);
    const targets: Record<string, number> = {
      ArrowRight: currentKm + step,
      ArrowUp: currentKm + step,
      ArrowLeft: currentKm - step,
      ArrowDown: currentKm - step,
      Home: 0,
      End: track.distanceKm,
    };
    if (!(e.key in targets)) return;
    e.preventDefault();
    onActiveIndexChange(nearestPointIndex(track.points, targets[e.key]));
  };

  const valueText = active
    ? t('profile.position', { km: format.km(active.distanceKm), ele: active.ele === null ? '–' : format.m(active.ele) })
    : t('profile.hint');

  return (
    <section className="p-3 elevation-profile" aria-labelledby="profile-heading">
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <h2 id="profile-heading" className="h6 mb-0">
          {t('profile.label')}
        </h2>
        <span className="small text-body-secondary tabular-nums" aria-hidden="true" data-testid="profile-readout">
          {valueText}
        </span>
      </div>
      <div className="d-flex gap-2">
        <div className="profile-y-axis small text-body-secondary tabular-nums" aria-hidden="true">
          <span>{format.m(axis.max)}</span>
          <span>{format.m(axis.min)}</span>
        </div>
        <div className="flex-grow-1 min-w-0">
          <div
            ref={plotRef}
            className="profile-plot"
            role="slider"
            tabIndex={0}
            aria-label={t('profile.label')}
            aria-valuemin={0}
            aria-valuemax={Math.round(track.distanceKm * 10) / 10}
            aria-valuenow={active ? Math.round(active.distanceKm * 10) / 10 : 0}
            aria-valuetext={valueText}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => onActiveIndexChange(null)}
            onKeyDown={onKeyDown}
            onBlur={() => onActiveIndexChange(null)}
          >
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="d-block w-100 h-100">
              <path d={paths.area} className="profile-area" />
              <path d={paths.line} className="profile-line" vectorEffect="non-scaling-stroke" />
            </svg>
            {active && <div className="profile-cursor" style={{ left: `${pct(active.distanceKm)}%` }} data-testid="profile-cursor" />}
          </div>
          <div className="profile-x-axis small text-body-secondary tabular-nums" aria-hidden="true">
            {kmTicks.map((km) => (
              <span key={km} style={{ left: `${pct(km)}%` }}>
                {format.int(km)}
              </span>
            ))}
            <span className="end">{format.km(track.distanceKm)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
