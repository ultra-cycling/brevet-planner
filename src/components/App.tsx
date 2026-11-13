import { useCallback, useMemo, useReducer, useState } from 'react';
import { Alert, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  checkpointReducer,
  controlRows,
  emptyCheckpointState,
  findCheckpointNear,
  type CheckpointSource,
} from '../domain/checkpoints';
import { acpControlRules } from '../domain/controls/acp';
import { buildSegments } from '../domain/segments';
import { resolveParams, type EstimatorParams } from '../domain/time/TimeEstimator';
import { buildTimetable } from '../domain/timetable';
import { positionAtDistance, snapToTrack, trackSlice } from '../domain/track/snap';
import type { Track } from '../domain/track/track';
import { useFormat } from '../i18n/useFormat';
import { AppHeader } from './AppHeader';
import { CheckpointPanel } from './checkpoints/CheckpointPanel';
import { useControlLabel } from './checkpoints/useControlLabel';
import { useAppServices } from '../app/AppServices';
import { SegmentStrip, type SegmentView } from './segments/SegmentStrip';
import { PlanSettingsBar } from './timetable/PlanSettingsBar';
import { ElevationProfile } from './track/ElevationProfile';
import { GpxDropZone } from './track/GpxDropZone';
import { TrackMap } from './track/TrackMap';
import { TrackSummary } from './track/TrackSummary';
import { useGpxImport } from './track/useGpxImport';

/** Control rules used for the windows – selectable per plan once other rules exist */
const rules = acpControlRules;

export function App() {
  const { t } = useTranslation();
  const format = useFormat();
  const controlLabel = useControlLabel();
  const [track, setTrack] = useState<Track | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [checkpointState, dispatch] = useReducer(checkpointReducer, emptyCheckpointState);
  const [announcement, setAnnouncement] = useState('');
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const { config, estimators } = useAppServices();
  // plan-wide time model (defaults from config.yaml) – persisted with the plan in US5
  const [timeModel, setTimeModel] = useState(() => {
    const { id, params } = config.planning.timeModel;
    return { id, params: resolveParams(estimators.get(id), params) };
  });
  const estimator = estimators.get(timeModel.id);
  const defaultRestMin = config.planning.defaultRestMinutes;

  const onTrack = useCallback((next: Track) => {
    setTrack(next);
    setActiveIndex(null);
    dispatch({ type: 'reset', track: next, brevetKm: rules.inferBrevetKm(next.distanceKm) });
    setActiveSegment(null);
    setAnnouncement('');
  }, []);
  const { importFile, error, clearError, busy } = useGpxImport(onTrack);

  const rows = useMemo(() => controlRows(checkpointState, rules), [checkpointState]);
  const segments = useMemo(
    () => (track ? buildSegments(track, checkpointState.checkpoints) : []),
    [track, checkpointState.checkpoints],
  );
  const timetable = useMemo(
    () => buildTimetable(rows, segments, estimator, timeModel.params),
    [rows, segments, estimator, timeModel.params],
  );
  const segmentViews: SegmentView[] = useMemo(() => {
    const shortName = (id: string) => {
      const row = rows.find((r) => r.checkpoint.id === id)!;
      return row.number === null ? t(`checkpoints.${row.checkpoint.kind}`) : t('checkpoints.cp', { number: row.number });
    };
    return segments.map((segment) => ({
      segment,
      name: `${shortName(segment.from.id)} → ${shortName(segment.to.id)}`,
      rideMin: timetable.rows[segment.index + 1].rideMin ?? 0,
    }));
  }, [segments, rows, timetable, t]);
  // a removed checkpoint may leave the highlight pointing past the last segment
  const highlighted = activeSegment !== null ? (segments[activeSegment] ?? null) : null;
  const highlightPath = useMemo(
    () => (track && highlighted ? trackSlice(track, highlighted.startKm, highlighted.endKm) : null),
    [track, highlighted],
  );

  /** Adds an intermediate control at a distance along the track; false if one is already there */
  const addCheckpoint = (distanceKm: number, source: CheckpointSource): boolean => {
    if (!track) return false;
    const position = positionAtDistance(track, distanceKm);
    if (findCheckpointNear(checkpointState.checkpoints, position.distanceKm)) {
      setAnnouncement(t('checkpoints.duplicate'));
      return false;
    }
    const id = crypto.randomUUID();
    dispatch({ type: 'add', id, position, source, restMin: defaultRestMin });
    const number = checkpointState.checkpoints.filter((cp) => cp.kind === 'control' && cp.distanceKm < position.distanceKm).length + 1;
    setAnnouncement(t('checkpoints.added', { control: t('checkpoints.cp', { number }), km: format.km(position.distanceKm) }));
    return true;
  };

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

  const errorAlert = error && (
    <Alert variant="danger" dismissible onClose={clearError} className="mb-0">
      {t(`upload.errors.${error}`)}
    </Alert>
  );

  return (
    <div className={`app-shell${track ? ' has-track' : ''}`}>
      <AppHeader onGpxFile={(file) => void importFile(file)} busy={busy} />
      {track ? (
        <main className="planner">
          {/* left column: the plan – scrolls on its own while the map stays in place */}
          <div className="planner-sidebar" data-testid="planner-sidebar">
            {errorAlert && <div className="px-3 pt-3">{errorAlert}</div>}
            <TrackSummary track={track} />
            <PlanSettingsBar
              estimator={estimator}
              params={timeModel.params}
              onModelChange={(id) =>
                setTimeModel({
                  id,
                  params: resolveParams(
                    estimators.get(id),
                    id === config.planning.timeModel.id ? config.planning.timeModel.params : {},
                  ),
                })
              }
              onParamChange={(key, value) =>
                setTimeModel((current) => ({ ...current, params: { ...current.params, [key]: value } as EstimatorParams }))
              }
              totals={timetable.totals}
              tightestLabel={timetable.totals.tightest ? controlLabel(timetable.totals.tightest.control) : null}
            />
            <CheckpointPanel
              track={track}
              state={checkpointState}
              rules={rules}
              dispatch={dispatch}
              onAdd={(km) => addCheckpoint(km, 'km')}
              timetable={timetable}
              estimator={estimator}
              planParams={timeModel.params}
              defaultRestMin={defaultRestMin}
              activeSegment={highlighted ? highlighted.index : null}
              onActiveSegmentChange={setActiveSegment}
            />
          </div>
          {/* right: map and elevation profile, fixed */}
          <section className="planner-map" aria-label={t('map.sectionLabel')}>
            <TrackMap
              track={track}
              highlight={activeIndex !== null ? track.points[activeIndex] : null}
              checkpoints={mapCheckpoints}
              onTrackClick={(lat, lon) => addCheckpoint(snapToTrack(track, lat, lon).distanceKm, 'map')}
              onCheckpointClick={(id) => document.getElementById(`cp-${id}-name`)?.focus()}
              highlightPath={highlightPath}
            />
            <div className="border-top bg-white">
              <ElevationProfile
                track={track}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
                checkpoints={mapCheckpoints}
                onPick={(km) => addCheckpoint(km, 'profile')}
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
      ) : (
        <Container as="main" fluid className="flex-grow-1 py-3 px-4 d-flex flex-column gap-3">
          {errorAlert}
          <GpxDropZone onFile={(file) => void importFile(file)} busy={busy} />
        </Container>
      )}
      <div className="visually-hidden" role="status" aria-live="polite" data-testid="announcement">
        {announcement}
      </div>
    </div>
  );
}
