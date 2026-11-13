import { useCallback, useState } from 'react';
import { Alert, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { Track } from '../domain/track/track';
import { AppHeader } from './AppHeader';
import { ElevationProfile } from './track/ElevationProfile';
import { GpxDropZone } from './track/GpxDropZone';
import { TrackMap } from './track/TrackMap';
import { TrackSummary } from './track/TrackSummary';
import { useGpxImport } from './track/useGpxImport';

export function App() {
  const { t } = useTranslation();
  const [track, setTrack] = useState<Track | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onTrack = useCallback((next: Track) => {
    setTrack(next);
    setActiveIndex(null);
  }, []);
  const { importFile, error, clearError, busy } = useGpxImport(onTrack);

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
          <section className="card overflow-hidden" aria-label={t('map.sectionLabel')}>
            <TrackMap track={track} highlight={activeIndex !== null ? track.points[activeIndex] : null} />
            <div className="border-top">
              <ElevationProfile track={track} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} />
            </div>
          </section>
        ) : (
          <GpxDropZone onFile={(file) => void importFile(file)} busy={busy} />
        )}
      </Container>
    </div>
  );
}
