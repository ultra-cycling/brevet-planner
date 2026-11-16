import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { PlanEntry, PlanListing, TrackEntry } from '../../storage/PlanRepository';
import { useFormat } from '../../i18n/useFormat';
import { GpxDropZone } from '../track/GpxDropZone';

export interface StartScreenProps {
  listing: PlanListing | null;
  listingError: boolean;
  onRetry: () => void;
  onUpload: (file: File) => void;
  uploadBusy: boolean;
  uploadError: string | null;
  onOpenPlan: (id: string) => void;
  onOpenTrack: (file: string) => void;
  /** e.g. why a plan from the URL couldn't be opened */
  message: string | null;
  onDismissMessage: () => void;
}

/** Plans with a start date first (earliest first), then by name */
function byStart(a: PlanEntry, b: PlanEntry): number {
  const ka = a.start ? `${a.start.date}T${a.start.time}` : '~';
  const kb = b.start ? `${b.start.date}T${b.start.time}` : '~';
  return ka.localeCompare(kb) || a.name.localeCompare(b.name);
}

/**
 * Start screen (US5): a new plan from a GPX file next to the saved plans of the plans folder and the tracks there
 * that have no plan yet.
 */
export function StartScreen(props: StartScreenProps) {
  const { listing, listingError, onRetry, onUpload, uploadBusy, uploadError, message, onDismissMessage } = props;
  const { t } = useTranslation();

  return (
    <Container as="main" fluid className="start-screen flex-grow-1 py-4 px-3 px-sm-4">
      <h1 id="start-heading" className="h3 mb-3" tabIndex={-1}>
        {t('start.title')}
      </h1>
      {message && (
        <Alert variant="warning" dismissible onClose={onDismissMessage} data-testid="start-message">
          {message}
        </Alert>
      )}
      <Row className="g-4">
        <Col lg={5} as="section" aria-labelledby="new-plan-heading" className="d-flex flex-column gap-3">
          {uploadError && (
            <Alert variant="danger" className="mb-0">
              {uploadError}
            </Alert>
          )}
          <GpxDropZone onFile={onUpload} busy={uploadBusy} />
        </Col>
        <Col lg={7} as="section" aria-labelledby="saved-plans-heading">
          <h2 id="saved-plans-heading" className="h4">
            {t('start.savedPlans')}
          </h2>
          {listingError ? (
            <Alert variant="danger" className="d-flex align-items-center gap-3">
              <span className="me-auto">{t('start.listError')}</span>
              <Button size="sm" variant="outline-danger" onClick={onRetry}>
                {t('start.retry')}
              </Button>
            </Alert>
          ) : listing === null ? (
            <p className="text-body-secondary d-flex align-items-center gap-2" role="status">
              <Spinner size="sm" animation="border" aria-hidden="true" />
              {t('start.loading')}
            </p>
          ) : (
            <PlanListView {...props} listing={listing} />
          )}
        </Col>
      </Row>
    </Container>
  );
}

function PlanListView({ listing, onOpenPlan, onOpenTrack }: StartScreenProps & { listing: PlanListing }) {
  const { t } = useTranslation();
  if (listing.plans.length === 0 && listing.tracks.length === 0) {
    return (
      <div className="text-body-secondary" data-testid="plans-empty">
        <p className="mb-2">{t('start.empty')}</p>
        <p className="small mb-0">{t('start.howTo')}</p>
      </div>
    );
  }
  return (
    <>
      {listing.plans.length > 0 ? (
        <ul className="list-unstyled d-flex flex-column gap-2 mb-0" aria-labelledby="saved-plans-heading">
          {[...listing.plans].sort(byStart).map((plan) => (
            <li key={plan.id}>
              <PlanCard plan={plan} onOpen={onOpenPlan} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-secondary">{t('start.noPlans')}</p>
      )}
      {listing.tracks.length > 0 && (
        <section aria-labelledby="tracks-heading" className="mt-4">
          <h3 id="tracks-heading" className="h6 text-body-secondary">
            {t('start.tracksWithoutPlan')}
          </h3>
          <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            {listing.tracks.map((track) => (
              <li key={track.file}>
                <TrackRow track={track} onOpen={onOpenTrack} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="small text-body-secondary mt-4 mb-0">{t('start.howTo')}</p>
    </>
  );
}

function PlanCard({ plan, onOpen }: { plan: PlanEntry; onOpen: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const format = useFormat();
  if (plan.error) {
    return (
      <div className="plan-card is-broken" data-testid="plan-card">
        <div className="fw-semibold">{plan.file}</div>
        <div className="small text-danger" data-testid="plan-error">
          {plan.error}
        </div>
      </div>
    );
  }
  const date = plan.start
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        timeZone: 'UTC',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(`${plan.start.date}T00:00:00Z`))
    : null;
  const facts = [
    plan.summary && format.km(plan.summary.distanceKm),
    plan.summary && `↑${format.m(plan.summary.climbM)}`,
    plan.summary && t('start.checkpoints', { count: plan.summary.checkpoints }),
    plan.brevetKm ? t('start.brevet', { km: plan.brevetKm }) : null,
  ].filter(Boolean);
  return (
    <a
      href={`?plan=${encodeURIComponent(plan.id)}`}
      className="plan-card"
      data-testid="plan-card"
      onClick={(e) => {
        e.preventDefault();
        onOpen(plan.id);
      }}
    >
      <span className="d-flex flex-wrap align-items-baseline gap-2">
        <span className="fw-semibold me-auto">{plan.name}</span>
        {date && (
          <span className="small text-body-secondary tabular-nums">
            {date} · {plan.start!.time}
          </span>
        )}
      </span>
      <span className="d-block small text-body-secondary tabular-nums">{facts.join(' · ')}</span>
    </a>
  );
}

function TrackRow({ track, onOpen }: { track: TrackEntry; onOpen: (file: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="plan-card d-flex align-items-center gap-3" data-testid="track-without-plan">
      <span className="me-auto min-w-0">
        <span className="d-block fw-semibold text-truncate">{track.name}</span>
        <span className="d-block small text-body-secondary text-truncate">{track.file}</span>
      </span>
      <Button size="sm" variant="outline-primary" onClick={() => onOpen(track.file)}>
        {t('start.startPlan')}
      </Button>
    </div>
  );
}
