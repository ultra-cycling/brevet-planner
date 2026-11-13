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
import { positionAtDistance, snapToTrack, trackSlice } from '../domain/track/snap';
import type { Track } from '../domain/track/track';
import { useFormat } from '../i18n/useFormat';
import { AppHeader } from './AppHeader';
import { CheckpointPanel } from './checkpoints/CheckpointPanel';
import { useControlLabel } from './checkpoints/useControlLabel';
import { SegmentStrip, type SegmentView } from './segments/SegmentStrip';
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
  const segmentViews: SegmentView[] = useMemo(() => {
    const shortName = (id: string) => {
      const row = rows.find((r) => r.checkpoint.id === id)!;
      return row.number === null ? t(`checkpoints.${row.checkpoint.kind}`) : t('checkpoints.cp', { number: row.number });
    };
    return segments.map((segment) => ({ segment, name: `${shortName(segment.from.id)} → ${shortName(segment.to.id)}` }));
  }, [segments, rows, t]);
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
    dispatch({ type: 'add', id, position, source });
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

  return (
    <div className="d-flex flex-column min-vh-100">
      <AppHeader onGpxFile={(file) => void importFile(file)} busy={busy} />
      {track && <TrackSummary track={track} />}
      <Container as="main" fluid className="flex-grow-1 py-3 px-4 d-flex flex-column gap-3">
        {error && (
          <Alert variant="danger" dismissible onClose={clearError} className="mb-0">
            {t(`upload.errors.${error}`)}
          </Alert>
        )}
        {track ? (
          <>
            <section className="card overflow-hidden" aria-label={t('map.sectionLabel')}>
              <TrackMap
                track={track}
                highlight={activeIndex !== null ? track.points[activeIndex] : null}
                checkpoints={mapCheckpoints}
                onTrackClick={(lat, lon) => addCheckpoint(snapToTrack(track, lat, lon).distanceKm, 'map')}
                onCheckpointClick={(id) => document.getElementById(`cp-${id}-name`)?.focus()}
                highlightPath={highlightPath}
              />
              <div className="border-top">
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
            <CheckpointPanel
              track={track}
              state={checkpointState}
              rows={rows}
              rules={rules}
              dispatch={dispatch}
              onAdd={(km) => addCheckpoint(km, 'km')}
              segments={segments}
              activeSegment={highlighted ? highlighted.index : null}
              onActiveSegmentChange={setActiveSegment}
            />
          </>
        ) : (
          <GpxDropZone onFile={(file) => void importFile(file)} busy={busy} />
        )}
        <div className="visually-hidden" role="status" aria-live="polite" data-testid="announcement">
          {announcement}
        </div>
      </Container>
    </div>
  );
}
