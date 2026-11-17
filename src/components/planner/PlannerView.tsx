import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  controlRows,
  findCheckpointNear,
  moveConflict,
  type CheckpointAction,
  type CheckpointSource,
} from '../../domain/checkpoints';
import { acpControlRules } from '../../domain/controls/acp';
import { buildSegments } from '../../domain/segments';
import { distanceByClass } from '../../domain/overlays/RouteOverlay';
import { timesAlongTrack, timesAt } from '../../domain/timeAlongTrack';
import { startInstantUtc } from '../../domain/time/timeZone';
import { resolveParams } from '../../domain/time/TimeEstimator';
import type { PlanAction, PlanState } from '../../domain/planState';
import { buildTimetable } from '../../domain/timetable';
import { positionAtDistance, snapToTrack, trackSlice } from '../../domain/track/snap';
import { nearestPointIndex } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';
import { CheckpointPanel } from '../checkpoints/CheckpointPanel';
import { useControlLabel } from '../checkpoints/useControlLabel';
import { useAppServices } from '../../app/AppServices';
import { SegmentStrip, type SegmentView } from '../segments/SegmentStrip';
import { BrevetSettings } from '../checkpoints/BrevetSettings';
import { PlanSettingsBar } from '../timetable/PlanSettingsBar';
import { TimetableCards } from '../timetable/TimetableCards';
import { useTimeFormat, type TimeDisplay } from '../timetable/useTimeFormat';
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { ElevationProfile } from '../track/ElevationProfile';
import { RouteOverlayPanel } from '../track/RouteOverlayPanel';
import { PositionInfo } from '../track/PositionInfo';
import { TrackMap, type OverlayLine } from '../track/TrackMap';
import { TrackSummary } from '../track/TrackSummary';

/** Control rules used for the windows – selectable per plan once other rules exist */
const rules = acpControlRules;

export interface PlannerViewProps {
  plan: PlanState;
  onChange: (action: PlanAction) => void;
}

/**
 * The planner for one open plan: plan column (summary, settings, timetable) next to the map and the elevation profile.
 * Mount it with `key={plan id}` – its UI state (highlights, overlay, drag) belongs to one plan.
 */
