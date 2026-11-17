import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '../app/AppServices';
import { acpControlRules } from '../domain/controls/acp';
import { PlanFileError, planFileId, planStateFromFile, PLAN_FILE_SUFFIX, toPlanFile } from '../domain/planFile';
import { newPlanState, type PlanAction, type PlanDefaults } from '../domain/planState';
import { localDate } from '../domain/time/clock';
import { browserTimeZone } from '../domain/time/timeZone';
import { resolveParams } from '../domain/time/TimeEstimator';
import { GpxError, parseGpx } from '../domain/track/gpx';
import type { Track } from '../domain/track/track';
import { downloadFile } from '../storage/downloadFile';
import { PlanStorageError } from '../storage/PlanRepository';
import { AppHeader } from './AppHeader';
import { DownloadIcon } from './icons';
import { DownloadDialog, UnsavedChangesDialog } from './plans/PlanDialogs';
import { PlanMenu } from './plans/PlanMenu';
import { usePlanListing } from './plans/usePlanListing';
import { sameRoute, START_ROUTE, usePlanRoute, type PlanRoute } from './plans/usePlanRoute';
import { usePlanSession } from './plans/usePlanSession';
import { PlannerView } from './planner/PlannerView';
import { StartScreen } from './start/StartScreen';
import { useGpxImport, type GpxSource } from './track/useGpxImport';

/** Control rules used for the windows – selectable per plan once other rules exist */
const rules = acpControlRules;

/** Where the user wants to go – may have to wait for the unsaved-changes dialog */
type Target =
  | { kind: 'route'; route: PlanRoute }
  | { kind: 'upload'; track: Track; source: GpxSource }
  | { kind: 'track'; file: string };

const baseName = (file: string) => file.replace(/\.gpx$/i, '');

/**
 * Application shell (US5): start screen or the open plan, the plan menu in the header, the URL of the plan and the
 * question about unsaved changes before leaving a plan.
 */
