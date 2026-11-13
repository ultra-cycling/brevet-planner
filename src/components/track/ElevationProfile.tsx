import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
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
  /** Controls drawn as vertical lines */
  checkpoints?: readonly { id: string; distanceKm: number; label: string; tag: string }[];
  /** Click or Enter on a position, e.g. to add a checkpoint there */
  onPick?: (distanceKm: number) => void;
  /**
   * Drag and drop of a checkpoint line by its number (US9). Called with the distance on drop; return `false` to reject
   * the move. Without it the lines can't be dragged.
   */
  onCheckpointMove?: (id: string, distanceKm: number) => boolean;
  /** Distance of a checkpoint being dragged elsewhere (e.g. on the map) – shown as a moving line */
  dragPreview?: { id: string; distanceKm: number } | null;
  /** Range to emphasise, e.g. the hovered segment */
  highlightRange?: { startKm: number; endKm: number } | null;
  /** Rendered below the distance axis, aligned with the plot (e.g. the segment strip) */
  footer?: ReactNode;
}

export function ElevationProfile({
  track,
  activeIndex,
  onActiveIndexChange,
  checkpoints = [],
  onPick,
  onCheckpointMove,
  dragPreview,
  highlightRange,
  footer,
}: ElevationProfileProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const plotRef = useRef<HTMLDivElement>(null);
  // checkpoint being dragged on the profile
  // `offsetKm`: where the handle was grabbed relative to the line – kept while dragging, so the line doesn't jump
  const [drag, setDrag] = useState<{ id: string; distanceKm: number; pointerId: number; offsetKm: number } | null>(null);
  const dragging = drag !== null;

  // Escape cancels the drag
  useEffect(() => {
    if (!dragging) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setDrag(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dragging]);

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

  /** Distance under the pointer (not snapped to a track point) */
  const kmAt = (clientX: number) => {
    const rect = plotRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * track.distanceKm;
  };
  const indexAt = (clientX: number) => nearestPointIndex(track.points, kmAt(clientX));

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
    if (e.key === 'Enter' && onPick && active) {
      e.preventDefault();
      onPick(active.distanceKm);
      return;
    }
    if (!(e.key in targets)) return;
    e.preventDefault();
    onActiveIndexChange(nearestPointIndex(track.points, targets[e.key]));
  };

  const valueText = active
    ? t('profile.position', { km: format.km(active.distanceKm), ele: active.ele === null ? '–' : format.m(active.ele) })
    : t(onPick ? 'profile.hintPick' : 'profile.hint');

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
            onClick={onPick ? (e) => onPick(track.points[indexAt(e.clientX)].distanceKm) : undefined}
            onKeyDown={onKeyDown}
            onBlur={() => onActiveIndexChange(null)}
          >
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="d-block w-100 h-100">
              <path d={paths.area} className="profile-area" />
              <path d={paths.line} className="profile-line" vectorEffect="non-scaling-stroke" />
            </svg>
            {highlightRange && (
              <div
                className="profile-range"
                style={{
                  left: `${pct(highlightRange.startKm)}%`,
                  width: `${pct(highlightRange.endKm) - pct(highlightRange.startKm)}%`,
                }}
                data-testid="profile-range"
              />
            )}
            {checkpoints.map((cp) => {
              const moving = drag?.id === cp.id ? drag : dragPreview?.id === cp.id ? dragPreview : null;
              return (
                <div
                  key={cp.id}
                  className={`profile-checkpoint${moving ? ' is-dragging' : ''}`}
                  style={{ left: `${pct(moving?.distanceKm ?? cp.distanceKm)}%` }}
                  title={cp.label}
                  data-testid="profile-checkpoint"
                >
                  <span
                    className={onCheckpointMove ? 'is-draggable' : undefined}
                    data-testid="profile-checkpoint-handle"
                    onPointerDown={
                      onCheckpointMove
                        ? (e) => {
                            e.stopPropagation();
                            e.currentTarget.setPointerCapture?.(e.pointerId);
                            setDrag({
                              id: cp.id,
                              distanceKm: cp.distanceKm,
                              pointerId: e.pointerId,
                              offsetKm: kmAt(e.clientX) - cp.distanceKm,
                            });
                          }
                        : undefined
                    }
                    onPointerMove={
                      onCheckpointMove
                        ? (e) => {
                            if (drag?.id !== cp.id || drag.pointerId !== e.pointerId) return;
                            const km = kmAt(e.clientX) - drag.offsetKm;
                            setDrag({ ...drag, distanceKm: Math.min(track.distanceKm, Math.max(0, km)) });
                          }
                        : undefined
                    }
                    onPointerUp={
                      onCheckpointMove
                        ? (e) => {
                            if (drag?.id !== cp.id || drag.pointerId !== e.pointerId) return;
                            setDrag(null);
                            if (drag.distanceKm !== cp.distanceKm) onCheckpointMove(cp.id, drag.distanceKm);
                          }
                        : undefined
                    }
                    onPointerCancel={() => setDrag(null)}
                    // a drop must not count as a click on the profile (that would add a checkpoint)
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cp.tag}
                  </span>
                </div>
              );
            })}
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
          {footer}
        </div>
      </div>
    </section>
  );
}