export function PlannerView({ plan, onChange }: PlannerViewProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const controlLabel = useControlLabel();
  const { track, checkpoints: checkpointState, timeModel, start, tightBufferMin, timeZone } = plan;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dispatch = useCallback((action: CheckpointAction) => onChange({ type: 'checkpoints', action }), [onChange]);
  const [announcement, setAnnouncement] = useState('');
  // phones: read-only view – map, elevation profile and timetable cards only (docs/plan.md → Phone layout)
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  // checkpoint being dragged on the map – shown on the profile as well (US9)
  const [mapDrag, setMapDrag] = useState<{
    id: string;
    distanceKm: number;
  } | null>(null);
  const { config, estimators, overlays } = useAppServices();
  const estimator = estimators.get(timeModel.id);
  const defaultRestMin = config.planning.defaultRestMinutes;
  const [timeDisplay, setTimeDisplay] = useState<TimeDisplay>('clock');
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const overlay = (overlayId && overlays.get(overlayId)) || null;

  const rows = useMemo(() => controlRows(checkpointState, rules), [checkpointState]);
  const segments = useMemo(
    () => buildSegments(track, checkpointState.checkpoints),
    [track, checkpointState.checkpoints],
  );
  const timetable = useMemo(
    () => buildTimetable(rows, segments, estimator, timeModel.params),
    [rows, segments, estimator, timeModel.params],
  );
  // latest point in time shown in the timetable – decides whether clock times need the weekday
  const lastMin = useMemo(
    () => Math.max(0, ...timetable.rows.map((r) => Math.max(r.arrivalMin, r.control.window.closeMin))),
    [timetable],
  );
  const times = useTimeFormat(start, timeDisplay, lastMin);
  const clock = useTimeFormat(start, 'clock', lastMin);
  const segmentViews: SegmentView[] = useMemo(() => {
    const shortName = (id: string) => {
      const row = rows.find((r) => r.checkpoint.id === id)!;
      return row.number === null
        ? t(`checkpoints.${row.checkpoint.kind}`)
        : t('checkpoints.cp', { number: row.number });
    };
    return segments.map((segment) => ({
      segment,
      name: `${shortName(segment.from.id)} → ${shortName(segment.to.id)}`,
      rideMin: timetable.rows[segment.index + 1].rideMin ?? 0,
    }));
  }, [segments, rows, timetable, t]);
  // expected times at every track point – for the overlays (US7) and the position tooltip (US8)
  const trackTimes = useMemo(() => timesAlongTrack(track, timetable, estimator), [track, timetable, estimator]);
  // route overlay (US7): classes along the track, drawn as one line per run
  const overlayResult = useMemo(() => {
    if (!overlay) return null;
    const runs = overlay.classify({
      track,
      minutesAt: trackTimes.atMin,
      startUtcMs: startInstantUtc(start, timeZone),
    });
    if (!runs) return { lines: null, distances: null };
    const colors = new Map(overlay.classes.map((c) => [c.key, c.color]));
    const lines: OverlayLine[] = runs.map((run) => ({
      key: `${run.from}-${run.classKey}`,
      classKey: run.classKey,
      color: colors.get(run.classKey)!,
      positions: track.points.slice(run.from, run.to + 1).map((p) => [p.lat, p.lon] as [number, number]),
    }));
    return { lines, distances: distanceByClass(track, runs) };
  }, [track, overlay, trackTimes, start, timeZone]);
  // a removed checkpoint may leave the highlight pointing past the last segment
  const highlighted = activeSegment !== null ? (segments[activeSegment] ?? null) : null;
  const highlightPath = useMemo(
    () => (highlighted ? trackSlice(track, highlighted.startKm, highlighted.endKm) : null),
    [track, highlighted],
  );

  /** Adds an intermediate control at a distance along the track; false if one is already there */
  const addCheckpoint = (distanceKm: number, source: CheckpointSource): boolean => {
    const position = positionAtDistance(track, distanceKm);
    if (findCheckpointNear(checkpointState.checkpoints, position.distanceKm)) {
      setAnnouncement(t('checkpoints.duplicate'));
      return false;
    }
    const id = crypto.randomUUID();
    dispatch({ type: 'add', id, position, source, restMin: defaultRestMin });
    const number =
      checkpointState.checkpoints.filter((cp) => cp.kind === 'control' && cp.distanceKm < position.distanceKm).length +
      1;
    setAnnouncement(
      t('checkpoints.added', {
        control: t('checkpoints.cp', { number }),
        km: format.km(position.distanceKm),
      }),
    );
    return true;
  };

  /**
   * Moves an intermediate control along the track (drag and drop, km input). Returns an error message if it can't be
   * placed there: outside the track or within 100 m of another checkpoint.
   */
  const moveCheckpoint = (id: string, distanceKm: number): string | null => {
    const row = rows.find((r) => r.checkpoint.id === id);
    if (!row || row.checkpoint.kind !== 'control') return null;
    const position = positionAtDistance(track, distanceKm);
    const conflict = moveConflict(checkpointState.checkpoints, id, position.distanceKm);
    if (conflict) {
      const blocking = rows.find((r) => r.checkpoint.id === conflict.id)!;
      const message = t('checkpoints.moveTooClose', {
        control: controlLabel(blocking),
      });
      setAnnouncement(message);
      return message;
    }
    dispatch({ type: 'move', id, position });
    const number =
      checkpointState.checkpoints.filter(
        (cp) => cp.kind === 'control' && cp.id !== id && cp.distanceKm < position.distanceKm,
      ).length + 1;
    setAnnouncement(
      t('checkpoints.moved', {
        from: controlLabel(row),
        control: t('checkpoints.cp', { number }),
        km: format.km(position.distanceKm),
      }),
    );
    return null;
  };
  const onCheckpointDrop = (id: string, distanceKm: number) => moveCheckpoint(id, distanceKm) === null;

  const mapCheckpoints = rows.flatMap((row) =>
    row.number === null
      ? []
      : [
          {
            id: row.checkpoint.id,
            number: row.number,
            label: `${controlLabel(row)} · ${format.km(row.checkpoint.distanceKm)}`,
            lat: row.checkpoint.lat,
            lon: row.checkpoint.lon,
            tag: String(row.number),
            distanceKm: row.checkpoint.distanceKm,
          },
        ],
  );

  return (
    <>
      <main className="planner">
        {/* left column: the plan – scrolls on its own while the map stays in place */}
        {isPhone ? (
          <div className="planner-sidebar" data-testid="planner-sidebar">
            <section className="px-3 py-3" aria-labelledby="track-name">
              <h1 id="track-name" className="h5 mb-0 text-break" tabIndex={-1}>
                {plan.name}
              </h1>
              <p className="small text-body-secondary mb-3" data-testid="phone-summary">
                {t('timetable.cards.summary', {
                  distance: format.km(track.distanceKm),
                  climb: format.m(track.climbM),
                  start: clock.format(0),
                })}
              </p>
              <TimetableCards timetable={timetable} times={clock} tightBufferMin={tightBufferMin} />
            </section>
          </div>
        ) : (
          <div className="planner-sidebar" data-testid="planner-sidebar">
            <TrackSummary
              track={track}
              name={plan.name}
              onRename={(name) => onChange({ type: 'rename', name })}
              start={start}
              finish={clock.format(timetable.totals.finishMin)}
            />
            <PlanSettingsBar
              start={start}
              onStartChange={(next) => onChange({ type: 'setStart', start: next })}
              timeZone={timeZone}
              onTimeZoneChange={(zone) => onChange({ type: 'setTimeZone', timeZone: zone })}
              times={times}
              onTimeDisplayChange={setTimeDisplay}
              tightBufferMin={tightBufferMin}
              onTightBufferChange={(minutes) => onChange({ type: 'setTightBuffer', minutes })}
              estimator={estimator}
              params={timeModel.params}
              onModelChange={(id) =>
                onChange({
                  type: 'setTimeModel',
                  timeModel: {
                    id,
                    params: resolveParams(
                      estimators.get(id),
                      id === config.planning.timeModel.id ? config.planning.timeModel.params : {},
                    ),
                  },
                })
              }
              onParamChange={(key, value) => onChange({ type: 'setTimeModelParam', key, value })}
              brevet={<BrevetSettings trackKm={track.distanceKm} state={checkpointState} rules={rules} dispatch={dispatch} />}
            />
            <CheckpointPanel
              track={track}
              state={checkpointState}
              rules={rules}
              dispatch={dispatch}
              onAdd={(km) => addCheckpoint(km, 'km')}
              onMove={moveCheckpoint}
              timetable={timetable}
              estimator={estimator}
              planParams={timeModel.params}
              defaultRestMin={defaultRestMin}
              activeSegment={highlighted ? highlighted.index : null}
              onActiveSegmentChange={setActiveSegment}
              times={times}
              tightBufferMin={tightBufferMin}
              formatClock={clock.format}
            />
          </div>
        )}
        {/* right: map and elevation profile, fixed */}
        <section className="planner-map" aria-label={t('map.sectionLabel')}>
          <TrackMap
            track={track}
            highlight={activeIndex !== null ? track.points[activeIndex] : null}
            checkpoints={mapCheckpoints}
            onTrackClick={
              isPhone ? undefined : (lat, lon) => addCheckpoint(snapToTrack(track, lat, lon).distanceKm, 'map')
            }
            positionInfo={(distanceKm, touch) => {
              const at = timesAt(track, trackTimes, distanceKm);
              // climb so far – same track points (and hysteresis) as the segments and the track summary
              const climbM =
                track.minEleM === null ? null : track.points[nearestPointIndex(track.points, distanceKm)].ascentM;
              return (
                <PositionInfo
                  info={{ distanceKm, climbM, ...at }}
                  times={isPhone ? clock : times}
                  hint={!touch && !isPhone ? t('map.addCheckpoint') : undefined}
                />
              );
            }}
            onTrackHover={(km) => setActiveIndex(km === null ? null : nearestPointIndex(track.points, km))}
            onCheckpointClick={(id) => document.getElementById(`cp-${id}-name`)?.focus()}
            onCheckpointMove={isPhone ? undefined : onCheckpointDrop}
            onCheckpointDrag={(drag) => {
              setMapDrag(drag);
              setActiveIndex(drag ? nearestPointIndex(track.points, drag.distanceKm) : null);
            }}
            highlightPath={highlightPath}
            overlayLines={isPhone ? null : overlayResult?.lines}
          >
            {!isPhone && (
              <RouteOverlayPanel
                overlay={overlay}
                onChange={setOverlayId}
                distanceByClass={overlayResult?.distances ?? null}
                noteValues={{ zone: timeZone.replaceAll('_', ' ') }}
              />
            )}
          </TrackMap>
          <div className="planner-profile border-top bg-white">
            <ElevationProfile
              track={track}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
              checkpoints={mapCheckpoints}
              onPick={isPhone ? undefined : (km) => addCheckpoint(km, 'profile')}
              onCheckpointMove={isPhone ? undefined : onCheckpointDrop}
              dragPreview={mapDrag}
              highlightRange={highlighted}
              footer={
                <SegmentStrip
                  segments={segmentViews}
                  totalKm={track.distanceKm}
                  activeIndex={highlighted ? highlighted.index : null}
                  onActiveIndexChange={setActiveSegment}
                />
              }
            />
          </div>
        </section>
      </main>
      <div className="visually-hidden" role="status" aria-live="polite" data-testid="announcement">
        {announcement}
      </div>
    </>
  );
}