export function App() {
  const { t } = useTranslation();
  const { config, estimators, planRepository } = useAppServices();
  const { session, dispatch, dirty } = usePlanSession();
  const { listing, error: listingError, reload } = usePlanListing();
  const [pending, setPending] = useState<Target | null>(null);
  const [downloaded, setDownloaded] = useState<{ planFile: string; trackFile: string; trackMissing: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const sessionRoute: PlanRoute | null = session
    ? session.plan.id
      ? { plan: session.plan.id, isNew: false }
      : { plan: null, isNew: true }
    : null;

  // back/forward: ask first when leaving a plan with unsaved changes
  const onPop = useCallback(
    (next: PlanRoute) => {
      if (dirty && sessionRoute && !sameRoute(next, sessionRoute)) {
        setPending({ kind: 'route', route: next });
        return false;
      }
      return true;
    },
    [dirty, sessionRoute],
  );
  const { route, navigate } = usePlanRoute(onPop);

  const defaultsFor = useCallback(
    (track: Track): PlanDefaults => {
      const { id, params } = config.planning.timeModel;
      return {
        start: { date: localDate(), time: config.planning.defaultStartTime },
        timeZone: browserTimeZone(),
        tightBufferMin: config.planning.tightBufferMinutes,
        timeModel: { id, params: resolveParams(estimators.get(id), params) },
        brevetKm: rules.inferBrevetKm(track.distanceKm),
      };
    },
    [config, estimators],
  );

  const errorText = useCallback(
    (error: unknown, what: string) => {
      if (error instanceof PlanStorageError && error.code === 'notFound') return t('plans.errors.notFound', { name: what });
      if (error instanceof PlanFileError) return t('plans.errors.invalid', { name: what, reason: error.message });
      if (error instanceof GpxError) return t('plans.errors.track', { name: what, reason: t(`upload.errors.${error.code}`) });
      return t('plans.errors.unavailable', { name: what });
    },
    [t],
  );

  /** Opens a saved plan from the repository */
  const loadPlan = useCallback(
    async (id: string) => {
      setLoadingId(id);
      try {
        const stored = await planRepository.load(id);
        const track = parseGpx(stored.gpx, baseName(stored.plan.track));
        const plan = planStateFromFile(stored.plan, track, id, estimators);
        dispatch({ type: 'open', plan, gpx: stored.gpx, trackInRepo: true, saved: true });
      } catch (error) {
        // an unknown plan (e.g. an old link) is explained on the start screen – not an error of the app
        if (!(error instanceof PlanStorageError && error.code === 'notFound')) console.error(error);
        setMessage(errorText(error, id));
        navigate(START_ROUTE, { replace: true });
      } finally {
        setLoadingId(null);
      }
    },
    [planRepository, estimators, dispatch, errorText, navigate],
  );

  // keep the open plan in line with the URL (initial load, links, back/forward)
  useEffect(() => {
    if (route.plan) {
      if (session?.plan.id !== route.plan && loadingId !== route.plan) void loadPlan(route.plan);
    } else if (route.isNew) {
      // a new plan can't be restored after a reload
      if (!session || session.plan.id !== null) navigate(START_ROUTE, { replace: true });
    } else if (session) {
      dispatch({ type: 'close' });
    }
    // only on route changes: session and loading state are read, not reacted to
  }, [route]);

  // back on the start screen: the folder may have changed (dev server)
  const onStart = session === null;
  useEffect(() => {
    if (onStart) void reload();
  }, [onStart, reload]);

  // focus the heading of the new screen (screen readers, keyboard)
  const screenKey = session ? (session.plan.id ?? `new-${session.plan.createdAt}`) : 'start';
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    requestAnimationFrame(() => document.getElementById(session ? 'track-name' : 'start-heading')?.focus());
  }, [screenKey]);

  // reloading or closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const listener = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty]);

  const go = async (target: Target) => {
    setMessage(null);
    switch (target.kind) {
      case 'route':
        navigate(target.route);
        break;
      case 'upload':
        dispatch({
          type: 'open',
          plan: newPlanState(target.track, target.source.fileName, defaultsFor(target.track)),
          gpx: target.source.text,
          trackInRepo: false,
          saved: false,
        });
        navigate({ plan: null, isNew: true });
        break;
      case 'track':
        try {
          const gpx = await planRepository.loadTrack(target.file);
          const track = parseGpx(gpx, baseName(target.file));
          dispatch({ type: 'open', plan: newPlanState(track, target.file, defaultsFor(track)), gpx, trackInRepo: true, saved: false });
          navigate({ plan: null, isNew: true });
        } catch (error) {
          console.error(error);
          setMessage(errorText(error, target.file));
        }
        break;
    }
  };
  /** Leaves the current plan – after asking if it has unsaved changes */
  const request = (target: Target) => (dirty ? setPending(target) : void go(target));

  const { importFile, error: uploadError, busy } = useGpxImport((track, source) => request({ kind: 'upload', track, source }));

  const downloadPlan = () => {
    if (!session) return;
    const id = session.plan.id ?? planFileId(baseName(session.plan.trackFile));
    const planFile = `${id}${PLAN_FILE_SUFFIX}`;
    downloadFile(planFile, `${JSON.stringify(toPlanFile(session.plan), null, 2)}\n`, 'application/json');
    dispatch({ type: 'saved' });
    setDownloaded({ planFile, trackFile: session.plan.trackFile, trackMissing: !session.trackInRepo });
  };

  const onPlanChange = useCallback((action: PlanAction) => dispatch({ type: 'plan', action }), [dispatch]);

  return (
    <div className={`app-shell${session ? ' has-track' : ''}`}>
      <AppHeader onHome={() => request({ kind: 'route', route: START_ROUTE })}>
        {session && (
          <>
            <PlanMenu
              name={session.plan.name}
              currentId={session.plan.id}
              listing={listing}
              onOpenPlan={(id) => request({ kind: 'route', route: { plan: id, isNew: false } })}
              onNewPlan={(file) => void importFile(file)}
              onAllPlans={() => request({ kind: 'route', route: START_ROUTE })}
            />
            {dirty && (
              <Badge bg="warning" text="dark" className="unsaved-badge" data-testid="unsaved">
                {t('plans.notSaved')}
              </Badge>
            )}
            <Button
              variant="outline-primary"
              className="d-inline-flex align-items-center gap-2"
              onClick={downloadPlan}
              aria-label={t('plans.download')}
            >
              <DownloadIcon />
              <span className="d-none d-md-inline">{t('plans.download')}</span>
            </Button>
          </>
        )}
      </AppHeader>
      {session ? (
        <PlannerView key={screenKey} plan={session.plan} onChange={onPlanChange} />
      ) : loadingId ? (
        <main className="flex-grow-1 d-flex align-items-center justify-content-center gap-2 text-body-secondary" role="status">
          <Spinner as="span" size="sm" animation="border" aria-hidden="true" />
          {t('plans.loading')}
        </main>
      ) : (
        <StartScreen
          listing={listing}
          listingError={listingError}
          onRetry={() => void reload()}
          onUpload={(file) => void importFile(file)}
          uploadBusy={busy}
          uploadError={uploadError && t(`upload.errors.${uploadError}`)}
          onOpenPlan={(id) => request({ kind: 'route', route: { plan: id, isNew: false } })}
          onOpenTrack={(file) => request({ kind: 'track', file })}
          message={message}
          onDismissMessage={() => setMessage(null)}
        />
      )}
      <UnsavedChangesDialog
        show={pending !== null}
        name={session?.plan.name ?? ''}
        onCancel={() => setPending(null)}
        onDiscard={() => {
          const target = pending!;
          setPending(null);
          void go(target);
        }}
        onDownload={() => {
          const target = pending!;
          setPending(null);
          downloadPlan();
          void go(target);
        }}
      />
      <DownloadDialog
        show={downloaded !== null}
        planFile={downloaded?.planFile ?? ''}
        trackFile={downloaded?.trackFile ?? ''}
        trackMissing={downloaded?.trackMissing ?? false}
        onDownloadTrack={() => session && downloadFile(session.plan.trackFile, session.gpx, 'application/gpx+xml')}
        onClose={() => setDownloaded(null)}
      />
    </div>
  );
}
